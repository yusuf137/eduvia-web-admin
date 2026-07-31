import { useEffect, useMemo, useState } from 'react';
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_STATUS_KEYS,
  SUBSCRIPTION_STATUS_LABELS,
} from '../../../constants/subscriptionStatus';
import { usePackages } from '../../../contexts/PackageCatalogContext';
import { updateSubscription } from '../../../services/subscriptionService';
import { findPackageInCatalog } from '../../../utils/packageResolver';
import { formatCurrency } from '../../../utils/packageFormat';
import { parseDateInput, toDateInputValue } from '../../../utils/dateFormat';

export default function SubscriptionEditModal({
  subscription,
  open,
  onClose,
  onSaved,
  packages: packagesProp,
}) {
  const { packages: catalogPackages } = usePackages();
  const packages = packagesProp?.length ? packagesProp : catalogPackages;

  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [subscriptionStatus, setSubscriptionStatus] = useState(SUBSCRIPTION_STATUS.ACTIVE);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [autoRenew, setAutoRenew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initialPackage = useMemo(() => {
    if (!subscription) return null;
    return (
      findPackageInCatalog(packages, subscription.packageId)
      || findPackageInCatalog(packages, subscription.plan)
      || findPackageInCatalog(packages, subscription.packageName ?? subscription.package)
      || null
    );
  }, [subscription, packages]);

  useEffect(() => {
    if (open && subscription) {
      const pkg = initialPackage;
      setSelectedPackageId(pkg?.id ?? '');
      setPackageName(pkg?.name ?? subscription.packageName ?? subscription.package ?? '');
      setMonthlyPrice(
        String(
          subscription.monthlyPrice
          ?? subscription.monthlyFee
          ?? pkg?.monthlyPrice
          ?? '',
        ),
      );
      setSubscriptionStatus(subscription.subscriptionStatus ?? subscription.status ?? SUBSCRIPTION_STATUS.ACTIVE);
      setStartDate(toDateInputValue(subscription.startDate));
      setEndDate(toDateInputValue(subscription.endDate ?? subscription.trialEndDate));
      setNextPaymentDate(toDateInputValue(subscription.nextPaymentDate));
      setAutoRenew(subscription.autoRenew === true);
      setError('');
    }
  }, [open, subscription, initialPackage]);

  if (!open || !subscription) return null;

  const onPackageChange = (packageId) => {
    const pkg = findPackageInCatalog(packages, packageId);
    setSelectedPackageId(packageId);
    setPackageName(pkg?.name ?? '');
    if (pkg?.monthlyPrice != null) {
      setMonthlyPrice(String(pkg.monthlyPrice));
    }
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateSubscription(subscription.institutionId, {
        packageName,
        monthlyPrice: monthlyPrice === '' ? null : Number(monthlyPrice),
        subscriptionStatus,
        startDate: parseDateInput(startDate),
        endDate: parseDateInput(endDate),
        nextPaymentDate: parseDateInput(nextPaymentDate),
        autoRenew,
        institutionName: subscription.institutionName,
        reason: 'SuperAdmin abonelik düzenlemesi',
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Abonelik güncellenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card subscription-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>Abonelik Düzenle</h3>
        <p className="muted">{subscription.institutionName}</p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form className="subscription-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Paket
            <select
              value={selectedPackageId}
              onChange={(event) => onPackageChange(event.target.value)}>
              {packages.filter((pkg) => !pkg.archived).map((pkg) => (
                <option key={pkg.id} value={pkg.id}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Aylık Ücret (TL)
            <input
              type="number"
              min="0"
              step="1"
              value={monthlyPrice}
              onChange={(event) => setMonthlyPrice(event.target.value)}
            />
          </label>

          <label>
            Abonelik Durumu
            <select
              value={subscriptionStatus}
              onChange={(event) => setSubscriptionStatus(event.target.value)}>
              {SUBSCRIPTION_STATUS_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SUBSCRIPTION_STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </label>

          <label>
            Başlangıç Tarihi
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label>
            Bitiş Tarihi {subscriptionStatus === SUBSCRIPTION_STATUS.TRIAL ? '(Trial)' : ''}
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label>
            Sonraki Ödeme
            <input
              type="date"
              value={nextPaymentDate}
              onChange={(event) => setNextPaymentDate(event.target.value)}
            />
          </label>

          <label className="subscription-form__checkbox">
            <input
              type="checkbox"
              checked={autoRenew}
              onChange={(event) => setAutoRenew(event.target.checked)}
            />
            Otomatik yenileme (autoRenew)
          </label>

          <p className="muted">
            Mevcut: {formatCurrency(subscription.monthlyPrice ?? subscription.monthlyFee)} — veriler
            korunur, yalnızca güncellenen alanlar yazılır.
          </p>

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
