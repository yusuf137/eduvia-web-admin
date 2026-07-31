import { formatDateTime } from '../../../utils/dateFormat';
import { formatPlanPrice } from '../../../utils/packageFormat';
import {
  PACKAGE_STATUS,
  PACKAGE_STATUS_BADGE_CLASS,
  PACKAGE_STATUS_LABELS,
} from '../../../constants/packageStatus';

/**
 * @param {object} props
 * @param {import('../../../types/package').PackageRecord} props.pkg
 * @param {() => void} props.onEdit
 * @param {() => void} props.onDuplicate
 * @param {() => void} props.onToggleStatus
 * @param {() => void} props.onDelete
 * @param {() => void} props.onView
 * @param {boolean} [props.busy]
 */
export default function PackageManagementCard({
  pkg,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onDelete,
  onView,
  busy = false,
}) {
  const statusClass = PACKAGE_STATUS_BADGE_CLASS[pkg.status] ?? 'badge--muted';

  return (
    <article
      className="package-mgmt-card"
      style={{ '--package-accent': pkg.color || '#2563eb' }}>
      <button type="button" className="package-mgmt-card__body" onClick={onView}>
        <div className="package-mgmt-card__head">
          <h3>{pkg.name}</h3>
          <span className={`badge ${statusClass}`}>
            {PACKAGE_STATUS_LABELS[pkg.status] ?? pkg.status}
          </span>
        </div>
        <p className="package-mgmt-card__desc">{pkg.description || '—'}</p>
        <div className="package-mgmt-card__prices">
          <div>
            <span className="muted">Aylık</span>
            <strong>{pkg.monthlyPrice != null ? formatPlanPrice(pkg.monthlyPrice) : '—'}</strong>
          </div>
          <div>
            <span className="muted">Yıllık</span>
            <strong>{pkg.yearlyPrice != null ? formatPlanPrice(pkg.yearlyPrice) : '—'}</strong>
          </div>
        </div>
        <p className="muted package-mgmt-card__meta">
          Oluşturulma: {formatDateTime(pkg.createdAt)}
        </p>
      </button>
      <div className="package-mgmt-card__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onEdit} disabled={busy}>
          Düzenle
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDuplicate} disabled={busy}>
          Kopyala
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onToggleStatus} disabled={busy}>
          {pkg.status === PACKAGE_STATUS.ACTIVE ? 'Pasif Yap' : 'Aktif Yap'}
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onDelete} disabled={busy}>
          Sil
        </button>
      </div>
    </article>
  );
}

export function PackageStatCards({ stats, loading }) {
  if (loading) {
    return <p className="muted">Paket özeti yükleniyor…</p>;
  }

  return (
    <div className="stat-grid">
      <article className="stat-card">
        <div className="stat-card__head"><span className="stat-card__title">Toplam Paket</span></div>
        <div className="stat-card__value">{stats.total}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head"><span className="stat-card__title">Aktif Paket</span></div>
        <div className="stat-card__value">{stats.active}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head"><span className="stat-card__title">Pasif Paket</span></div>
        <div className="stat-card__value">{stats.inactive}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head"><span className="stat-card__title">En Çok Kullanılan Paket</span></div>
        <div className="stat-card__value stat-card__value--text">{stats.mostUsedName}</div>
      </article>
    </div>
  );
}
