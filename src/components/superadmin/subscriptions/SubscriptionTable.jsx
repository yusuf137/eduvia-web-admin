import { Link } from 'react-router-dom';
import { formatCurrency } from '../../../utils/packageFormat';
import { SUBSCRIPTION_STATUS } from '../../../constants/subscriptionStatus';
import { resolvePackageLabel } from '../../../services/packageService';
import { formatDate } from '../../../utils/dateFormat';
import { getSubscriptionStatusMeta } from '../../../utils/subscriptionStatus';
import { getSubscriptionDisplayStatus } from '../../../services/subscriptionService';

export default function SubscriptionTable({
  rows,
  loading,
  packages = [],
  onView,
  onEdit,
  onAddPayment,
  onSuspend,
  onActivate,
  onCancel,
}) {
  if (loading) {
    return (
      <div className="page-card">
        <p className="muted">Abonelikler yükleniyor…</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="page-card">
        <p className="muted">Filtrelere uygun abonelik bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="page-card table-wrap">
      <table className="data-table subscription-table">
        <thead>
          <tr>
            <th>Kurum Adı</th>
            <th>Paket</th>
            <th>Aylık Ücret</th>
            <th>Başlangıç Tarihi</th>
            <th>Son Ödeme</th>
            <th>Sonraki Ödeme / Trial Bitiş</th>
            <th>Durum</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusMeta = getSubscriptionStatusMeta(row);
            const packageLabel = resolvePackageLabel(
              packages,
              row.packageId || row.package || row.packageName,
            );
            const effectiveStatus = getSubscriptionDisplayStatus(row);
            const isFullAccess =
              effectiveStatus === SUBSCRIPTION_STATUS.ACTIVE
              || effectiveStatus === SUBSCRIPTION_STATUS.TRIAL;
            const canReactivate =
              effectiveStatus === SUBSCRIPTION_STATUS.SUSPENDED
              || effectiveStatus === SUBSCRIPTION_STATUS.EXPIRED
              || effectiveStatus === SUBSCRIPTION_STATUS.CANCELLED;

            return (
              <tr key={row.id}>
                <td>
                  <Link
                    to={`/superadmin/institutions/${row.institutionId}`}
                    className="subscription-table__link">
                    {row.institutionName || '—'}
                  </Link>
                </td>
                <td>{packageLabel}</td>
                <td>{formatCurrency(row.monthlyFee)}</td>
                <td>{formatDate(row.startDate)}</td>
                <td>{formatDate(row.lastPaymentDate)}</td>
                <td>
                  {effectiveStatus === SUBSCRIPTION_STATUS.TRIAL
                    ? formatDate(row.trialEndDate)
                    : formatDate(row.nextPaymentDate)}
                </td>
                <td>
                  <span className={`badge ${statusMeta.badgeClass}`}>{statusMeta.label}</span>
                </td>
                <td>
                  <div className="subscription-table__actions">
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => onView(row)}>
                      Görüntüle
                    </button>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => onEdit(row)}>
                      Düzenle
                    </button>
                    <button
                      type="button"
                      className="btn btn--ghost btn--xs"
                      onClick={() => onAddPayment(row)}
                      disabled={effectiveStatus === SUBSCRIPTION_STATUS.CANCELLED}>
                      Ödeme Ekle
                    </button>
                    {canReactivate ? (
                      <button
                        type="button"
                        className="btn btn--primary btn--xs"
                        onClick={() => onActivate(row)}>
                        Aktif Et
                      </button>
                    ) : null}
                    {isFullAccess ? (
                      <button
                        type="button"
                        className="btn btn--warn btn--xs"
                        onClick={() => onSuspend(row)}>
                        Askıya Al
                      </button>
                    ) : null}
                    {effectiveStatus !== SUBSCRIPTION_STATUS.CANCELLED ? (
                      <button
                        type="button"
                        className="btn btn--danger btn--xs"
                        onClick={() => onCancel(row)}>
                        İptal Et
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
