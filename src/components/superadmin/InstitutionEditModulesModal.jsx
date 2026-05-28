import { useEffect, useMemo, useState } from 'react';
import { normalizeModules } from '../../constants/institutionModules';
import {
  applyPresetModules,
  getPackagePreset,
  isCustomModuleOverride,
  resolveInstitutionPlan,
} from '../../config/packagePresets';
import { updateInstitutionPlanAndModules } from '../../services/institutionService';
import InstitutionModulesEditor from '../InstitutionModulesEditor';
import PackageSelector from '../PackageSelector';

/**
 * @param {{
 *   institution: {
 *     id: string,
 *     name: string,
 *     plan?: string | null,
 *     planName?: string | null,
 *     modules?: Record<string, boolean>,
 *   } | null,
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved: () => void,
 * }} props
 */
export default function InstitutionEditModulesModal({ institution, open, onClose, onSaved }) {
  const [plan, setPlan] = useState('standard');
  const [modules, setModules] = useState(normalizeModules(null));
  const [modulesCustomized, setModulesCustomized] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && institution) {
      const resolved = resolveInstitutionPlan(institution);
      setPlan(resolved.plan);
      setModules(normalizeModules(institution.modules ?? resolved.preset.modules));
      setModulesCustomized(isCustomModuleOverride(resolved.plan, institution.modules));
      setPendingPlan(null);
      setError('');
    }
  }, [open, institution]);

  const planPreset = useMemo(() => getPackagePreset(plan), [plan]);
  const hasModuleOverride = useMemo(
    () => modulesCustomized || isCustomModuleOverride(plan, modules),
    [modulesCustomized, plan, modules],
  );

  if (!open || !institution) {
    return null;
  }

  const applyPlan = (planKey) => {
    const preset = getPackagePreset(planKey);
    setPlan(planKey);
    setModules({ ...preset.modules });
    setModulesCustomized(false);
    setPendingPlan(null);
  };

  const onPlanSelect = (planKey) => {
    if (planKey === plan) {
      return;
    }
    setPendingPlan(planKey);
  };

  const onModulesChange = (next) => {
    setModules(next);
    setModulesCustomized(isCustomModuleOverride(plan, next));
  };

  const onSave = async () => {
    setSaving(true);
    setError('');
    try {
      await updateInstitutionPlanAndModules(institution.id, {
        plan,
        planName: planPreset.name,
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

        <PackageSelector selectedPlan={plan} onSelect={onPlanSelect} disabled={saving} />

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

        {pendingPlan ? (
          <div className="plan-change-confirm" role="alertdialog" aria-labelledby="plan-change-title">
            <h4 id="plan-change-title">Paket değişikliği</h4>
            <p>
              Paket değiştirildiğinde modül ayarları seçilen pakete göre yeniden düzenlenecek. Devam
              etmek istiyor musunuz?
            </p>
            <div className="modal-card__actions">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setPendingPlan(null)}
                disabled={saving}>
                Vazgeç
              </button>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => applyPlan(pendingPlan)}
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
