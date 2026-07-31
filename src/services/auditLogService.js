import { auth, db } from '../firebase/firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  detectBrowserName,
  detectDeviceType,
  resolveClientIpAddress,
  sanitizeAuditData,
} from '../utils/auditLogHelpers';

export const AUDIT_LOGS_COLLECTION = 'auditLogs';
export const AUDIT_LOG_PAGE_SIZE = 25;
export const INSTITUTION_TIMELINE_PAGE_SIZE = 30;

function mapAuditLogDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    action: String(data.action ?? ''),
    module: String(data.module ?? ''),
    institutionId: data.institutionId ?? null,
    institutionName: data.institutionName ?? null,
    performedBy: String(data.performedBy ?? ''),
    performedByUid: data.performedByUid ?? null,
    performedByEmail: data.performedByEmail ?? null,
    description: String(data.description ?? ''),
    oldData: data.oldData ?? null,
    newData: data.newData ?? null,
    createdAt: data.createdAt ?? null,
    ipAddress: data.ipAddress ?? null,
    device: data.device ?? null,
    browser: data.browser ?? null,
    deleted: data.deleted === true,
    deletedAt: data.deletedAt ?? null,
    deletedBy: data.deletedBy ?? null,
  };
}

async function resolveActorProfile(uid) {
  const id = String(uid ?? '').trim();
  if (!id) return null;
  const snap = await getDoc(doc(db, 'users', id));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    name: String(data.name ?? '').trim(),
    email: String(data.email ?? '').trim(),
  };
}

/**
 * @param {import('../types/auditLog').AuditLogWriteInput} input
 */
export async function writeAuditLogRecord(input) {
  const user = auth.currentUser;
  const ipAddress = await resolveClientIpAddress();
  const profile = user?.uid ? await resolveActorProfile(user.uid) : null;

  await addDoc(collection(db, AUDIT_LOGS_COLLECTION), {
    action: String(input.action ?? ''),
    module: String(input.module ?? ''),
    institutionId: input.institutionId ? String(input.institutionId) : null,
    institutionName: input.institutionName ? String(input.institutionName) : null,
    performedBy: String(profile?.name || user?.displayName || user?.email || 'SuperAdmin'),
    performedByUid: user?.uid ?? null,
    performedByEmail: profile?.email || user?.email || null,
    description: String(input.description ?? ''),
    oldData: sanitizeAuditData(input.oldData ?? null),
    newData: sanitizeAuditData(input.newData ?? null),
    createdAt: serverTimestamp(),
    ipAddress,
    device: detectDeviceType(),
    browser: detectBrowserName(),
    deleted: false,
  });
}

/**
 * @param {object} [options]
 * @param {number} [options.pageSize]
 * @param {import('firebase/firestore').QueryDocumentSnapshot|null} [options.cursor]
 * @param {string|null} [options.institutionId]
 */
export async function listAuditLogsPage({
  pageSize = AUDIT_LOG_PAGE_SIZE,
  cursor = null,
  institutionId = null,
} = {}) {
  /** @type {import('firebase/firestore').QueryConstraint[]} */
  const constraints = [where('deleted', '==', false)];

  if (institutionId) {
    constraints.push(where('institutionId', '==', String(institutionId)));
  }

  constraints.push(orderBy('createdAt', 'desc'));
  constraints.push(limit(pageSize));

  let q = query(collection(db, AUDIT_LOGS_COLLECTION), ...constraints);
  if (cursor) {
    q = query(q, startAfter(cursor));
  }

  const snap = await getDocs(q);
  const rows = snap.docs.map(mapAuditLogDoc);
  const nextCursor = snap.docs.length === pageSize ? snap.docs[snap.docs.length - 1] : null;
  return { rows, nextCursor, hasMore: snap.docs.length === pageSize };
}

/** @param {string} institutionId @param {number} [limitCount] */
export async function listInstitutionAuditLogs(institutionId, limitCount = 20) {
  const page = await listInstitutionAuditLogsPage({
    institutionId,
    pageSize: limitCount,
  });
  return page.rows;
}

/**
 * @param {object} options
 * @param {string} options.institutionId
 * @param {number} [options.pageSize]
 * @param {import('firebase/firestore').QueryDocumentSnapshot|null} [options.cursor]
 */
export async function listInstitutionAuditLogsPage({
  institutionId,
  pageSize = INSTITUTION_TIMELINE_PAGE_SIZE,
  cursor = null,
}) {
  return listAuditLogsPage({
    institutionId,
    pageSize,
    cursor,
  });
}

/** @param {number} [limitCount] */
export async function listRecentAuditLogs(limitCount = 10) {
  const snap = await getDocs(
    query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('deleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(limitCount),
    ),
  );
  return snap.docs.map(mapAuditLogDoc);
}

/** @returns {Promise<import('../types/auditLog').AuditLogStats>} */
export async function computeAuditLogStats() {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const snap = await getDocs(
    query(
      collection(db, AUDIT_LOGS_COLLECTION),
      where('deleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(500),
    ),
  );

  const rows = snap.docs.map(mapAuditLogDoc);
  const todayMs = todayStart.getTime();
  const weekMs = sevenDaysAgo.getTime();

  let todayCount = 0;
  let last7DaysCount = 0;
  /** @type {Record<string, number>} */
  const adminCounts = {};

  rows.forEach((row) => {
    const ms = row.createdAt?.toMillis?.() ?? 0;
    if (ms >= todayMs) todayCount += 1;
    if (ms >= weekMs) {
      last7DaysCount += 1;
      const key = row.performedBy || 'Sistem';
      adminCounts[key] = (adminCounts[key] ?? 0) + 1;
    }
  });

  const mostActiveAdmin =
    Object.entries(adminCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  return {
    todayCount,
    last7DaysCount,
    mostActiveAdmin,
    lastActionAt: rows[0]?.createdAt ?? null,
  };
}

/** @param {string} logId */
export async function softDeleteAuditLog(logId) {
  const id = String(logId ?? '').trim();
  if (!id) throw new Error('Log kimliği gerekli.');

  await updateDoc(doc(db, AUDIT_LOGS_COLLECTION, id), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid ?? null,
  });
}

/** @param {string} logId */
export async function getAuditLogById(logId) {
  const id = String(logId ?? '').trim();
  if (!id) return null;
  const snap = await getDoc(doc(db, AUDIT_LOGS_COLLECTION, id));
  if (!snap.exists()) return null;
  const row = mapAuditLogDoc(snap);
  return row.deleted ? null : row;
}
