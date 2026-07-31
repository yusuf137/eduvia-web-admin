import { SUBSCRIPTION_STATUS_LABELS } from '../../../constants/subscriptionStatus';
import { usePackages } from '../../../contexts/PackageCatalogContext';
import { resolvePackageLabelFromCatalog } from '../../../utils/packageResolver';
import { formatCurrency } from '../../../utils/packageFormat';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import { getSubscriptionStatusMeta } from '../../../utils/subscriptionStatus';

export default function InstitutionSubscriptionCard({ subscription, institution, resolvedPackage }) {
  const { packages } = usePackages();

  if (!subscription) {
    return (
      <section className="page-card">
        <h3 className="page-heading institution-detail__section-title">Abonelik Bilgileri</h3>
        <p className="muted">Abonelik kaydı bulunamadı.</p>
      </section>
    );
  }

  const statusMeta = getSubscriptionStatusMeta(subscription);
  const packageName =
    resolvedPackage?.name
    ?? resolvePackageLabelFromCatalog(
      packages,
      subscription.packageId || subscription.package || subscription.packageName,
    );

  return (
    <section className="page-card">
      <div className="subscription-detail-modal__head">
        <h3 className="page-heading institution-detail__section-title">Abonelik Bilgileri</h3>
        <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
      </div>
      <dl className="subscription-detail-grid">
        <div>
          <dt>Paket</dt>
          <dd>{packageName}</dd>
        </div>
        {institution ? (
          <div>
            <dt>Kurum Paket Referansı</dt>
            <dd>{institution.packageId || institution.plan || '—'}</dd>
          </div>
        ) : null}
        <div>
          <dt>Durum</dt>
          <dd>{SUBSCRIPTION_STATUS_LABELS[statusMeta.key] ?? statusMeta.label}</dd>
        </div>
        <div>
          <dt>Aylık Ücret</dt>
          <dd>
            {subscription.monthlyPrice != null
              ? formatCurrency(subscription.monthlyPrice)
              : resolvedPackage?.monthlyPrice != null
                ? formatCurrency(resolvedPackage.monthlyPrice)
                : '—'}
          </dd>
        </div>
        <div>
          <dt>Başlangıç Tarihi</dt>
          <dd>{formatDate(subscription.startDate)}</dd>
        </div>
        <div>
          <dt>Bitiş Tarihi</dt>
          <dd>{formatDate(subscription.endDate ?? subscription.trialEndDate)}</dd>
        </div>
        <div>
          <dt>Son Ödeme</dt>
          <dd>{formatDate(subscription.lastPaymentDate)}</dd>
        </div>
        <div>
          <dt>Sonraki Ödeme</dt>
          <dd>{formatDate(subscription.nextPaymentDate)}</dd>
        </div>
        <div>
          <dt>Otomatik Yenileme</dt>
          <dd>{subscription.autoRenew ? 'Açık' : 'Kapalı'}</dd>
        </div>
        <div>
          <dt>Oluşturulma</dt>
          <dd>{formatDateTime(subscription.createdAt)}</dd>
        </div>
        <div>
          <dt>Son Güncelleme</dt>
          <dd>{formatDateTime(subscription.updatedAt)}</dd>
        </div>
        {subscription.suspendedAt ? (
          <div>
            <dt>Askıya Alınma</dt>
            <dd>{formatDateTime(subscription.suspendedAt)}</dd>
          </div>
        ) : null}
        {subscription.cancelledAt ? (
          <div>
            <dt>İptal Tarihi</dt>
            <dd>{formatDateTime(subscription.cancelledAt)}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
