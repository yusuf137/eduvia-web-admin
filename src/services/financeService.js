import { auth, db } from '../firebase/firebaseConfig';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { currentMonthKey } from './receiptService';

export const INCOME_CATEGORIES = ['Kurs Geliri', 'Ek Gelir', 'Sponsor', 'Diğer'];
export const EXPENSE_CATEGORIES = ['Kira', 'Maaş', 'Fatura', 'Malzeme', 'Diğer'];

export function monthDateBounds(monthKey) {
  const parts = String(monthKey).split('-');
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || mo < 1 || mo > 12) {
    return { start: '1970-01-01', end: '1970-01-31' };
  }
  const last = new Date(y, mo, 0).getDate();
  return {
    start: `${String(y)}-${String(mo).padStart(2, '0')}-01`,
    end: `${String(y)}-${String(mo).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
  };
}

export function addMonths(monthKey, delta) {
  const [y, m] = String(monthKey).split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthTitleTr(monthKey) {
  const [y, m] = String(monthKey).split('-').map(Number);
  if (!y || !m) {
    return monthKey;
  }
  const label = new Date(y, m - 1, 1).toLocaleString('tr-TR', {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function balanceRef(institutionId) {
  return doc(db, 'financeSettings', String(institutionId).trim());
}

function mapIncomeDoc(d) {
  const data = d.data();
  const dateStr = String(data.date ?? '').slice(0, 10);
  let sortMs = 0;
  if (dateStr.length === 10) {
    const [yy, mm, dd] = dateStr.split('-').map(Number);
    sortMs = new Date(yy, (mm || 1) - 1, dd || 1).getTime();
  }
  return {
    id: d.id,
    kind: 'income_manual',
    title: String(data.title ?? '').trim() || '(Başlıksız)',
    category: String(data.category ?? ''),
    amount: Number(data.amount) || 0,
    dateLabel: dateStr || '—',
    createdByName: String(data.createdByName ?? ''),
    sortMs,
  };
}

function mapExpenseDoc(d) {
  const data = d.data();
  const dateStr = String(data.date ?? '').slice(0, 10);
  let sortMs = 0;
  if (dateStr.length === 10) {
    const [yy, mm, dd] = dateStr.split('-').map(Number);
    sortMs = new Date(yy, (mm || 1) - 1, dd || 1).getTime();
  }
  return {
    id: d.id,
    kind: 'expense',
    title: String(data.title ?? '').trim() || '(Başlıksız)',
    category: String(data.category ?? ''),
    amount: Number(data.amount) || 0,
    dateLabel: dateStr || '—',
    createdByName: String(data.createdByName ?? ''),
    sortMs,
  };
}

export async function fetchBalance(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return { currentBalance: 0, lastManualUpdateAt: null, lastManualUpdateBy: null };
  }
  try {
    const snap = await getDoc(balanceRef(inst));
    if (!snap.exists()) {
      return { currentBalance: 0, lastManualUpdateAt: null, lastManualUpdateBy: null };
    }
    const data = snap.data();
    return {
      currentBalance: Number(data.currentBalance ?? 0) || 0,
      lastManualUpdateAt: data.lastManualUpdateAt ?? null,
      lastManualUpdateBy: data.lastManualUpdateBy ?? null,
      updatedAt: data.updatedAt ?? null,
    };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BALANCE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchIncomes(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'incomes'), where('institutionId', '==', inst)),
    );
    const rows = snap.docs.map(mapIncomeDoc);
    rows.sort((a, b) => b.sortMs - a.sortMs);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INCOMES LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export async function fetchExpenses(institutionId) {
  const inst = String(institutionId ?? '').trim();
  if (!inst) {
    return [];
  }
  try {
    const snap = await getDocs(
      query(collection(db, 'expenses'), where('institutionId', '==', inst)),
    );
    const rows = snap.docs.map(mapExpenseDoc);
    rows.sort((a, b) => b.sortMs - a.sortMs);
    return rows;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB EXPENSES LOAD ERROR:', error.code, error.message);
    throw error;
  }
}

export function filterPaymentsByMonth(payments, monthKey) {
  const mk = String(monthKey).slice(0, 7);
  return (payments || []).filter((p) => String(p.month ?? '').slice(0, 7) === mk);
}

export function filterIncomesByMonth(incomes, monthKey) {
  const { start, end } = monthDateBounds(monthKey);
  return (incomes || []).filter((row) => {
    const d = String(row.dateLabel ?? '').slice(0, 10);
    return d.length === 10 && d >= start && d <= end;
  });
}

export function filterExpensesByMonth(expenses, monthKey) {
  const { start, end } = monthDateBounds(monthKey);
  return (expenses || []).filter((row) => {
    const d = String(row.dateLabel ?? '').slice(0, 10);
    return d.length === 10 && d >= start && d <= end;
  });
}

export async function addIncome({
  title,
  amount,
  category,
  date,
  institutionId,
  createdBy,
  createdByName,
}) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(createdBy ?? auth.currentUser?.uid ?? '').trim();
  const incomeData = {
    institutionId: inst,
    title: String(title ?? '').trim(),
    amount: Number(amount),
    category: String(category ?? '').trim(),
    date: String(date ?? '').trim(),
    createdBy: uid,
    createdByName: String(createdByName ?? '').trim(),
    createdAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB INCOME DATA:', incomeData);

  try {
    await runTransaction(db, async (transaction) => {
      const bRef = balanceRef(inst);
      const bSnap = await transaction.get(bRef);
      const current = bSnap.exists() ? Number(bSnap.data()?.currentBalance ?? 0) : 0;
      const incomeRef = doc(collection(db, 'incomes'));
      transaction.set(incomeRef, incomeData);
      transaction.set(
        bRef,
        { currentBalance: current + Number(amount), updatedAt: serverTimestamp() },
        { merge: true },
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB INCOME CREATE ERROR:', error.code, error.message);
    // eslint-disable-next-line no-console
    console.log('WEB BALANCE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function addExpense({
  title,
  amount,
  category,
  date,
  institutionId,
  createdBy,
  createdByName,
}) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(createdBy ?? auth.currentUser?.uid ?? '').trim();
  const expenseData = {
    institutionId: inst,
    title: String(title ?? '').trim(),
    amount: Number(amount),
    category: String(category ?? '').trim(),
    date: String(date ?? '').trim(),
    createdBy: uid,
    createdByName: String(createdByName ?? '').trim(),
    createdAt: serverTimestamp(),
  };

  // eslint-disable-next-line no-console
  console.log('WEB EXPENSE DATA:', expenseData);

  try {
    await runTransaction(db, async (transaction) => {
      const bRef = balanceRef(inst);
      const bSnap = await transaction.get(bRef);
      const current = bSnap.exists() ? Number(bSnap.data()?.currentBalance ?? 0) : 0;
      const expenseRef = doc(collection(db, 'expenses'));
      transaction.set(expenseRef, expenseData);
      transaction.set(
        bRef,
        { currentBalance: current - Number(amount), updatedAt: serverTimestamp() },
        { merge: true },
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB EXPENSE CREATE ERROR:', error.code, error.message);
    // eslint-disable-next-line no-console
    console.log('WEB BALANCE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export async function updateBalanceManually(currentBalance, institutionId, updatedBy) {
  const inst = String(institutionId ?? '').trim();
  const uid = String(updatedBy ?? auth.currentUser?.uid ?? '').trim();
  const n = Number(currentBalance);
  if (!Number.isFinite(n)) {
    throw new Error('Geçerli bakiye girin.');
  }

  // eslint-disable-next-line no-console
  console.log('BALANCE DOC ID:', inst);

  try {
    await runTransaction(db, async (transaction) => {
      const ref = balanceRef(inst);
      await transaction.get(ref);
      transaction.set(
        ref,
        {
          currentBalance: n,
          updatedAt: serverTimestamp(),
          lastManualUpdateAt: serverTimestamp(),
          lastManualUpdateBy: uid,
        },
        { merge: true },
      );
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('WEB BALANCE UPDATE ERROR:', error.code, error.message);
    throw error;
  }
}

export { currentMonthKey };
