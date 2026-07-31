import { useEffect, useState } from 'react';
import {
  PACKAGE_FEATURE_KEYS,
  PACKAGE_FEATURE_LABELS,
  buildDefaultPackageFeatures,
  normalizePackageFeatures,
} from '../../../constants/packageFeatures';
import {
  PACKAGE_LIMIT_KEYS,
  PACKAGE_LIMIT_LABELS,
  buildDefaultPackageLimits,
  normalizePackageLimits,
} from '../../../constants/packageLimits';
import {
  PACKAGE_STATUS,
  PACKAGE_STATUS_KEYS,
  PACKAGE_STATUS_LABELS,
} from '../../../constants/packageStatus';
import { DEFAULT_CURRENCY, computePackageRevenueStats } from '../../../services/packageService';
import { formatPlanPrice } from '../../../utils/packageFormat';
import { formatDateTime } from '../../../utils/dateFormat';

const ICON_OPTIONS = [
  { value: 'package', label: 'Paket' },
  { value: 'sparkles', label: 'Pro' },
  { value: 'settings', label: 'Ayarlar' },
  { value: 'building', label: 'Kurum' },
  { value: 'star', label: 'Yıldız' },
];

const COLOR_OPTIONS = ['#2563eb', '#059669', '#7c3aed', '#ea580c', '#0f172a', '#db2777'];

function buildEmptyForm() {
  return {
    name: '',
    description: '',
    monthlyPrice: '',
    yearlyPrice: '',
    currency: DEFAULT_CURRENCY,
    status: PACKAGE_STATUS.DRAFT,
    sortOrder: '0',
    color: '#2563eb',
    icon: 'package',
    limits: buildDefaultPackageLimits(),
    features: buildDefaultPackageFeatures(false),
  };
}

/** @param {import('../../../types/package').PackageRecord|null|undefined} pkg */
function formFromPackage(pkg) {
  if (!pkg) return buildEmptyForm();
  return {
    name: pkg.name,
    description: pkg.description,
    monthlyPrice: pkg.monthlyPrice == null ? '' : String(pkg.monthlyPrice),
    yearlyPrice: pkg.yearlyPrice == null ? '' : String(pkg.yearlyPrice),
    currency: pkg.currency,
    status: pkg.status,
    sortOrder: String(pkg.sortOrder ?? 0),
    color: pkg.color,
    icon: pkg.icon,
    limits: { ...pkg.limits },
    features: { ...pkg.features },
  };
}

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {import('../../../types/package').PackageRecord|null} [props.initial]
 * @param {() => void} props.onClose
 * @param {(payload: object) => Promise<void>} props.onSubmit
 */
export default function PackageFormModal({ open, initial = null, onClose, onSubmit }) {
  const [form, setForm] = useState(buildEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(formFromPackage(initial));
      setError('');
    }
  }, [open, initial]);

  if (!open) return null;

  const onSave = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim(),
        monthlyPrice: form.monthlyPrice === '' ? null : Number(form.monthlyPrice),
        yearlyPrice: form.yearlyPrice === '' ? null : Number(form.yearlyPrice),
        currency: form.currency,
        status: form.status,
        sortOrder: Number(form.sortOrder ?? 0),
        color: form.color,
        icon: form.icon,
        limits: normalizePackageLimits(form.limits),
        features: normalizePackageFeatures(form.features),
      });
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Paket kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card package-form-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>{initial ? 'Paketi Düzenle' : 'Yeni Paket'}</h3>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form className="package-form" onSubmit={(event) => void onSave(event)}>
          <section className="package-form__section">
            <h4>Genel Bilgiler</h4>
            <div className="form-grid">
              <label>
                Paket Adı *
                <input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                />
              </label>
              <label>
                Sıralama
                <input
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
                />
              </label>
              <label className="form-grid__full">
                Açıklama
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </label>
              <label>
                Renk
                <select
                  value={form.color}
                  onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}>
                  {COLOR_OPTIONS.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                İkon
                <select
                  value={form.icon}
                  onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}>
                  {ICON_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Durum
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}>
                  {PACKAGE_STATUS_KEYS.map((key) => (
                    <option key={key} value={key}>
                      {PACKAGE_STATUS_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="package-form__section">
            <h4>Fiyatlandırma</h4>
            <div className="form-grid">
              <label>
                Aylık Ücret
                <input
                  type="number"
                  min="0"
                  value={form.monthlyPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, monthlyPrice: e.target.value }))}
                />
              </label>
              <label>
                Yıllık Ücret
                <input
                  type="number"
                  min="0"
                  value={form.yearlyPrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, yearlyPrice: e.target.value }))}
                />
              </label>
              <label>
                Para Birimi
                <input
                  value={form.currency}
                  onChange={(e) => setForm((prev) => ({ ...prev, currency: e.target.value }))}
                />
              </label>
            </div>
          </section>

          <section className="package-form__section">
            <h4>Kullanım Limitleri</h4>
            <p className="muted package-form__hint">0 = Sınırsız</p>
            <div className="form-grid">
              {PACKAGE_LIMIT_KEYS.map((key) => (
                <label key={key}>
                  {PACKAGE_LIMIT_LABELS[key]}
                  <input
                    type="number"
                    min="0"
                    value={form.limits[key]}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        limits: { ...prev.limits, [key]: Number(e.target.value) },
                      }))
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className="package-form__section">
            <h4>Özellikler</h4>
            <div className="package-form__features">
              {PACKAGE_FEATURE_KEYS.map((key) => (
                <label key={key} className="package-form__feature">
                  <input
                    type="checkbox"
                    checked={form.features[key] === true}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        features: { ...prev.features, [key]: e.target.checked },
                      }))
                    }
                  />
                  {PACKAGE_FEATURE_LABELS[key]}
                </label>
              ))}
            </div>
          </section>

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/** @param {object} props */
export function PackageDetailModal({ pkg, open, onClose, onEdit }) {
  if (!open || !pkg) return null;

  const revenue = computePackageRevenueStats(pkg);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card package-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>{pkg.name}</h3>
        <p className="muted">{pkg.description || '—'}</p>

        <dl className="subscription-detail-grid">
          <div>
            <dt>Kullanan Kurum</dt>
            <dd>{revenue.institutionCount}</dd>
          </div>
          <div>
            <dt>Toplam Aylık Gelir</dt>
            <dd>{formatPlanPrice(revenue.monthlyRevenue)}</dd>
          </div>
          <div>
            <dt>Toplam Yıllık Gelir</dt>
            <dd>{formatPlanPrice(revenue.yearlyRevenue)}</dd>
          </div>
          <div>
            <dt>Son Düzenleme</dt>
            <dd>{formatDateTime(pkg.updatedAt)}</dd>
          </div>
        </dl>

        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onEdit}>
            Düzenle
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
