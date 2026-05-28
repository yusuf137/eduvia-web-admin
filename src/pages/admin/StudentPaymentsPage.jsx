import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../firebase/firebaseConfig';
import {
  currentMonthKey,
  fetchPayments,
  getPaidStudentIdsForMonth,
  recordStudentPayment,
  createPaymentReminderNotification,
} from '../../services/paymentService';
import { listActiveStudentsForLessons } from '../../services/userService';
import ReceiptModal from '../../components/ReceiptModal';
import {
  normalizePaymentForReceipt,
  paymentRowFromReceiptResult,
  printReceipt,
  resolveInstitutionForReceipt,
} from '../../services/receiptPrintService';

export default function StudentPaymentsPage() {
  const { currentUserProfile } = useAuth();
  const institutionId = currentUserProfile?.institutionId ?? '';
  const monthKey = useMemo(() => currentMonthKey(), []);

  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [search, setSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [bulkSending, setBulkSending] = useState(false);
  const [notifyingId, setNotifyingId] = useState('');
  const [receiptPayment, setReceiptPayment] = useState(null);

  const loadData = useCallback(async () => {
    if (!institutionId) {
      setLoading(false);
      return;
    }
    // eslint-disable-next-line no-console
    console.log('WEB PAYMENT PROFILE:', currentUserProfile);
    setLoading(true);
    setError('');
    try {
      const [studentRows, paymentRows] = await Promise.all([
        listActiveStudentsForLessons(institutionId),
        fetchPayments(institutionId),
      ]);
      setStudents(studentRows);
      setPayments(paymentRows);
    } catch (e) {
      setError(e?.message ?? 'Veriler yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [institutionId, currentUserProfile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const paidIds = useMemo(
    () => getPaidStudentIdsForMonth(payments, monthKey),
    [payments, monthKey],
  );

  const displayStudents = useMemo(() => {
    let list = students;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q),
      );
    }
    if (paymentFilter === 'paid') {
      return list.filter((s) => paidIds.has(s.id));
    }
    if (paymentFilter === 'unpaid') {
      return list.filter((s) => !paidIds.has(s.id));
    }
    return list;
  }, [students, search, paymentFilter, paidIds]);

  const unpaidStudents = useMemo(
    () => students.filter((s) => !paidIds.has(s.id)),
    [students, paidIds],
  );

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedId) ?? null,
    [students, selectedId],
  );

  const onPay = async () => {
    setError('');
    setSuccess('');
    const uid = auth.currentUser?.uid;
    if (!uid || !selectedStudent) {
      setError('Öğrenci seçin.');
      return;
    }
    const amt = Number(String(amount).replace(',', '.'));
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('Geçerli tutar girin.');
      return;
    }
    setSaving(true);
    try {
      const receipt = await recordStudentPayment({
        studentId: selectedStudent.id,
        studentName: selectedStudent.name,
        amount: amt,
        adminUid: uid,
        institutionId,
        adminName: currentUserProfile?.name ?? '',
        monthKey,
      });
      setSuccess(`Ödeme alındı. Makbuz: ${receipt.receiptNo}`);
      setReceiptPayment(
        paymentRowFromReceiptResult(
          { ...receipt, receivedByName: receipt.receivedByName || currentUserProfile?.name },
          institutionId,
          currentUserProfile?.name ?? '',
        ),
      );
      setAmount('');
      setSelectedId('');
      await loadData();
    } catch (e) {
      setError(e?.message ?? 'Ödeme kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  const onBulkNotify = async () => {
    if (!unpaidStudents.length) {
      setError('Bu ay ödeme yapmamış aktif öğrenci yok.');
      return;
    }
    setBulkSending(true);
    setError('');
    setSuccess('');
    let ok = 0;
    try {
      for (const s of unpaidStudents) {
        try {
          await createPaymentReminderNotification(s.id, institutionId);
          ok += 1;
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log('WEB PAYMENT NOTIFICATION ERROR:', e?.code, e?.message);
        }
      }
      setSuccess(`${ok} öğrenciye ödeme hatırlatma bildirimi yazıldı.`);
    } finally {
      setBulkSending(false);
    }
  };

  const openReceipt = (payment) => {
    setReceiptPayment(payment);
  };

  const onPrintReceipt = async (payment) => {
    try {
      const institution = await resolveInstitutionForReceipt(
        institutionId,
        currentUserProfile?.institutionName ?? 'Kurum',
      );
      printReceipt(
        normalizePaymentForReceipt(payment, {
          receivedByFallback: currentUserProfile?.name ?? '',
        }),
        institution,
      );
    } catch (e) {
      setError(e?.message ?? 'Makbuz yazdırılamadı.');
    }
  };

  const onNotifyOne = async (student) => {
    setNotifyingId(student.id);
    try {
      await createPaymentReminderNotification(student.id, institutionId);
      setSuccess(`${student.name} için bildirim oluşturuldu.`);
    } catch (e) {
      setError(e?.message ?? 'Bildirim gönderilemedi.');
    } finally {
      setNotifyingId('');
    }
  };

  return (
    <div className="page-stack payments-page">
      <div className="page-toolbar">
        <div>
          <h2 className="page-heading">Öğrenci Ödemeleri</h2>
          <p className="muted">Dönem: {monthKey}</p>
        </div>
        <button
          type="button"
          className="btn btn--primary"
          disabled={bulkSending || unpaidStudents.length === 0}
          onClick={() => void onBulkNotify()}>
          {bulkSending ? 'Gönderiliyor…' : 'Tüm Ödemeyenlere Bildirim Gönder'}
        </button>
      </div>

      {error ? <div className="alert alert--error">{error}</div> : null}
      {success ? <div className="alert alert--success">{success}</div> : null}

      <div className="payments-layout">
        <div className="page-card payments-list-panel">
          <div className="payments-filters">
            <input
              type="search"
              placeholder="İsim veya e-posta ara…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="filter-bar">
              {[
                { key: 'all', label: 'Tümü' },
                { key: 'paid', label: 'Ödedi' },
                { key: 'unpaid', label: 'Ödemedi' },
              ].map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`filter-bar__btn${paymentFilter === f.key ? ' filter-bar__btn--active' : ''}`}
                  onClick={() => setPaymentFilter(f.key)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <p className="muted">Öğrenciler yükleniyor…</p>
          ) : displayStudents.length === 0 ? (
            <p className="muted">Henüz öğrenci yok veya filtre sonucu boş.</p>
          ) : (
            <div className="payments-student-list">
              {displayStudents.map((s) => {
                const paid = paidIds.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`payments-student-row${selectedId === s.id ? ' payments-student-row--selected' : ''}`}>
                    <button
                      type="button"
                      className="payments-student-row__main"
                      onClick={() => setSelectedId(s.id)}>
                      <strong>{s.name}</strong>
                      <span>{s.email || '—'}</span>
                      <span className={`badge ${paid ? 'badge--ok' : 'badge--muted'}`}>
                        {paid ? 'Ödedi' : 'Ödemedi'}
                      </span>
                    </button>
                    {!paid ? (
                      <button
                        type="button"
                        className="btn btn--ghost btn--sm"
                        disabled={notifyingId === s.id}
                        onClick={() => void onNotifyOne(s)}>
                        {notifyingId === s.id ? '…' : 'Bildirim'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="page-card payments-form-panel">
          <h3>Ödeme Al</h3>
          {selectedStudent ? (
            <>
              <p>
                <strong>{selectedStudent.name}</strong>
                <br />
                <span className="muted">{selectedStudent.email}</span>
              </p>
              <label>
                Tutar (₺)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="btn btn--primary"
                disabled={saving}
                onClick={() => void onPay()}>
                {saving ? 'Kaydediliyor…' : 'Ödemeyi Kaydet'}
              </button>
            </>
          ) : (
            <p className="muted">Soldan bir öğrenci seçin.</p>
          )}
        </div>
      </div>

      <div className="page-card">
        <h3>Son ödemeler ({monthKey})</h3>
        {filterPaymentsByMonthLocal(payments, monthKey).length === 0 ? (
          <p className="muted">Bu ay kayıtlı ödeme yok.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Öğrenci</th>
                  <th>Tutar</th>
                  <th>Makbuz</th>
                  <th>Tarih</th>
                  <th>Alan</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filterPaymentsByMonthLocal(payments, monthKey).map((p) => (
                  <tr key={p.id}>
                    <td>{p.studentName}</td>
                    <td>{p.amount} ₺</td>
                    <td>
                      <code className="code-pill">{p.receiptNo}</code>
                    </td>
                    <td>{p.dateLabel}</td>
                    <td>{p.receivedByName || '—'}</td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => openReceipt(p)}>
                          Makbuzu Görüntüle
                        </button>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => void onPrintReceipt(p)}>
                          Yazdır
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {filterPaymentsByMonthLocal(payments, monthKey).length > 0 ? (
      <div className="payments-receipt-cards">
        {filterPaymentsByMonthLocal(payments, monthKey).map((p) => (
          <article key={`card-${p.id}`} className="payment-receipt-card">
            <div className="payment-receipt-card__head">
              <strong>{p.studentName}</strong>
              <span>{p.amount} ₺</span>
            </div>
            <p className="muted">
              Makbuz: <code className="code-pill">{p.receiptNo}</code>
            </p>
            <p className="muted">
              {p.dateLabel} · {p.receivedByName || '—'}
            </p>
            <div className="table-actions">
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => openReceipt(p)}>
                Makbuzu Görüntüle
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => void onPrintReceipt(p)}>
                Yazdır
              </button>
            </div>
          </article>
        ))}
      </div>
      ) : null}

      <ReceiptModal
        open={Boolean(receiptPayment)}
        payment={receiptPayment}
        institutionId={institutionId}
        institutionName={currentUserProfile?.institutionName ?? 'Kurum'}
        receivedByFallback={currentUserProfile?.name ?? ''}
        onClose={() => setReceiptPayment(null)}
      />
    </div>
  );
}

function filterPaymentsByMonthLocal(payments, monthKey) {
  const mk = String(monthKey).slice(0, 7);
  return (payments || []).filter((p) => String(p.month ?? '').slice(0, 7) === mk);
}
