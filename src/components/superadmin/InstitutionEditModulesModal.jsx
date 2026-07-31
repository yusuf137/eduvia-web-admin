import { useEffect, useMemo, useState } from 'react';
import { normalizeModules } from '../../constants/institutionModules';
import { usePackages } from '../../contexts/PackageCatalogContext';
import { updateInstitutionPlanAndModules } from '../../services/institutionService';
import {
  getSelectablePackagesForInstitutionCreate,
  isCustomModuleOverrideForPackage,
  resolvePackageForInstitution,
} from '../../utils/packageResolver';
import InstitutionModulesEditor from '../InstitutionModulesEditor';
import PackageSelector from '../PackageSelector';

/**
 * @param {{
 *   institution: {
 *     id: string,
 *     name: string,
 *     plan?: string | null,
 *     planName?: string | null,
 *     packageId?: string | null,
 *     modules?: Record<string, boolean>,
 *   } | null,
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved: () => void,
 * }} props
 */
export default function InstitutionEditModulesModal({ institution, open, onClose, onSaved }) {
  const { packages, loading: packagesLoading } = usePackages();
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [modules, setModules] = useState(normalizeModules(null));
  const [modulesCustomized, setModulesCustomized] = useState(false);
  const [pendingPackageId, setPendingPackageId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const selectablePackages = useMemo(() => {
    const active = getSelectablePackagesForInstitutionCreate(packages);
    const current = institution ? resolvePackageForInstitution(institution, packages) : null;
    if (current && !active.some((pkg) => pkg.id === current.id)) {
      return [current, ...active];
    }
    return active.length ? active : packages.filter((row) => !row.archived);
  }, [institution, packages]);

  const selectedPackage = useMemo(
    () => selectablePackages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [selectablePackages, selectedPackageId],
  );

  useEffect(() => {
    if (open && institution) {
      const resolved = resolvePackageForInstitution(institution, packages);
      setSelectedPackageId(resolved.id);
      setModules(normalizeModules(institution.modules ?? resolved.modules));
      setModulesCustomized(isCustomModuleOverrideForPackage(resolved, institution.modules));
      setPendingPackageId(null);
      setError('');
    }
  }, [open, institution, packages]);

  const hasModuleOverride = useMemo(
    () =>
      modulesCustomized
      || (selectedPackage ? isCustomModuleOverrideForPackage(selectedPackage, modules) : false),
    [modulesCustomized, selectedPackage, modules],
  );

  if (!open || !institution) {
    return null;
  }

  const applyPackage = (pkg) => {
    setSelectedPackageId(pkg.id);
    setModules({ ...pkg.modules });
    setModulesCustomized(false);
    setPendingPackageId(null);
  };

  const onPackageSelect = (pkg) => {
    if (pkg.id === selectedPackageId) {
      return;
    }
    setPendingPackageId(pkg.id);
  };

  const onModulesChange = (next) => {
    setModules(next);
    setModulesCustomized(
      selectedPackage ? isCustomModuleOverrideForPackage(selectedPackage, next) : true,
    );
  };

  const onSave = async () => {
    if (!selectedPackage) {
      setError('Lütfen bir paket seçin.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await updateInstitutionPlanAndModules(institution.id, {
        packageId: selectedPackage.id,
        plan: selectedPackage.slug,
        planName: selectedPackage.name,
        modules,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message ?? 'Kurum ayarları kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const pendingPackage = pendingPackageId
    ? selectablePackages.find((pkg) => pkg.id === pendingPackageId) ?? null
    : null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card institution-modules-modal institution-edit-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}>
        <h3>Kurum paketi ve özellikleri</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          <strong>{institution.name}</strong>
        </p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        {packagesLoading ? (
          <p className="muted">Paketler yükleniyor…</p>
        ) : (
          <PackageSelector
            packages={selectablePackages}
            selectedPackageId={selectedPackageId}
            onSelect={onPackageSelect}
            disabled={saving}
          />
        )}

        <div className="alert alert--info package-info-banner">
          Seçilen pakete göre modüller otomatik ayarlanır. İsterseniz aşağıdan ek özellikleri manuel
          olarak değiştirebilirsiniz.
        </div>

        {hasModuleOverride ? (
          <div className="alert alert--warn package-info-banner">
            Bu kurumda paket dışında özel modül ayarı bulunuyor.
          </div>
        ) : null}

        <InstitutionModulesEditor
          modules={modules}
          onChange={onModulesChange}
          disabled={saving}
          legend="Ek Özellikler / Modül Ayarları"
        />

        {pendingPackage ? (
          <div className="plan-change-confirm" role="alertdialog" aria-labelledby="plan-change-title">
            <h4 id="plan-change-title">Paket değişikliği</h4>
            <p>
              Paket <strong>{pendingPackage.name}</strong> olarak değiştirilecek ve modül ayarları
              buna göre yeniden düzenlenecek. Devam etmek istiyor musunuz?
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPendingPackageId(null)}
                disabled={saving}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => applyPackage(pendingPackage)}
                disabled={saving}>
                Paketi Uygula
              </button>
            </div>
          </div>
        ) : null}

        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
            Vazgeç
          </button>
          <button type="button" className="btn btn--primary" onClick={() => void onSave()} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}
