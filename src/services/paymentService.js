import { auth, db } from '../firebase/firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  currentMonthKey,
  formatReceiptNo,
  receiptCounterDocId,
  receiptCounterPeriodFromMonth,
} from './receiptService';

export { currentMonthKey } from './receiptService';

const PAYMENT_REMINDER_TITLE = 'Ödeme Hatırlatması';
const PAYMENT_REMINDER_MESSAGE =
  'Bu ayki ödemeniz henüz alınmamıştır. Lütfen kurum ile iletişime geçiniz.';

function mapPaymentDoc(d) {
  const data = d.data();
  const dateVal = data.date;
  let sortMs = 0;
  let dateLabel = '—';
  if (dateVal?.toDate) {
    sortMs = dateVal.toMillis();
    dateLabel = dateVal.toDate().toLocaleString('tr-TR');
  }
  return {
    id: d.id,
    institutionId: String(data.institutionId ?? ''),
    studentId: String(data.studentId ?? ''),
    studentName: String(data.studentName ?? '').trim() || '(İsimsiz)',
    amount: Number(data.amount) || 0,
    month: String(data.month ?? ''),
    receiptNo: String(data.receiptNo ?? ''),
    receivedBy: String(data.receivedBy ?? ''),
    receivedByName: String(data.receivedByName ?? ''),
    date: dateVal ?? null,
    createdAt: data.createdAt ?? null,
    dateLabel,
    sortMs,
  };
}

export async function fetchPayments(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'payments'), where('institutionId', '==', inst)),
    );
    const rows = snap.docs.map(mapPaymentDoc);
    rows.sort((a, b) => b.sortMs - a.sortMs);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB PAYMENTS LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export function getPaidStudentIdsForMonth(payments, monthKey) {
  const mk = String(monthKey).slice(0, 7);
  const set = new Set();
  (payments || []).forEach((p) => {
    if (String(p.month ?? '').slice(0, 7) === mk && p.studentId) {
      set.add(p.studentId);
    }
  });
  return set;
}

export async function createPaymentReminderNotification(studentId, institutionId) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(studentId ?? '').trim();
  if (!inst || !uid) {
    throw new Error('Bildirim için kurum ve öğrenci zorunludur.');
  }

  const notificationData = {
    institutionId: inst,
    userId: uid,
    title: PAYMENT_REMINDER_TITLE,
    message: PAYMENT_REMINDER_MESSAGE,
    type: 'payment_reminder',
    createdAt: serverTimestamp(),
    read: false,
  };

  try {
    await addDoc(collection(db, 'notifications'), notificationData);
    return { ok: true };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB PAYMENT NOTIFICATION ERROR:', error.code, error.message);
    throw error;
  }
}

/**
 * Ödeme kaydı + makbuz sayacı + bakiye (transaction).
 */
export async function recordStudentPayment({
  studentId,
  studentName,
  amount,
  adminUid,
  institutionId,
  adminName = '',
  monthKey = null,
}) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(adminUid ?? auth.currentUser?.uid ?? '').trim();
  const amt = Number(amount);
  if (!inst || !uid) {
    throw new Error('Oturum veya kurum bilgisi eksik.');
  }
  if (!studentId || !Number.isFinite(amt) || amt <= 0) {
    throw new Error('Geçerli tutar ve öğrenci seçin.');
  }

  const mk = monthKey || currentMonthKey();
  const period = receiptCounterPeriodFromMonth(mk);
  const counterId = receiptCounterDocId(inst, mk);
  const counterRef = doc(db, 'receiptCounters', counterId);
  const balanceRef = doc(db, 'financeSettings', inst);
  const paymentRef = doc(collection(db, 'payments'));
  const studentRef = doc(db, 'users', studentId);
  const adminRef = doc(db, 'users', uid);

  // eslint-disable-next-line no-console
  console.log('WEB PAYMENT PROFILE:', { institutionId: inst, adminUid: uid });
  // eslint-disable-next-line no-console
  console.log('PAYMENT institutionId:', inst);
  // eslint-disable-next-line no-console
  console.log('BALANCE DOC ID:', inst);
  // eslint-disable-next-line no-console
  console.log('RECEIPT COUNTER ID:', counterId);

  let receiptNo = '';
  let receivedByName = String(adminName ?? '').trim() || '—';

  try {
    await runTransaction(db, async (transaction) => {
      const studentSnap = await transaction.get(studentRef);
      if (!studentSnap.exists()) {
        throw new Error('Öğrenci bulunamadı.');
      }
      if (studentSnap.data()?.role !== 'student') {
        throw new Error('Seçilen kullanıcı öğrenci değil.');
      }
      if (String(studentSnap.data()?.institutionId ?? '') !== inst) {
        throw new Error('Bu öğrenci bu kuruma ait değil.');
      }

      const adminSnap = await transaction.get(adminRef);
      receivedByName =
        String(adminName ?? '').trim() ||
        String(adminSnap.data()?.name ?? '').trim() ||
        '—';

      const counterSnap = await transaction.get(counterRef);
      const balanceSnap = await transaction.get(balanceRef);

      let yeniSeq = 1;
      if (counterSnap.exists()) {
        const lastSeq = Math.floor(Number(counterSnap.data()?.lastSeq ?? 0));
        yeniSeq = lastSeq + 1;
        transaction.update(counterRef, {
          institutionId: inst,
          period,
          lastSeq: yeniSeq,
        });
      } else {
        transaction.set(counterRef, {
          institutionId: inst,
          period,
          lastSeq: 1,
        });
      }

      receiptNo = formatReceiptNo(period, yeniSeq);
      const currentBalance = balanceSnap.exists()
        ? Number(balanceSnap.data()?.currentBalance ?? 0)
        : 0;

      const paymentData = {
        institutionId: inst,
        studentId,
        studentName: String(studentName ?? '').trim() || '(İsimsiz)',
        amount: amt,
        month: mk,
        date: serverTimestamp(),
        receivedBy: uid,
        receivedByName,
        receiptNo,
        createdAt: serverTimestamp(),
      };

      // eslint-disable-next-line no-console
      console.log('WEB PAYMENT DATA:', paymentData);
      // eslint-disable-next-line no-console
      console.log('WEB PAYMENT DATA KEYS:', Object.keys(paymentData));

      transaction.set(paymentRef, paymentData);
      transaction.set(
        balanceRef,
        {
          currentBalance: currentBalance + amt,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB RECEIPT COUNTER ERROR:', error.code, error.message);
    // eslint-disable-next-line no-console
    console.log('WEB PAYMENT CREATE ERROR:', error.code, error.message);
    // eslint-disable-next-line no-console
    console.log('WEB BALANCE UPDATE ERROR:', error.code, error.message);
    throw error;
  }

  const paidAtLabel = new Date().toLocaleString('tr-TR');
  return {
    paymentId: paymentRef.id,
    institutionId: inst,
    studentId,
    receiptNo,
    amount: amt,
    month: mk,
    studentName: String(studentName ?? '').trim(),
    receivedByName: String(adminName ?? '').trim(),
    paidAtLabel,
    date: new Date(),
  };
}
