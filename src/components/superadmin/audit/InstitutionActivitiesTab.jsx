import { formatDateTime } from '../../../utils/dateFormat';
import { getAuditActionBadgeClass } from '../../../constants/auditActions';
import { getAuditActionUiLabel } from '../../../constants/auditActionUiLabels';

export default function InstitutionActivitiesTab({ activities, loading }) {
  if (loading) {
    return <p className="muted">Son aktiviteler yükleniyor…</p>;
  }

  if (!activities.length) {
    return <p className="muted">Bu kuruma ait aktivite kaydı bulunamadı.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table audit-log-table">
        <thead>
          <tr>
            <th>Tarih</th>
            <th>Kullanıcı</th>
            <th>İşlem</th>
            <th>Açıklama</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.createdAt)}</td>
              <td>{row.performedBy || '—'}</td>
              <td>
                <span className={`audit-badge ${getAuditActionBadgeClass(row.action)}`}>
                  {getAuditActionUiLabel(row.action)}
                </span>
              </td>
              <td>{row.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
