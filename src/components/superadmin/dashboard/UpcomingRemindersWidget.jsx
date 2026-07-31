import { Link } from 'react-router-dom';
import { NOTE_TAG_LABELS } from '../../../services/institutionNoteService';
import { formatDate } from '../../../utils/dateFormat';

export default function UpcomingRemindersWidget({ reminders, loading }) {
  return (
    <section className="page-card upcoming-reminders">
      <div className="page-toolbar upcoming-reminders__head">
        <h3 className="page-heading" style={{ fontSize: '1.1rem' }}>
          Yaklaşan Hatırlatmalar
        </h3>
      </div>

      {loading ? (
        <p className="muted">Hatırlatmalar yükleniyor…</p>
      ) : reminders.length === 0 ? (
        <p className="muted">Yaklaşan hatırlatma bulunmuyor.</p>
      ) : (
        <ul className="upcoming-reminders__list">
          {reminders.map((note) => (
            <li key={note.id} className="upcoming-reminders__item">
              <div>
                <strong>{note.title}</strong>
                <p className="muted">
                  {NOTE_TAG_LABELS[note.tag] ?? note.tag} · {formatDate(note.reminderDate)}
                </p>
              </div>
              <Link to={`/superadmin/institutions/${note.institutionId}`} className="btn btn--ghost btn--xs">
                Kuruma Git
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
