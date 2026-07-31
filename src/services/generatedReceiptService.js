import { auth, db, storage } from '../firebase/firebaseConfig';
import { SUBSCRIPTION_PAYMENTS_COLLECTION } from '../constants/subscriptionPaymentCollection';
import {
  buildGeneratedReceiptStoragePath,
} from '../constants/paymentReceipt';
import { fetchInstitutionById } from './institutionService';
import { getSubscriptionPaymentById } from './subscriptionPaymentService';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';
import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

/** @param {string} institutionId */
async function fetchInstitutionAuthorizedPerson(institutionId) {
  const instId = String(institutionId ?? '').trim();
  if (!instId) {
    return '—';
  }

  try {
    const adminQuery = query(
      collection(db, 'users'),
      where('institutionId', '==', instId),
      where('role', '==', 'admin'),
      limit(1),
    );
    const adminSnap = await getDocs(adminQuery);
    if (!adminSnap.empty) {
      const data = adminSnap.docs[0].data();
      return String(data.name ?? data.displayName ?? data.email ?? '').trim() || '—';
    }

    const fallbackQuery = query(
      collection(db, 'users'),
      where('institutionId', '==', instId),
      where('role', '==', 'adminTeacher'),
      limit(1),
    );
    const fallbackSnap = await getDocs(fallbackQuery);
    if (!fallbackSnap.empty) {
      const data = fallbackSnap.docs[0].data();
      return String(data.name ?? data.displayName ?? data.email ?? '').trim() || '—';
    }
  } catch {
    // yetkili kişi zorunlu değil
  }

  return '—';
}

/**
 * @param {import('../types/subscriptionPayment').SubscriptionPaymentRecord} payment
 */
export async function generateAndSavePaymentReceiptPdf(payment) {
  if (!payment?.id) {
    throw new Error('Ödeme kaydı bulunamadı.');
  }
  if (payment.legacy) {
    throw new Error('Eski ödeme kayıtları için PDF makbuz oluşturulamaz.');
  }
  if (!payment.institutionId) {
    throw new Error('Kurum bilgisi eksik; makbuz oluşturulamadı.');
  }

  const institution = await fetchInstitutionById(payment.institutionId);
  const authorizedPerson = await fetchInstitutionAuthorizedPerson(payment.institutionId);
  const createdAt = new Date();
  const nextVersion = Number(payment.receiptVersion ?? 0) + 1;

  const { buildGeneratedReceiptFileName } = await import('../utils/paymentGeneratedReceiptPdf');
  const fileName = buildGeneratedReceiptFileName(
    institution?.name ?? payment.institutionName,
    createdAt,
  );
  const storageFileName = `v${nextVersion}_${fileName}`;

  const { buildPaymentReceiptPdfBlob, downloadPdfBlob } = await import(
    '../utils/paymentGeneratedReceiptPdf'
  );

  const pdfBlob = await buildPaymentReceiptPdfBlob({
    payment,
    institution,
    authorizedPerson,
    createdAt,
  });

  downloadPdfBlob(pdfBlob, fileName);

  const storagePath = buildGeneratedReceiptStoragePath(
    payment.institutionId,
    payment.id,
    storageFileName,
  );
  const fileRef = ref(storage, storagePath);

  await uploadBytes(fileRef, pdfBlob, {
    contentType: 'application/pdf',
    customMetadata: {
      paymentId: payment.id,
      institutionId: payment.institutionId,
      receiptVersion: String(nextVersion),
      generatedBy: auth.currentUser?.uid ?? '',
    },
  });

  const generatedReceiptUrl = await getDownloadURL(fileRef);

  await updateDoc(doc(db, SUBSCRIPTION_PAYMENTS_COLLECTION, payment.id), {
    generatedReceiptUrl,
    generatedReceiptCreatedAt: serverTimestamp(),
    generatedReceiptCreatedBy: auth.currentUser?.uid ?? null,
    receiptVersion: nextVersion,
    updatedAt: serverTimestamp(),
  });

  auditLogger.log({
    action: AUDIT_ACTIONS.RECEIPT_GENERATED,
    module: AUDIT_MODULES.RECEIPT,
    institutionId: payment.institutionId,
    institutionName: institution?.name ?? payment.institutionName,
    description: `${institution?.name ?? payment.institutionName} için PDF makbuz oluşturuldu (v${nextVersion}).`,
    newData: {
      paymentId: payment.id,
      paymentNumber: payment.paymentNumber,
      receiptVersion: nextVersion,
      fileName,
    },
  });

  return getSubscriptionPaymentById(payment.id);
}
