import { auth, db } from '../firebase/firebaseConfig';
import { addDoc, collection, getDocs, query, serverTimestamp, where } from 'firebase/firestore';

const HISTORY = 'subscriptionHistory';

function mapHistoryDoc(d) {
  const data = d.data();
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    oldStatus: data.oldStatus ?? null,
    newStatus: String(data.newStatus ?? ''),
    oldPackage: data.oldPackage ?? null,
    newPackage: data.newPackage ?? null,
    changedBy: data.changedBy ?? null,
    changedByName: String(data.changedByName ?? ''),
    reason: String(data.reason ?? ''),
    createdAt: data.createdAt ?? null,
  };
}

/**
 * @param {object} input
 * @param {string} input.institutionId
 * @param {string|null} [input.oldStatus]
 * @param {string|null} [input.newStatus]
 * @param {string|null} [input.oldPackage]
 * @param {string|null} [input.newPackage]
 * @param {string} [input.reason]
 */
export async function logSubscriptionHistory(input) {
  const institutionId = String(input.institutionId ?? '').trim();
  if (!institutionId) return;

  const oldStatus = input.oldStatus ?? null;
  const newStatus = input.newStatus ?? null;
  const oldPackage = input.oldPackage ?? null;
  const newPackage = input.newPackage ?? null;

  if (oldStatus === newStatus && oldPackage === newPackage) {
    return;
  }

  await addDoc(collection(db, HISTORY), {
    institutionId,
    oldStatus,
    newStatus,
    oldPackage,
    newPackage,
    changedBy: auth.currentUser?.uid ?? null,
    changedByName: String(auth.currentUser?.displayName ?? 'SuperAdmin'),
    reason: String(input.reason ?? ''),
    createdAt: serverTimestamp(),
  });
}

export async function listSubscriptionHistory(institutionId) {
  const id = String(institutionId ?? '').trim();
  if (!id) return [];
  const snap = await getDocs(
    query(collection(db, HISTORY), where('institutionId', '==', id)),
  );
  return snap.docs
    .map(mapHistoryDoc)
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
}
