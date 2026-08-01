import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

export const SCHEDULE_REQUEST_APPROVED = 'schedule_request_approved';
export const SCHEDULE_REQUEST_REJECTED = 'schedule_request_rejected';
export const ATTENDANCE_REQUEST_APPROVED = 'attendance_request_approved';
export const ATTENDANCE_REQUEST_REJECTED = 'attendance_request_rejected';
export const MAKEUP_LESSON_CREATED = 'makeup_lesson_created';
export const MAKEUP_LESSON_REJECTED = 'makeup_lesson_rejected';
export const LESSON_CANCELLATION_APPROVED = 'lesson_cancellation_approved';
export const LESSON_CANCELLATION_REJECTED = 'lesson_cancellation_rejected';

/**
 * Firestore bildirimi — push yok (web panel).
 */
export async function createInstitutionNotification({ institutionId, userId, title, message, type }) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(userId ?? '').trim();
  if (!inst || !uid) {
    throw new Error('Bildirim için kurum ve kullanıcı zorunludur.');
  }

  const notificationData = {
    institutionId: inst,
    userId: uid,
    title: String(title ?? '').trim() || 'Bildirim',
    message: String(message ?? '').trim() || '—',
    type: String(type ?? '').trim(),
    createdAt: serverTimestamp(),
    read: false,
  };

  try {
    await addDoc(collection(db, 'notifications'), notificationData);
    return { ok: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB REJECT NOTIFICATION ERROR:', error.code, error.message);
    throw error;
  }
}
