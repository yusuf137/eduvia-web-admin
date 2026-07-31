import { auth, db } from '../firebase/firebaseConfig';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';
import { fetchInstitutionById } from './institutionService';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';

const NOTES = 'institutionNotes';

export const NOTE_TAG_KEYS = ['general', 'payment', 'support', 'meeting', 'technical', 'reminder'];

export const NOTE_TAG_LABELS = {
  general: 'Genel',
  payment: 'Ödeme',
  support: 'Destek',
  meeting: 'Görüşme',
  technical: 'Teknik',
  reminder: 'Hatırlatma',
};

function mapNoteDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    title: String(data.title ?? ''),
    description: String(data.description ?? ''),
    tag: String(data.tag ?? 'general'),
    noteDate: data.noteDate ?? null,
    reminderDate: data.reminderDate ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdBy: data.createdBy ?? null,
    createdByName: String(data.createdByName ?? ''),
  };
}

async function resolveInstitutionName(institutionId) {
  const inst = await fetchInstitutionById(institutionId);
  return inst?.name ?? '';
}

export async function listInstitutionNotes(institutionId) {
  const id = String(institutionId ?? '').trim();
  if (!id) return [];
  const snap = await getDocs(query(collection(db, NOTES), where('institutionId', '==', id)));
  return snap.docs
    .map(mapNoteDoc)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}

export async function listUpcomingReminderNotes(withinDays = 14) {
  const snap = await getDocs(collection(db, NOTES));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const limitDate = new Date(now);
  limitDate.setDate(limitDate.getDate() + withinDays);
  limitDate.setHours(23, 59, 59, 999);

  return snap.docs
    .map(mapNoteDoc)
    .filter((note) => {
      const reminder = note.reminderDate?.toDate?.();
      if (!reminder) return false;
      return reminder >= now && reminder <= limitDate;
    })
    .sort((a, b) => (a.reminderDate?.toMillis?.() ?? 0) - (b.reminderDate?.toMillis?.() ?? 0));
}

export async function createInstitutionNote(institutionId, input) {
  const id = String(institutionId ?? '').trim();
  if (!id) throw new Error('Kurum kimliği gerekli.');

  const noteDate = input.noteDate instanceof Date ? input.noteDate : new Date();
  const reminderDate =
    input.reminderDate instanceof Date ? Timestamp.fromDate(input.reminderDate) : null;

  const title = String(input.title ?? '').trim();
  const description = String(input.description ?? '').trim();

  const ref = await addDoc(collection(db, NOTES), {
    institutionId: id,
    title,
    description,
    tag: String(input.tag ?? 'general'),
    noteDate: Timestamp.fromDate(noteDate),
    reminderDate,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
    createdByName: String(input.createdByName ?? auth.currentUser?.displayName ?? 'SuperAdmin'),
  });

  const institutionName = await resolveInstitutionName(id);
  auditLogger.log({
    action: AUDIT_ACTIONS.INSTITUTION_NOTE_ADDED,
    module: AUDIT_MODULES.NOTE,
    institutionId: id,
    institutionName,
    description: `${institutionName} kurumuna not eklendi: ${title || 'Başlıksız'}.`,
    newData: { noteId: ref.id, title, tag: input.tag ?? 'general' },
  });
}

export async function updateInstitutionNote(noteId, input) {
  const id = String(noteId ?? '').trim();
  if (!id) throw new Error('Not kimliği gerekli.');

  const previousSnap = await getDoc(doc(db, NOTES, id));
  const previous = previousSnap.exists() ? mapNoteDoc(previousSnap) : null;

  const payload = {
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    tag: String(input.tag ?? 'general'),
    updatedAt: serverTimestamp(),
  };

  if (input.noteDate instanceof Date) {
    payload.noteDate = Timestamp.fromDate(input.noteDate);
  }
  payload.reminderDate =
    input.reminderDate instanceof Date ? Timestamp.fromDate(input.reminderDate) : null;

  await updateDoc(doc(db, NOTES, id), payload);

  const institutionName = previous
    ? await resolveInstitutionName(previous.institutionId)
    : '';

  auditLogger.log({
    action: AUDIT_ACTIONS.INSTITUTION_NOTE_UPDATED,
    module: AUDIT_MODULES.NOTE,
    institutionId: previous?.institutionId ?? null,
    institutionName,
    description: `${institutionName} kurumundaki not güncellendi: ${payload.title || 'Başlıksız'}.`,
    oldData: previous
      ? { title: previous.title, description: previous.description, tag: previous.tag }
      : null,
    newData: {
      title: payload.title,
      description: payload.description,
      tag: payload.tag,
    },
  });
}

export async function deleteInstitutionNote(noteId) {
  const id = String(noteId ?? '').trim();
  if (!id) throw new Error('Not kimliği gerekli.');

  const previousSnap = await getDoc(doc(db, NOTES, id));
  const previous = previousSnap.exists() ? mapNoteDoc(previousSnap) : null;
  const institutionName = previous
    ? await resolveInstitutionName(previous.institutionId)
    : '';

  await deleteDoc(doc(db, NOTES, id));

  auditLogger.log({
    action: AUDIT_ACTIONS.INSTITUTION_NOTE_DELETED,
    module: AUDIT_MODULES.NOTE,
    institutionId: previous?.institutionId ?? null,
    institutionName,
    description: `${institutionName} kurumundaki not silindi: ${previous?.title ?? '—'}.`,
    oldData: previous
      ? { noteId: previous.id, title: previous.title, tag: previous.tag }
      : null,
  });
}
