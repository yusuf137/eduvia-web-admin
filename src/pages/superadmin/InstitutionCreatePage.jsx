import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InstitutionModulesEditor from '../../components/InstitutionModulesEditor';
import PackageSelector from '../../components/PackageSelector';
import { useAuth } from '../../contexts/AuthContext';
import { isCustomModuleOverrideForPackage } from '../../utils/packageResolver';
import { usePackages } from '../../contexts/PackageCatalogContext';
import {
  createInstitution,
  slugifyInstitutionName,
} from '../../services/institutionService';

function formatCreateError(err) {
  if (err?.code === 'slug-duplicate') {
    return 'Bu subdomain zaten kullanılıyor. Farklı bir slug deneyin.';
  }
  if (err?.code === 'permission-denied') {
    return 'Yetki hatası: Firestore rules kurum oluşturma verisini reddetti. Console loglarını kontrol edin.';
  }
  return err?.message ?? 'Kurum oluşturulamadı.';
}

const EMPTY = {
  name: '',
  slug: '',
  phone: '',
  email: '',
  city: '',
  address: '',
  isActive: true,
};

export default function InstitutionCreatePage() {
  const navigate = useNavigate();
  const { currentUser, currentUserProfile, loading: authLoading } = useAuth();
  const { activePackages, loading: packagesLoading } = usePackages();
  const [form, setForm] = useState(EMPTY);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [modules, setModules] = useState({});
  const [modulesCustomized, setModulesCustomized] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedPackage = useMemo(
    () => activePackages.find((pkg) => pkg.id === selectedPackageId) ?? null,
    [activePackages, selectedPackageId],
  );

  useEffect(() => {
    if (!selectedPackageId && activePackages.length) {
      const first = activePackages[0];
      setSelectedPackageId(first.id);
      setModules({ ...first.modules });
      setModulesCustomized(false);
    }
  }, [activePackages, selectedPackageId]);

  const hasModuleOverride = useMemo(
    () =>
      modulesCustomized ||
      (selectedPackage ? isCustomModuleOverrideForPackage(selectedPackage, modules) : false),
    [modulesCustomized, selectedPackage, modules],
  );

  const onPackageSelect = (pkg) => {
    setSelectedPackageId(pkg.id);
    setModules({ ...pkg.modules });
    setModulesCustomized(false);
  };

  const onModulesChange = (next) => {
    setModules(next);
    setModulesCustomized(
      selectedPackage ? isCustomModuleOverrideForPackage(selectedPackage, next) : true,
    );
  };

  const onNameChange = (name) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugifyInstitutionName(name),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (authLoading || packagesLoading) {
      setError('Veriler yükleniyor, lütfen bekleyin.');
      return;
    }

    if (!selectedPackage) {
      setError('Lütfen bir paket seçin.');
      return;
    }

    if (!currentUser?.uid || currentUserProfile?.role !== 'superAdmin') {
      setError('Bu işlem için SuperAdmin yetkisi gerekir.');
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const result = await createInstitution(
        {
          ...form,
          isActive: true,
          packageId: selectedPackage.id,
          plan: selectedPackage.slug,
          planName: selectedPackage.name,
          modules,
        },
        { currentUserProfile },
      );
      const warn = result.publicSyncFailed
        ? ' (Subdomain kaydı senkronize edilemedi; console loglarına bakın.)'
        : '';
      setSuccess(`Kurum oluşturuldu. Slug: ${result.slug}${warn}`);
      setTimeout(() => {
        navigate('/superadmin/institutions');
      }, 1200);
    } catch (err) {
      setError(formatCreateError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-stack">
      <div className="page-toolbar">
        <h2 className="page-heading">Kurum Oluştur</h2>
        <Link to="/superadmin/institutions" className="btn btn--ghost">
          ← Kurumlara dön
        </Link>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      <form className="page-card form-grid institution-form" onSubmit={onSubmit}>
        <label>
          Kurum adı *
          <input
            value={form.name}
            onChange={(e) => onNameChange(e.target.value)}
            required
            placeholder="Eflatun Sanat Merkezi"
          />
        </label>

        <label>
          Slug *
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((prev) => ({ ...prev, slug: slugifyInstitutionName(e.target.value) }));
            }}
            required
            placeholder="eflatun-sanat-merkezi"
          />
          <span className="field-hint">
            Subdomain: {form.slug ? `${form.slug}.eduviaapp.com` : '—'} · Küçük harf, tire; Türkçe
            karakterler dönüştürülür.
          </span>
        </label>

        <label>
          Telefon
          <input
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="+90 …"
          />
        </label>

        <label>
          E-posta
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="info@kurum.com"
          />
        </label>

        <label>
          Şehir
          <input
            value={form.city}
            onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
            placeholder="İstanbul"
          />
        </label>

        <label className="form-grid__full">
          Adres
          <input
            value={form.address}
            onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
            placeholder="Mahalle, sokak, no"
          />
        </label>

        <div className="form-grid__full">
          {packagesLoading ? (
            <p className="muted">Paketler yükleniyor…</p>
          ) : (
            <PackageSelector
              packages={activePackages}
              selectedPackageId={selectedPackageId}
              onSelect={onPackageSelect}
              disabled={submitting}
            />
          )}
          <div className="alert alert--info package-info-banner">
            Seçilen pakete göre modüller otomatik ayarlandı. İsterseniz aşağıdan ek özellikleri manuel
            olarak değiştirebilirsiniz.
          </div>
          {hasModuleOverride ? (
            <div className="alert alert--warn package-info-banner">
              Bu kurumda paket dışında özel modül ayarı bulunuyor.
            </div>
          ) : null}
        </div>

        <div className="form-grid__full">
          <InstitutionModulesEditor
            modules={modules}
            onChange={onModulesChange}
            disabled={submitting}
            legend="Ek Özellikler / Modül Ayarları"
          />
        </div>

        <label className="form-grid__checkbox">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            disabled
          />
          Aktif kurum (yeni kurumlar varsayılan olarak aktif oluşturulur)
        </label>

        <div className="form-grid__actions">
          <button type="submit" className="btn btn--primary" disabled={submitting || packagesLoading}>
            {submitting ? 'Kaydediliyor…' : 'Kurumu Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
