import { Eye } from 'lucide-react';
import { AUDIT_ACTION_KEYS, getAuditActionBadgeClass } from '../../../constants/auditActions';
import { getAuditActionUiLabel } from '../../../constants/auditActionUiLabels';
import { formatDateTime } from '../../../utils/dateFormat';

export function AuditLogFilters({
  userSearch,
  onUserSearchChange,
  institutionSearch,
  onInstitutionSearchChange,
  actionFilter,
  onActionFilterChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}) {
  return (
    <section className="page-card audit-log-filters">
      <div className="payment-history-filters__grid">
        <label>
          Kullanıcı Ara
          <input
            type="search"
            placeholder="Kullanıcı adı veya e-posta…"
            value={userSearch}
            onChange={(event) => onUserSearchChange(event.target.value)}
          />
        </label>

        <label>
          Kurum Ara
          <input
            type="search"
            placeholder="Kurum adı…"
            value={institutionSearch}
            onChange={(event) => onInstitutionSearchChange(event.target.value)}
          />
        </label>

        <label>
          İşlem Türü
          <select value={actionFilter} onChange={(event) => onActionFilterChange(event.target.value)}>
            <option value="">Tümü</option>
            {AUDIT_ACTION_KEYS.map((key) => (
              <option key={key} value={key}>
                {getAuditActionUiLabel(key)}
              </option>
            ))}
          </select>
        </label>

        <label>
          Tarih Aralığı (Başlangıç)
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => onDateFromChange(event.target.value)}
          />
        </label>

        <label>
          Tarih Aralığı (Bitiş)
          <input
            type="date"
            value={dateTo}
            onChange={(event) => onDateToChange(event.target.value)}
          />
        </label>
      </div>
    </section>
  );
}

export function AuditLogTable({ rows, loading, onView }) {
  if (loading && !rows.length) {
    return <p className="muted">Aktivite kayıtları yükleniyor…</p>;
  }

  if (!rows.length) {
    return <p className="muted">Filtreye uygun aktivite kaydı bulunamadı.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table audit-log-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kullanıcı</th>
            <th>Kurum</th>
            <th>İşlem</th>
            <th>Açıklama</th>
            <th>IP</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const badgeClass = getAuditActionBadgeClass(row.action);
            return (
              <tr key={row.id}>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{row.performedBy || '—'}</td>
                <td>{row.institutionName || '—'}</td>
                <td>
                  <span className={`audit-badge ${badgeClass}`}>
                    {getAuditActionUiLabel(row.action)}
                  </span>
                </td>
                <td className="audit-log-table__description">{row.description || '—'}</td>
                <td>{row.ipAddress || '—'}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    title="Detay"
                    onClick={() => onView(row)}>
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function AuditLogStatCards({ stats, loading }) {
  if (loading) {
    return <p className="muted">Özet yükleniyor…</p>;
  }

  return (
    <div className="stat-grid">
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Bugünkü İşlem Sayısı</span>
        </div>
        <div className="stat-card__value">{stats.todayCount}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Son 7 Günlük İşlem</span>
        </div>
        <div className="stat-card__value">{stats.last7DaysCount}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">En Aktif Yönetici</span>
        </div>
        <div className="stat-card__value stat-card__value--text">{stats.mostActiveAdmin}</div>
      </article>
      <article className="stat-card">
        <div className="stat-card__head">
          <span className="stat-card__title">Son İşlem Tarihi</span>
        </div>
        <div className="stat-card__value stat-card__value--text">
          {formatDateTime(stats.lastActionAt)}
        </div>
      </article>
    </div>
  );
}
