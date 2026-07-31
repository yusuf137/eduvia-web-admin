import { auth, storage } from '../firebase/firebaseConfig';
import {
  buildReceiptStoragePath,
  buildUniqueReceiptFileName,
  validateReceiptFile,
} from '../constants/paymentReceipt';
import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { SUBSCRIPTION_PAYMENTS_COLLECTION } from '../constants/subscriptionPaymentCollection';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';
import {
  deleteObject,
  getDownloadURL,
  listAll,
  ref,
  uploadBytes,
} from 'firebase/storage';

async function clearReceiptFolder(institutionId, paymentId) {
  const folderRef = ref(storage, `payments/${institutionId}/${paymentId}/receipt`);
  try {
    const listing = await listAll(folderRef);
    await Promise.all(listing.items.map((item) => deleteObject(item)));
  } catch {
    // klasör yoksa sorun değil
  }
}

/**
 * @param {string} institutionId
 * @param {string} paymentId
 * @param {File} file
 */
export async function uploadPaymentReceipt(institutionId, paymentId, file) {
  const instId = String(institutionId ?? '').trim();
  const payId = String(paymentId ?? '').trim();
  if (!instId || !payId) {
    throw new Error('Makbuz yüklemek için ödeme kaydı gerekli.');
  }

  const validation = validateReceiptFile(file);
  if (!validation.ok) {
    throw new Error(validation.message);
  }

  await clearReceiptFolder(instId, payId);

  const storageFileName = buildUniqueReceiptFileName(file.name);
  const storagePath = buildReceiptStoragePath(instId, payId, storageFileName);
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, file, {
    contentType: file.type || undefined,
    customMetadata: {
      originalFileName: file.name,
      uploadedBy: auth.currentUser?.uid ?? '',
    },
  });

  const receiptUrl = await getDownloadURL(fileRef);

  await updateDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, payId), {
    receiptUrl,
    receiptFileName: file.name,
    receiptUploadedAt: serverTimestamp(),
    receiptUploadedBy: auth.currentUser?.uid ?? null,
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, payId));
  const paymentData = snap.exists() ? snap.data() : null;

  auditLogger.log({
    action: AUDIT_ACTIONS.RECEIPT_UPLOADED,
    module: AUDIT_MODULES.RECEIPT,
    institutionId: instId,
    institutionName: String(paymentData?.institutionName ?? ''),
    description: `${paymentData?.institutionName ?? 'Kurum'} için makbuz yüklendi (${file.name}).`,
    newData: {
      paymentId: payId,
      receiptFileName: file.name,
      paymentNumber: paymentData?.paymentNumber ?? null,
    },
  });

  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord} payment */
export async function removePaymentReceipt(payment) {
  if (!payment?.id || payment.legacy) {
    throw new Error('Bu ödeme için makbuz silinemez.');
  }
  if (!payment.receiptUrl) {
    return payment;
  }

  await clearReceiptFolder(payment.institutionId, payment.id);

  await updateDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, payment.id), {
    receiptUrl: null,
    receiptFileName: null,
    receiptUploadedAt: null,
    receiptUploadedBy: null,
    updatedAt: serverTimestamp(),
  });

  const snap = await getDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, payment.id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

/** @param {string} url @param {string} [fileName] */
export function downloadPaymentReceipt(url, fileName = 'makbuz') {
  const link = document.createElement('a');
  link.href = url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
