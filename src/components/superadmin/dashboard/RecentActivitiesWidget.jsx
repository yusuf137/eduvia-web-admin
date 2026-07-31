import { Link } from 'react-router-dom';
import { formatAuditActivityLine } from '../../../utils/auditLogHelpers';

export default function RecentActivitiesWidget({ activities, loading }) {
  return (
    <section className="page-card recent-activities-widget">
      <div className="recent-activities-widget__head">
        <h3 className="page-heading institution-detail__section-title">Son 10 Aktivite</h3>
        <Link to="/superadmin/audit-log" className="btn btn--ghost btn--sm">
          Tümünü gör
        </Link>
      </div>

      {loading ? (
        <p className="muted">Aktiviteler yükleniyor…</p>
      ) : !activities.length ? (
        <p className="muted">Henüz aktivite kaydı yok.</p>
      ) : (
        <ul className="recent-activities-widget__list">
          {activities.map((log) => {
            const line = formatAuditActivityLine(log);
            return (
              <li key={log.id} className="recent-activities-widget__item">
                <div className="recent-activities-widget__time">{line.time}</div>
                <div>
                  <strong>{line.user}</strong>
                  <p className="recent-activities-widget__text">{line.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
