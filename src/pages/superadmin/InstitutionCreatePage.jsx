import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import InstitutionModulesEditor from '../../components/InstitutionModulesEditor';
import { DEFAULT_MODULES, normalizeModules } from '../../constants/institutionModules';
import {
  createInstitution,
  slugifyInstitutionName,
} from '../../services/institutionService';

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
  const [form, setForm] = useState(EMPTY);
  const [modules, setModules] = useState(() => normalizeModules(DEFAULT_MODULES));
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const onNameChange = (name) => {
    setForm((prev) => ({
      ...prev,
      name,
      slug: slugTouched ? prev.slug : slugifyInstitutionName(name),
    }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const result = await createInstitution({
        ...form,
        isActive: true,
        modules,
      });
      setSuccess(`Kurum oluşturuldu. Slug: ${result.slug}`);
      setTimeout(() => {
        navigate('/superadmin/institutions');
      }, 1200);
    } catch (err) {
      if (err?.code === 'slug-duplicate') {
        setError('Bu subdomain zaten kullanılıyor. Farklı bir slug deneyin.');
      } else {
        setError(err?.message ?? 'Kurum oluşturulamadı.');
      }
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

      <form className="page-card form-grid" onSubmit={onSubmit}>
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
          <InstitutionModulesEditor modules={modules} onChange={setModules} disabled={submitting} />
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
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? 'Kaydediliyor…' : 'Kurumu Oluştur'}
          </button>
        </div>
      </form>
    </div>
  );
}
