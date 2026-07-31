import { useEffect, useMemo, useState } from 'react';
import { usePackages } from '../../../contexts/PackageCatalogContext';
import { DEFAULT_PAYMENT_CURRENCY, PAYMENT_CURRENCY_KEYS } from '../../../constants/paymentCurrency';
import {
  PAYMENT_METHOD,
  PAYMENT_METHOD_KEYS,
  PAYMENT_METHOD_LABELS,
} from '../../../constants/paymentMethod';
import {
  PAYMENT_STATUS,
  PAYMENT_STATUS_KEYS,
  PAYMENT_STATUS_LABELS,
} from '../../../constants/paymentStatus';
import PaymentReceiptUploadField from './PaymentReceiptUploadField';
import {
  createSubscriptionPaymentRecord,
  listInstitutionsForPaymentForm,
} from '../../../services/subscriptionPaymentService';
import { parseDateInput, todayDateInputValue, toDateInputValue } from '../../../utils/dateFormat';

function addMonthsInput(dateStr, months = 1) {
  const date = parseDateInput(dateStr);
  if (!date) return '';
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return toDateInputValue(next);
}

export default function AddSubscriptionPaymentModal({ open, onClose, onSaved }) {
  const { packages } = usePackages();
  const packageOptions = useMemo(
    () => packages.filter((pkg) => !pkg.archived),
    [packages],
  );
  const [institutions, setInstitutions] = useState([]);
  const [institutionId, setInstitutionId] = useState('');
  const [packageName, setPackageName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(DEFAULT_PAYMENT_CURRENCY);
  const [paymentDate, setPaymentDate] = useState(todayDateInputValue());
  const [nextPaymentDate, setNextPaymentDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHOD.BANK_TRANSFER);
  const [status, setStatus] = useState(PAYMENT_STATUS.SUCCESS);
  const [transactionReference, setTransactionReference] = useState('');
  const [description, setDescription] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setReceiptFile(null);
    setPaymentDate(todayDateInputValue());
    setNextPaymentDate(addMonthsInput(todayDateInputValue(), 1));
    setLoadingMeta(true);
    void listInstitutionsForPaymentForm()
      .then((rows) => {
        setInstitutions(rows);
        if (rows.length > 0) {
          setInstitutionId(rows[0].id);
          setPackageName(rows[0].packageName || packageOptions[0]?.name || '');
        }
      })
      .catch((e) => setError(e?.message ?? 'Kurumlar yüklenemedi.'))
      .finally(() => setLoadingMeta(false));
  }, [open]);

  const selectedInstitution = useMemo(
    () => institutions.find((item) => item.id === institutionId) ?? null,
    [institutions, institutionId],
  );

  useEffect(() => {
    if (!selectedInstitution) return;
    setPackageName(selectedInstitution.packageName || packageOptions[0]?.name || '');
  }, [selectedInstitution, packageOptions]);

  useEffect(() => {
    if (paymentDate) {
      setNextPaymentDate((prev) => prev || addMonthsInput(paymentDate, 1));
    }
  }, [paymentDate]);

  if (!open) return null;

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createSubscriptionPaymentRecord({
        institutionId,
        institutionName: selectedInstitution?.name ?? '',
        packageName,
        amount: Number(amount),
        currency,
        paymentMethod,
        status,
        paymentDate: parseDateInput(paymentDate),
        nextPaymentDate: nextPaymentDate ? parseDateInput(nextPaymentDate) : null,
        transactionReference,
        description,
        receiptFile,
      });
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Ödeme kaydedilemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card subscription-modal payment-form-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>Yeni Ödeme</h3>
        <p className="muted">Kurum abonelik ödemesi kaydı oluşturun.</p>

        {error ? <div className="alert alert--error">{error}</div> : null}
        {loadingMeta ? <p className="muted">Kurumlar yükleniyor…</p> : null}

        <form className="subscription-form payment-form-modal__form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Kurum
            <select
              value={institutionId}
              onChange={(event) => setInstitutionId(event.target.value)}
              required
              disabled={loadingMeta || saving}>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>
                  {inst.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Paket
            <select value={packageName} onChange={(event) => setPackageName(event.target.value)}>
              {packageOptions.map((pkg) => (
                <option key={pkg.id} value={pkg.name}>
                  {pkg.name}
                </option>
              ))}
            </select>
          </label>

          <div className="payment-form-modal__row">
            <label>
              Tutar
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </label>
            <label>
              Para Birimi
              <select value={currency} onChange={(event) => setCurrency(event.target.value)}>
                {PAYMENT_CURRENCY_KEYS.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="payment-form-modal__row">
            <label>
              Ödeme Tarihi
              <input
                type="date"
                value={paymentDate}
                onChange={(event) => setPaymentDate(event.target.value)}
                required
              />
            </label>
            <label>
              Sonraki Ödeme Tarihi
              <input
                type="date"
                value={nextPaymentDate}
                onChange={(event) => setNextPaymentDate(event.target.value)}
              />
            </label>
          </div>

          <div className="payment-form-modal__row">
            <label>
              Ödeme Yöntemi
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHOD_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_METHOD_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Durum
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {PAYMENT_STATUS_KEYS.map((key) => (
                  <option key={key} value={key}>
                    {PAYMENT_STATUS_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label>
            İşlem Referans No
            <input
              type="text"
              value={transactionReference}
              onChange={(event) => setTransactionReference(event.target.value)}
              placeholder="iyzico / PayTR / havale referansı"
            />
          </label>

          <label>
            Açıklama
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opsiyonel açıklama"
            />
          </label>

          <PaymentReceiptUploadField
            file={receiptFile}
            onFileChange={setReceiptFile}
            disabled={saving}
            inputId="new-payment-receipt"
          />

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || loadingMeta}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
