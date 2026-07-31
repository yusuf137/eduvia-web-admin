import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscriptionActionGuard } from '../../contexts/SubscriptionActionGuardContext';
import { auth } from '../../firebase/firebaseConfig';
import { fetchPayments } from '../../services/paymentService';
import { filterPaymentsByMonth } from '../../services/financeService';
import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  currentMonthKey,
  addMonths,
  monthTitleTr,
  fetchBalance,
  fetchIncomes,
  fetchExpenses,
  filterIncomesByMonth,
  filterExpensesByMonth,
  addIncome,
  addExpense,
  updateBalanceManually,
} from '../../services/financeService';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export default function FinancePage() {
  const { currentUserProfile } = useAuth();
  const { ensureAllowed, resolveActionError } = useSubscriptionActionGuard();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const adminUid = auth.currentUser?.uid ?? '';

  const [monthKey, setMonthKey] = useState(() => currentMonthKey());
  const [payments, setPayments] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [balance, setBalance] = useState({ currentBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('summary');

  const [incomeTitle, setIncomeTitle] = useState('');
  const [incomeCategory, setIncomeCategory] = useState(INCOME_CATEGORIES[0]);
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeDate, setIncomeDate] = useState(() => `${currentMonthKey()}-01`);
  const [savingIncome, setSavingIncome] = useState(false);

  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [expAmount, setExpAmount] = useState('');
  const [expDate, setExpDate] = useState(() => `${currentMonthKey()}-01`);
  const [savingExpense, setSavingExpense] = useState(false);

  const [manualBalance, setManualBalance] = useState('0');
  const [savingBalance, setSavingBalance] = useState(false);

  const loadAll = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB PAYMENT PROFILE:', currentUserProfile);
    setLoading(true);
    setError('');
    try {
      const [payRows, incRows, expRows, bal] = await Promise.all([
        fetchPayments(institutionId),
        fetchIncomes(institutionId),
        fetchExpenses(institutionId),
        fetchBalance(institutionId),
      ]);
      setPayments(payRows);
      setIncomes(incRows);
      setExpenses(expRows);
      setBalance(bal);
      setManualBalance(String(bal.currentBalance ?? 0));
    } catch (e) {
      setError(e?.message ?? 'Finans verileri yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  useEffect(() => {
    setIncomeDate(`${monthKey}-01`);
    setExpDate(`${monthKey}-01`);
  }, [monthKey]);

  const monthPayments = useMemo(
    () => filterPaymentsByMonth(payments, monthKey),
    [payments, monthKey],
  );
  const monthIncomes = useMemo(
    () => filterIncomesByMonth(incomes, monthKey),
    [incomes, monthKey],
  );
  const monthExpenses = useMemo(
    () => filterExpensesByMonth(expenses, monthKey),
    [expenses, monthKey],
  );

  const paymentIncomeTotal = useMemo(
    () => monthPayments.reduce((s, r) => s + r.amount, 0),
    [monthPayments],
  );
  const manualIncomeTotal = useMemo(
    () => monthIncomes.reduce((s, r) => s + r.amount, 0),
    [monthIncomes],
  );
  const totalIncome = paymentIncomeTotal + manualIncomeTotal;
  const totalExpense = useMemo(
    () => monthExpenses.reduce((s, r) => s + r.amount, 0),
    [monthExpenses],
  );

  const incomeRows = useMemo(
    () => [
      ...monthPayments.map((p) => ({
        key: `p-${p.id}`,
        category: 'Öğrenci Ödemesi',
        title: p.studentName,
        detail: `Makbuz: ${p.receiptNo}`,
        amount: p.amount,
        date: p.dateLabel,
      })),
      ...monthIncomes.map((i) => ({
        key: `i-${i.id}`,
        category: i.category,
        title: i.title,
        detail: i.createdByName || '—',
        amount: i.amount,
        date: i.dateLabel,
      })),
    ],
    [monthPayments, monthIncomes],
  );

  const onAddIncome = async (e) => {
    e.preventDefault();
    if (!ensureAllowed()) {
      return;
    }
    setSavingIncome(true);
    setError('');
    setSuccess('');
    try {
      await addIncome({
        title: incomeTitle,
        amount: Number(String(incomeAmount).replace(',', '.')),
        category: incomeCategory,
        date: incomeDate,
        institutionId,
        createdBy: adminUid,
        createdByName: currentUserProfile?.name ?? '',
      });
      setSuccess('Gelir kaydedildi.');
      setIncomeTitle('');
      setIncomeAmount('');
      await loadAll();
    } catch (err) {
      const msg = resolveActionError(err, 'Gelir eklenemedi.');
      if (msg) setError(msg);
    } finally {
      setSavingIncome(false);
    }
  };

  const onAddExpense = async (e) => {
    e.preventDefault();
    if (!ensureAllowed()) {
      return;
    }
    setSavingExpense(true);
    setError('');
    setSuccess('');
    try {
      await addExpense({
        title: expTitle,
        amount: Number(String(expAmount).replace(',', '.')),
        category: expCategory,
        date: expDate,
        institutionId,
        createdBy: adminUid,
        createdByName: currentUserProfile?.name ?? '',
      });
      setSuccess('Gider kaydedildi.');
      setExpTitle('');
      setExpAmount('');
      await loadAll();
    } catch (err) {
      const msg = resolveActionError(err, 'Gider eklenemedi.');
      if (msg) setError(msg);
    } finally {
      setSavingExpense(false);
    }
  };

  const onSaveBalance = async (e) => {
    e.preventDefault();
    if (!ensureAllowed()) {
      return;
    }
    setSavingBalance(true);
    setError('');
    setSuccess('');
    try {
      await updateBalanceManually(
        Number(String(manualBalance).replace(',', '.')),
        institutionId,
        adminUid,
      );
      setSuccess('Bakiye güncellendi.');
      await loadAll();
    } catch (err) {
      const msg = resolveActionError(err, 'Bakiye güncellenemedi.');
      if (msg) setError(msg);
    } finally {
      setSavingBalance(false);
    }
  };

  return (
    <div className="page-stack finance-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Finans</h2>
          <p className="muted">{monthTitleTr(monthKey)}</p>
        </div>
        <div className="weekly-week-nav">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setMonthKey((m) => addMonths(m, -1))}>
            ‹ Önceki ay
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setMonthKey(currentMonthKey())}>
            Bu ay
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setMonthKey((m) => addMonths(m, 1))}>
            Sonraki ay ›
          </button>
        </div>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      {loading ? (
        <p className="muted">Finans verileri yükleniyor…</p>
      ) : (
        <>
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-card__title">Ödeme gelirleri (ay)</span>
              <div className="stat-card__value">{formatMoney(paymentIncomeTotal)} ₺</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__title">Manuel gelir (ay)</span>
              <div className="stat-card__value">{formatMoney(manualIncomeTotal)} ₺</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__title">Toplam gelir (ay)</span>
              <div className="stat-card__value">{formatMoney(totalIncome)} ₺</div>
            </div>
            <div className="stat-card">
              <span className="stat-card__title">Toplam gider (ay)</span>
              <div className="stat-card__value">{formatMoney(totalExpense)} ₺</div>
            </div>
            <div className="stat-card stat-card--highlight">
              <span className="stat-card__title">Güncel bakiye</span>
              <div className="stat-card__value">{formatMoney(balance.currentBalance)} ₺</div>
            </div>
          </div>

          <div className="filter-bar finance-tabs">
            {[
              { key: 'summary', label: 'Özet' },
              { key: 'incomes', label: 'Gelirler' },
              { key: 'expenses', label: 'Giderler' },
              { key: 'balance', label: 'Bakiye' },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                className={`filter-bar__btn${activeTab === t.key ? ' filter-bar__btn--active' : ''}`}
                onClick={() => setActiveTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>

          {activeTab === 'summary' ? (
            <div className="page-card">
              <p className="muted">
                Seçili ay net hareket (gelir − gider):{' '}
                <strong>{formatMoney(totalIncome - totalExpense)} ₺</strong>
              </p>
              <p className="muted">
                Güncel bakiye tüm zamanların kümülatif sonucudur; ödeme, gelir ve gider işlemleri
                kurum finans ayarları üzerinden güncellenir.
              </p>
            </div>
          ) : null}

          {activeTab === 'incomes' ? (
            <div className="finance-split">
              <form className="page-card form-grid finance-form" onSubmit={onAddIncome}>
                <h3>Gelir ekle</h3>
                <label>
                  Başlık
                  <input value={incomeTitle} onChange={(e) => setIncomeTitle(e.target.value)} required />
                </label>
                <label>
                  Kategori
                  <select value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value)}>
                    {INCOME_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tutar (₺)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={incomeAmount}
                    onChange={(e) => setIncomeAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Tarih
                  <input
                    type="date"
                    value={incomeDate}
                    onChange={(e) => setIncomeDate(e.target.value)}
                    required
                  />
                </label>
                <button type="submit" className="btn btn--primary" disabled={savingIncome}>
                  {savingIncome ? 'Kaydediliyor…' : 'Gelir Kaydet'}
                </button>
              </form>
              <div className="page-card table-wrap">
                <h3>Gelir listesi</h3>
                {incomeRows.length === 0 ? (
                  <p className="muted">Bu ay gelir kaydı yok.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th>Başlık</th>
                        <th>Detay</th>
                        <th>Tutar</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incomeRows.map((r) => (
                        <tr key={r.key}>
                          <td>{r.category}</td>
                          <td>{r.title}</td>
                          <td>{r.detail}</td>
                          <td>{formatMoney(r.amount)} ₺</td>
                          <td>{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'expenses' ? (
            <div className="finance-split">
              <form className="page-card form-grid finance-form" onSubmit={onAddExpense}>
                <h3>Gider ekle</h3>
                <label>
                  Başlık
                  <input value={expTitle} onChange={(e) => setExpTitle(e.target.value)} required />
                </label>
                <label>
                  Kategori
                  <select value={expCategory} onChange={(e) => setExpCategory(e.target.value)}>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Tutar (₺)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                    required
                  />
                </label>
                <label>
                  Tarih
                  <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} required />
                </label>
                <button type="submit" className="btn btn--primary" disabled={savingExpense}>
                  {savingExpense ? 'Kaydediliyor…' : 'Gider Kaydet'}
                </button>
              </form>
              <div className="page-card table-wrap">
                <h3>Gider listesi</h3>
                {monthExpenses.length === 0 ? (
                  <p className="muted">Bu ay gider kaydı yok.</p>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Kategori</th>
                        <th>Başlık</th>
                        <th>Tutar</th>
                        <th>Tarih</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthExpenses.map((r) => (
                        <tr key={r.id}>
                          <td>{r.category}</td>
                          <td>{r.title}</td>
                          <td>{formatMoney(r.amount)} ₺</td>
                          <td>{r.dateLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'balance' ? (
            <form className="page-card form-grid finance-form balance-form" onSubmit={onSaveBalance}>
              <h3>Manuel bakiye güncelle</h3>
              <p className="muted">Bakiye, kurumunuzun finans ayarlarına kaydedilir.</p>
              <label>
                Güncel bakiye (₺)
                <input
                  type="number"
                  step="0.01"
                  value={manualBalance}
                  onChange={(e) => setManualBalance(e.target.value)}
                  required
                />
              </label>
              <button type="submit" className="btn btn--primary" disabled={savingBalance}>
                {savingBalance ? 'Kaydediliyor…' : 'Bakiyeyi Güncelle'}
              </button>
            </form>
          ) : null}
        </>
      )}
    </div>
  );
}
