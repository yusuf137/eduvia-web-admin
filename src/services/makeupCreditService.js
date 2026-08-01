import { db } from '../firebase/firebaseConfig';
import {
  isEffectiveCancellationStatus,
  LESSON_CANCELLATIONS_COLLECTION,
} from '../constants/lessonCancellationCollection';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';

export async function syncStudentMakeupCredit(studentId) {
  const sid = String(studentId ?? '').trim();
  if (!sid) {
    throw new Error('Geçersiz öğrenci.');
  }
  const userSnap = await getDoc(doc(db, 'users', sid));
  if (!userSnap.exists()) {
    throw new Error('Öğrenci bulunamadı.');
  }
  const institutionId = String(userSnap.data()?.institutionId ?? '').trim();
  if (!institutionId) {
    throw new Error('Kurum bilgisi bulunamadı.');
  }
  const previousCredit = Number(userSnap.data()?.makeupCredit ?? 0) || 0;

  const [cancelSnap, approvedMakeupSnap, pendingSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, LESSON_CANCELLATIONS_COLLECTION),
        where('institutionId', '==', institutionId),
        where('studentId', '==', sid),
      ),
    ),
    getDocs(
      query(
        collection(db, 'makeupLessonRequests'),
        where('institutionId', '==', institutionId),
        where('studentId', '==', sid),
        where('status', '==', 'approved'),
      ),
    ),
    getDocs(
      query(
        collection(db, 'makeupLessonRequests'),
        where('institutionId', '==', institutionId),
        where('studentId', '==', sid),
        where('status', '==', 'pending'),
      ),
    ),
  ]);

  const cancellationCount = cancelSnap.docs.filter((d) =>
    isEffectiveCancellationStatus(d.data()?.status),
  ).length;
  const approvedMakeupCount = approvedMakeupSnap.size;
  const pendingReservedCount = pendingSnap.docs.filter((d) => {
    const x = d.data();
    return x.creditReserved === true && x.creditReturned !== true;
  }).length;
  const newCredit = Math.max(0, cancellationCount - approvedMakeupCount - pendingReservedCount);

  await updateDoc(doc(db, 'users', sid), { makeupCredit: newCredit });
  return {
    cancellationCount,
    approvedMakeupCount,
    previousCredit,
    newCredit,
    creditIncreased: newCredit > previousCredit,
  };
}
