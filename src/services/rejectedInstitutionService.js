import { auth, db } from '../firebase/firebaseConfig';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { REJECTED_INSTITUTIONS_COLLECTION } from '../constants/rejectedInstitutionCollection';
import {
  REJECTION_REASON,
  getRejectionReasonLabel,
  normalizeRejectionReason,
} from '../constants/rejectionReasons';
import { auditLogger } from './auditLogger';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';

function mapRejectedInstitutionDoc(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    institutionName: String(data.institutionName ?? ''),
    contactPerson: String(data.contactPerson ?? ''),
    phone: String(data.phone ?? ''),
    email: String(data.email ?? ''),
    reason: normalizeRejectionReason(data.reason),
    customReason: String(data.customReason ?? ''),
    notes: String(data.notes ?? ''),
    recontact: data.recontact === true,
    rejectedAt: data.rejectedAt ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    deleted: data.deleted === true,
    deletedAt: data.deletedAt ?? null,
    deletedBy: data.deletedBy ?? null,
    createdBy: data.createdBy ?? null,
    createdByName: String(data.createdByName ?? ''),
  };
}

function toAuditSnapshot(record) {
  if (!record) return null;
  return {
    institutionName: record.institutionName,
    contactPerson: record.contactPerson,
    phone: record.phone,
    email: record.email,
    reason: record.reason,
    customReason: record.customReason,
    notes: record.notes,
    recontact: record.recontact,
  };
}

/** @returns {Promise<import('../types/rejectedInstitution').RejectedInstitutionRecord[]>} */
export async function listRejectedInstitutions() {
  const snap = await getDocs(collection(db, REJECTED_INSTITUTIONS_COLLECTION));
  return snap.docs
    .map(mapRejectedInstitutionDoc)
    .filter((row) => !row.deleted)
    .sort((a, b) => (b.rejectedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0)
      - (a.rejectedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0));
}

/** @param {string} recordId */
export async function getRejectedInstitutionById(recordId) {
  const id = String(recordId ?? '').trim();
  if (!id) return null;
  const snap = await getDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id));
  if (!snap.exists()) return null;
  const row = mapRejectedInstitutionDoc(snap);
  return row.deleted ? null : row;
}

/** @param {import('../types/rejectedInstitution').RejectedInstitutionWriteInput} input */
export async function createRejectedInstitution(input) {
  const institutionName = String(input.institutionName ?? '').trim();
  const phone = String(input.phone ?? '').trim();
  if (!institutionName) {
    throw new Error('Kurum adı zorunludur.');
  }
  if (!phone) {
    throw new Error('Telefon numarası zorunludur.');
  }

  const reason = normalizeRejectionReason(input.reason);
  const customReason =
    reason === REJECTION_REASON.OTHER ? String(input.customReason ?? '').trim() : '';
  const rejectedAt = input.rejectedAt instanceof Date
    ? Timestamp.fromDate(input.rejectedAt)
    : Timestamp.fromDate(new Date());

  const payload = {
    institutionName,
    contactPerson: String(input.contactPerson ?? '').trim(),
    phone,
    email: String(input.email ?? '').trim(),
    reason,
    customReason,
    notes: String(input.notes ?? '').trim(),
    recontact: input.recontact === true,
    rejectedAt,
    deleted: false,
    deletedAt: null,
    deletedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: auth.currentUser?.uid ?? null,
    createdByName: String(auth.currentUser?.displayName ?? 'SuperAdmin'),
  };

  const ref = await addDoc(collection(db, REJECTED_INSTITUTIONS_COLLECTION), payload);
  const saved = await getDoc(ref);
  const record = mapRejectedInstitutionDoc(saved);

  auditLogger.log({
    action: AUDIT_ACTIONS.REJECTED_INSTITUTION_CREATED,
    module: AUDIT_MODULES.REJECTED_INSTITUTION,
    institutionName: record.institutionName,
    description: `${record.institutionName} red veren kurumlar listesine eklendi.`,
    newData: { rejectedInstitutionId: record.id, ...toAuditSnapshot(record) },
  });

  return record;
}

/** @param {string} recordId @param {import('../types/rejectedInstitution').RejectedInstitutionWriteInput} input */
export async function updateRejectedInstitution(recordId, input) {
  const id = String(recordId ?? '').trim();
  if (!id) throw new Error('Kayıt kimliği gerekli.');

  const previousSnap = await getDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id));
  if (!previousSnap.exists()) {
    throw new Error('Kayıt bulunamadı.');
  }
  const previous = mapRejectedInstitutionDoc(previousSnap);
  if (previous.deleted) {
    throw new Error('Silinmiş kayıt güncellenemez.');
  }

  const institutionName = String(input.institutionName ?? previous.institutionName).trim();
  const phone = String(input.phone ?? previous.phone).trim();
  if (!institutionName) throw new Error('Kurum adı zorunludur.');
  if (!phone) throw new Error('Telefon numarası zorunludur.');

  const reason = normalizeRejectionReason(input.reason ?? previous.reason);
  const customReason =
    reason === REJECTION_REASON.OTHER
      ? String(input.customReason ?? previous.customReason ?? '').trim()
      : '';

  const payload = {
    institutionName,
    contactPerson: String(input.contactPerson ?? previous.contactPerson).trim(),
    phone,
    email: String(input.email ?? previous.email).trim(),
    reason,
    customReason,
    notes: String(input.notes ?? previous.notes).trim(),
    recontact: input.recontact != null ? input.recontact === true : previous.recontact,
    updatedAt: serverTimestamp(),
  };

  if (input.rejectedAt instanceof Date) {
    payload.rejectedAt = Timestamp.fromDate(input.rejectedAt);
  }

  await updateDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id), payload);

  const saved = await getDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id));
  const record = mapRejectedInstitutionDoc(saved);

  auditLogger.log({
    action: AUDIT_ACTIONS.REJECTED_INSTITUTION_UPDATED,
    module: AUDIT_MODULES.REJECTED_INSTITUTION,
    institutionName: record.institutionName,
    description: `${record.institutionName} red veren kurum kaydı güncellendi.`,
    oldData: toAuditSnapshot(previous),
    newData: toAuditSnapshot(record),
  });

  return record;
}

/** @param {string} recordId */
export async function softDeleteRejectedInstitution(recordId) {
  const id = String(recordId ?? '').trim();
  if (!id) throw new Error('Kayıt kimliği gerekli.');

  const previousSnap = await getDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id));
  if (!previousSnap.exists()) {
    throw new Error('Kayıt bulunamadı.');
  }
  const previous = mapRejectedInstitutionDoc(previousSnap);
  if (previous.deleted) {
    return previous;
  }

  await updateDoc(doc(db, REJECTED_INSTITUTIONS_COLLECTION, id), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid ?? null,
    updatedAt: serverTimestamp(),
  });

  auditLogger.log({
    action: AUDIT_ACTIONS.REJECTED_INSTITUTION_DELETED,
    module: AUDIT_MODULES.REJECTED_INSTITUTION,
    institutionName: previous.institutionName,
    description: `${previous.institutionName} red veren kurum kaydı silindi.`,
    oldData: { rejectedInstitutionId: previous.id, ...toAuditSnapshot(previous) },
  });

  return previous;
}

/** @param {import('../types/rejectedInstitution').RejectedInstitutionRecord[]} rows @param {Date} [now] */
export function computeRejectedInstitutionStats(rows, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  monthStart.setHours(0, 0, 0, 0);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const addedThisMonth = rows.filter((row) => {
    const created = row.createdAt?.toDate?.() ?? row.rejectedAt?.toDate?.();
    return created && created >= monthStart && created <= monthEnd;
  }).length;

  const reasonCounts = rows.reduce((acc, row) => {
    const label = getRejectionReasonLabel(row.reason, row.customReason);
    acc[label] = (acc[label] ?? 0) + 1;
    return acc;
  }, {});

  const mostCommonReason =
    Object.entries(reasonCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';

  const recontactOpen = rows.filter((row) => row.recontact).length;

  return {
    total: rows.length,
    addedThisMonth,
    mostCommonReason,
    recontactOpen,
  };
}
