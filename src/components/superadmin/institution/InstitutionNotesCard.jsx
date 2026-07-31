import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  NOTE_TAG_KEYS,
  NOTE_TAG_LABELS,
  createInstitutionNote,
  deleteInstitutionNote,
  updateInstitutionNote,
} from '../../../services/institutionNoteService';
import { formatDate, parseDateInput, todayDateInputValue, toDateInputValue } from '../../../utils/dateFormat';

function NoteFormModal({ open, onClose, onSaved, initialNote, institutionId }) {
  const { currentUserProfile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tag, setTag] = useState('general');
  const [noteDate, setNoteDate] = useState(todayDateInputValue());
  const [reminderDate, setReminderDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initialNote?.title ?? '');
      setDescription(initialNote?.description ?? '');
      setTag(initialNote?.tag ?? 'general');
      setNoteDate(initialNote?.noteDate ? toDateInputValue(initialNote.noteDate) : todayDateInputValue());
      setReminderDate(initialNote?.reminderDate ? toDateInputValue(initialNote.reminderDate) : '');
      setError('');
    }
  }, [open, initialNote]);

  if (!open) return null;

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title,
        description,
        tag,
        noteDate: parseDateInput(noteDate),
        reminderDate: reminderDate ? parseDateInput(reminderDate) : null,
        createdByName: currentUserProfile?.name ?? currentUserProfile?.displayName ?? 'SuperAdmin',
      };

      if (initialNote?.id) {
        await updateInstitutionNote(initialNote.id, payload);
      } else {
        await createInstitutionNote(institutionId, payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Not kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card subscription-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h3>{initialNote ? 'Notu Düzenle' : 'Yeni Not'}</h3>
        {error ? <div className="alert alert--error">{error}</div> : null}
        <form className="subscription-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Başlık
            <input value={title} onChange={(e) => setTitle(e.target.value)} required />
          </label>
          <label>
            Açıklama
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} required />
          </label>
          <label>
            Etiket
            <select value={tag} onChange={(e) => setTag(e.target.value)}>
              {NOTE_TAG_KEYS.map((key) => (
                <option key={key} value={key}>
                  {NOTE_TAG_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Tarih
            <input type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required />
          </label>
          <label>
            Hatırlatma Tarihi (opsiyonel)
            <input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} />
          </label>
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

function tagBadgeClass(tag) {
  if (tag === 'payment') return 'badge--warn';
  if (tag === 'support') return 'badge--accent';
  if (tag === 'reminder') return 'badge--danger';
  return 'badge--muted';
}

export default function InstitutionNotesCard({ institutionId, notes, loading, onReload }) {
  const [formOpen, setFormOpen] = useState(false);
  const [editNote, setEditNote] = useState(null);

  const onDelete = async (note) => {
    if (!window.confirm(`"${note.title}" notu silinsin mi?`)) return;
    try {
      await deleteInstitutionNote(note.id);
      onReload();
    } catch (e) {
      window.alert(e?.message ?? 'Not silinemedi.');
    }
  };

  return (
    <section className="page-card institution-notes-card">
      <div className="page-toolbar institution-notes-card__head">
        <h3 className="page-heading institution-notes-card__title">Kurum Notları</h3>
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setFormOpen(true)}>
          + Yeni Not
        </button>
      </div>

      {loading ? (
        <p className="muted">Notlar yükleniyor…</p>
      ) : notes.length === 0 ? (
        <p className="muted">Bu kurum için henüz not eklenmemiş.</p>
      ) : (
        <div className="institution-notes-grid">
          {notes.map((note) => (
            <article key={note.id} className="institution-note-card">
              <div className="institution-note-card__head">
                <h4>{note.title}</h4>
                <span className={`badge ${tagBadgeClass(note.tag)}`}>{NOTE_TAG_LABELS[note.tag] ?? note.tag}</span>
              </div>
              <p className="institution-note-card__meta">
                Oluşturma: {formatDate(note.createdAt)}
                {note.reminderDate ? ` · Hatırlatma: ${formatDate(note.reminderDate)}` : ''}
              </p>
              <p className="institution-note-card__body">{note.description}</p>
              <p className="institution-note-card__author">{note.createdByName || 'SuperAdmin'}</p>
              <div className="institution-note-card__actions">
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setEditNote(note)}>
                  Düzenle
                </button>
                <button type="button" className="btn btn--danger btn--xs" onClick={() => void onDelete(note)}>
                  Sil
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <NoteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={onReload}
        institutionId={institutionId}
      />

      <NoteFormModal
        open={Boolean(editNote)}
        onClose={() => setEditNote(null)}
        onSaved={onReload}
        initialNote={editNote}
        institutionId={institutionId}
      />
    </section>
  );
}
