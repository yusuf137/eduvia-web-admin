import { auth, db } from '../firebase/firebaseConfig';
import { DEFAULT_PAYMENT_CURRENCY, normalizePaymentCurrency } from '../constants/paymentCurrency';
import { normalizePaymentMethod } from '../constants/paymentMethod';
import { PAYMENT_STATUS, normalizePaymentStatus } from '../constants/paymentStatus';
import { normalizePackageName } from '../constants/packageType';
import { fetchInstitutionById, listInstitutions } from './institutionService';
import { resolveInstitutionSubscription, persistSubscriptionFromPayment } from './subscriptionPaymentSync';
import { uploadPaymentReceipt } from './paymentReceiptService';
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

import { SUBSCRIPTION_PAYMENTS_COLLECTION, LEGACY_SUBSCRIPTION_PAYMENTS_COLLECTION } from '../constants/subscriptionPaymentCollection';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';

const LEGACY_PAYMENTS = LEGACY_SUBSCRIPTION_PAYMENTS_COLLECTION;

function mapTimestamp(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value?.toDate) return value;
  return null;
}

function padSequence(num) {
  return String(num).padStart(5, '0');
}

/** @param {Date} [date] */
export function buildPaymentNumber(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const suffix = String(Date.now()).slice(-5);
  return `EDV-${y}${m}-${suffix}`;
}

/** @param {string} docId @param {object} data @param {object} [options] */
function mapPaymentDoc(docId, data, options = {}) {
  const paymentDate = mapTimestamp(data.paymentDate);
  return {
    id: docId,
    paymentNumber: String(data.paymentNumber ?? docId.slice(0, 8).toUpperCase()),
    institutionId: String(data.institutionId ?? ''),
    institutionName: String(data.institutionName ?? ''),
    subscriptionId: String(data.subscriptionId ?? data.institutionId ?? ''),
    packageName: String(data.packageName ?? data.package ?? ''),
    amount: Number(data.amount ?? 0),
    currency: normalizePaymentCurrency(data.currency),
    paymentMethod: normalizePaymentMethod(data.paymentMethod ?? data.paymentType),
    status: normalizePaymentStatus(data.status ?? PAYMENT_STATUS.SUCCESS),
    paymentDate,
    nextPaymentDate: mapTimestamp(data.nextPaymentDate),
    transactionReference: data.transactionReference ?? null,
    description: String(data.description ?? ''),
    createdBy: data.createdBy ?? null,
    createdByName: String(data.createdByName ?? ''),
    createdAt: mapTimestamp(data.createdAt),
    updatedAt: mapTimestamp(data.updatedAt),
    receiptUrl: data.receiptUrl ?? null,
    receiptFileName: data.receiptFileName ?? null,
    receiptUploadedAt: mapTimestamp(data.receiptUploadedAt),
    receiptUploadedBy: data.receiptUploadedBy ?? null,
    generatedReceiptUrl: data.generatedReceiptUrl ?? null,
    generatedReceiptCreatedAt: mapTimestamp(data.generatedReceiptCreatedAt),
    generatedReceiptCreatedBy: data.generatedReceiptCreatedBy ?? null,
    receiptVersion: Number(data.receiptVersion ?? 0),
    deleted: data.deleted === true,
    deletedAt: mapTimestamp(data.deletedAt),
    deletedBy: data.deletedBy ?? null,
    legacy: options.legacy === true,
  };
}

/** @param {object} legacyData @param {string} docId */
function mapLegacyPaymentDoc(docId, legacyData) {
  return mapPaymentDoc(
    docId,
    {
      ...legacyData,
      paymentNumber: legacyData.paymentNumber ?? `LEG-${docId.slice(0, 8).toUpperCase()}`,
      status: legacyData.status ?? PAYMENT_STATUS.SUCCESS,
      paymentMethod: legacyData.paymentMethod ?? legacyData.paymentType,
      currency: legacyData.currency ?? DEFAULT_PAYMENT_CURRENCY,
    },
    { legacy: true },
  );
}

async function readLegacyPayments() {
  const snap = await getDocs(collection(db, LEGACY_PAYMENTS));
  return snap.docs.map((d) => mapLegacyPaymentDoc(d.id, d.data()));
}

/** @returns {Promise<import('../types/subscriptionPayment').SubscriptionPaymentRecord[]>} */
export async function listSubscriptionPaymentRecords() {
  const snap = await getDocs(collection(db, SUBSCRIPTION_PAYMENTS_COLLECTION));
  const current = snap.docs
    .map((d) => mapPaymentDoc(d.id, d.data()))
    .filter((row) => !row.deleted);

  const legacyIds = new Set(current.map((r) => r.id));
  const legacy = (await readLegacyPayments()).filter((row) => !legacyIds.has(row.id));

  return [...current, ...legacy].sort(
    (a, b) => (b.paymentDate?.toMillis?.() ?? 0) - (a.paymentDate?.toMillis?.() ?? 0),
  );
}

/** @param {string} paymentId */
export async function getSubscriptionPaymentById(paymentId) {
  const id = String(paymentId ?? '').trim();
  if (!id) return null;

  const snap = await getDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, id));
  if (snap.exists()) {
    const row = mapPaymentDoc(snap.id, snap.data());
    return row.deleted ? null : row;
  }

  const legacySnap = await getDoc(doc(db, LEGACY_PAYMENTS, id));
  if (legacySnap.exists()) {
    return mapLegacyPaymentDoc(legacySnap.id, legacySnap.data());
  }

  return null;
}

/**
 * @param {import('../types/subscriptionPayment').SubscriptionPaymentCreateInput} input
 */
export async function createSubscriptionPaymentRecord(input) {
  const institutionId = String(input.institutionId ?? '').trim();
  if (!institutionId) {
    throw new Error('Kurum seçimi gerekli.');
  }

  const institution = await fetchInstitutionById(institutionId);
  if (!institution) {
    throw new Error('Kurum bulunamadı.');
  }

  const subscription = resolveInstitutionSubscription(institution);
  const paymentDate = input.paymentDate instanceof Date ? input.paymentDate : new Date();
  const status = normalizePaymentStatus(input.status);
  const amount = Number(input.amount ?? 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('Geçerli tutar girin.');
  }

  const nextPaymentDate =
    input.nextPaymentDate instanceof Date
      ? Timestamp.fromDate(input.nextPaymentDate)
      : null;

  const payload = {
    paymentNumber: buildPaymentNumber(paymentDate),
    institutionId,
    institutionName: String(input.institutionName ?? institution.name ?? ''),
    subscriptionId: institutionId,
    packageName: normalizePackageName(input.packageName ?? subscription.packageName),
    amount,
    currency: normalizePaymentCurrency(input.currency),
    paymentMethod: normalizePaymentMethod(input.paymentMethod),
    status,
    paymentDate: Timestamp.fromDate(paymentDate),
    nextPaymentDate,
    transactionReference: input.transactionReference ? String(input.transactionReference).trim() : null,
    description: String(input.description ?? ''),
    createdBy: auth.currentUser?.uid ?? null,
    createdByName: String(auth.currentUser?.displayName ?? 'SuperAdmin'),
    deleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, SUBSCRIPTION_PAYMENTS_COLLECTION), payload);

  if (status === PAYMENT_STATUS.SUCCESS) {
    await persistSubscriptionFromPayment(institution, {
      paymentDate,
      nextPaymentDate: input.nextPaymentDate ?? null,
    });
  }

  if (input.receiptFile) {
    await uploadPaymentReceipt(institutionId, ref.id, input.receiptFile);
  }

  const created = await getSubscriptionPaymentById(ref.id);

  auditLogger.log({
    action: AUDIT_ACTIONS.PAYMENT_ADDED,
    module: AUDIT_MODULES.PAYMENT,
    institutionId,
    institutionName: created?.institutionName ?? institution.name,
    description: `${created?.institutionName ?? institution.name} için ödeme eklendi (${created?.paymentNumber ?? ''}).`,
    newData: {
      paymentNumber: created?.paymentNumber,
      amount: created?.amount,
      currency: created?.currency,
      packageName: created?.packageName,
      status: created?.status,
    },
  });

  return created;
}

/** @param {string} paymentId */
export async function softDeleteSubscriptionPayment(paymentId) {
  const id = String(paymentId ?? '').trim();
  if (!id) {
    throw new Error('Ödeme kimliği gerekli.');
  }

  const snap = await getDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, id));
  if (!snap.exists()) {
    throw new Error('Ödeme kaydı bulunamadı veya legacy kayıt silinemez.');
  }

  const payment = mapPaymentDoc(snap.id, snap.data());

  await updateDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, id), {
    deleted: true,
    deletedAt: serverTimestamp(),
    deletedBy: auth.currentUser?.uid ?? null,
    updatedAt: serverTimestamp(),
  });

  auditLogger.log({
    action: AUDIT_ACTIONS.PAYMENT_DELETED,
    module: AUDIT_MODULES.PAYMENT,
    institutionId: payment.institutionId,
    institutionName: payment.institutionName,
    description: `${payment.institutionName} için ${payment.paymentNumber} numaralı ödeme silindi.`,
    oldData: {
      paymentNumber: payment.paymentNumber,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    },
  });
}

/**
 * @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord[]} payments
 * @param {Date} [now]
 */
export function computePaymentHistoryStats(payments, now = new Date()) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const active = payments.filter((p) => !p.deleted);

  const collectedThisMonth = active
    .filter((p) => {
      if (p.status !== PAYMENT_STATUS.SUCCESS) return false;
      const date = p.paymentDate?.toDate?.();
      return date && date >= monthStart && date <= monthEnd;
    })
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const pendingTotal = active
    .filter((p) => p.status === PAYMENT_STATUS.PENDING)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const overdueTotal = active
    .filter((p) => {
      if (p.status !== PAYMENT_STATUS.PENDING) return false;
      const date = p.paymentDate?.toDate?.();
      return date && date.getTime() < now.getTime();
    })
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const totalCollected = active
    .filter((p) => p.status === PAYMENT_STATUS.SUCCESS)
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return { collectedThisMonth, pendingTotal, overdueTotal, totalCollected };
}

/** Kurum listesi — ödeme formu için */
export async function listInstitutionsForPaymentForm() {
  const rows = await listInstitutions();
  return rows.map((inst) => ({
    id: inst.id,
    name: inst.name,
    subscription: inst.subscription ?? null,
    packageName: inst.subscription?.packageName ?? inst.plan,
  }));
}

export { padSequence };
