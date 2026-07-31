import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SUBSCRIPTION_STATUS_LABELS } from '../../../constants/subscriptionStatus';
import { usePackages } from '../../../contexts/PackageCatalogContext';
import { listSubscriptionPayments } from '../../../services/subscriptionService';
import { resolvePackageLabelFromCatalog } from '../../../utils/packageResolver';
import { formatCurrency } from '../../../utils/packageFormat';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import { getSubscriptionStatusMeta } from '../../../utils/subscriptionStatus';

const PAYMENT_TYPE_LABELS = {
  bank_transfer: 'Havale / EFT',
  credit_card: 'Kredi Kartı',
  cash: 'Nakit',
  other: 'Diğer',
};

export default function SubscriptionDetailModal({ subscription, open, onClose }) {
  const { packages } = usePackages();
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(false);

  useEffect(() => {
    if (!open || !subscription) {
      setPayments([]);
      return;
    }

    let cancelled = false;
    setLoadingPayments(true);
    void listSubscriptionPayments(subscription.institutionId)
      .then((rows) => {
        if (!cancelled) setPayments(rows);
      })
      .finally(() => {
        if (!cancelled) setLoadingPayments(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, subscription]);

  if (!open || !subscription) return null;

  const statusMeta = getSubscriptionStatusMeta(subscription);
  const packageLabel = resolvePackageLabelFromCatalog(
    packages,
    subscription.packageId || subscription.package || subscription.packageName,
  );

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card subscription-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <div className="subscription-detail-modal__head">
          <div>
            <h3>{subscription.institutionName}</h3>
            <p className="muted">Abonelik detayı</p>
          </div>
          <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
        </div>

        <dl className="subscription-detail-grid">
          <div>
            <dt>Kurum Adı</dt>
            <dd>{subscription.institutionName || '—'}</dd>
          </div>
          <div>
            <dt>Paket</dt>
            <dd>{subscription.packageName ?? packageLabel}</dd>
          </div>
          <div>
            <dt>Başlangıç Tarihi</dt>
            <dd>{formatDate(subscription.startDate)}</dd>
          </div>
          <div>
            <dt>Bitiş Tarihi</dt>
            <dd>{formatDate(subscription.endDate ?? subscription.renewalDate ?? subscription.trialEndDate)}</dd>
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
            <dt>Aylık Ücret</dt>
            <dd>{formatCurrency(subscription.monthlyPrice ?? subscription.monthlyFee)}</dd>
          </div>
          <div>
            <dt>Toplam Ödenen Tutar</dt>
            <dd>{formatCurrency(subscription.totalPaid)}</dd>
          </div>
          <div>
            <dt>Toplam İndirim</dt>
            <dd>{formatCurrency(subscription.totalDiscount)}</dd>
          </div>
          <div>
            <dt>Durum</dt>
            <dd>{SUBSCRIPTION_STATUS_LABELS[statusMeta.key] ?? statusMeta.label}</dd>
          </div>
        </dl>

        <div className="subscription-detail-modal__section">
          <h4>Ödeme Geçmişi</h4>
          {loadingPayments ? (
            <p className="muted">Ödemeler yükleniyor…</p>
          ) : payments.length === 0 ? (
            <p className="muted">Henüz ödeme kaydı yok.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tarih</th>
                    <th>Tutar</th>
                    <th>Ödeme Türü</th>
                    <th>Açıklama</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDateTime(payment.paymentDate)}</td>
                      <td>{formatCurrency(payment.amount)}</td>
                      <td>{PAYMENT_TYPE_LABELS[payment.paymentType] ?? payment.paymentType}</td>
                      <td>{payment.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="modal-card__actions">
          <Link
            to={`/superadmin/institutions/${subscription.institutionId}`}
            className="btn btn--ghost"
            onClick={onClose}>
            Kurum Detayı
          </Link>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
