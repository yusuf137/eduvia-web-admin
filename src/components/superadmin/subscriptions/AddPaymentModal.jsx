import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { addSubscriptionPayment } from '../../../services/subscriptionService';
import { parseDateInput, todayDateInputValue } from '../../../utils/dateFormat';

const PAYMENT_TYPES = [
  { value: 'bank_transfer', label: 'Havale / EFT' },
  { value: 'credit_card', label: 'Kredi Kartı' },
  { value: 'cash', label: 'Nakit' },
  { value: 'other', label: 'Diğer' },
];

export default function AddPaymentModal({ subscription, open, onClose, onSaved }) {
  const { currentUserProfile } = useAuth();
  const [amount, setAmount] = useState('');
  const [discount, setDiscount] = useState('0');
  const [paymentType, setPaymentType] = useState('bank_transfer');
  const [description, setDescription] = useState('');
  const [paymentDate, setPaymentDate] = useState(todayDateInputValue());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && subscription) {
      setAmount(String(subscription.monthlyFee ?? ''));
      setDiscount('0');
      setPaymentType('bank_transfer');
      setDescription('');
      setPaymentDate(todayDateInputValue());
      setError('');
    }
  }, [open, subscription]);

  if (!open || !subscription) return null;

  const onSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await addSubscriptionPayment(subscription.institutionId, {
        amount: Number(amount),
        discount: Number(discount),
        paymentType,
        description,
        paymentDate: parseDateInput(paymentDate),
        createdByName: currentUserProfile?.name ?? currentUserProfile?.displayName ?? 'SuperAdmin',
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
        className="modal-card subscription-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>Ödeme Ekle</h3>
        <p className="muted">{subscription.institutionName}</p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form className="subscription-form" onSubmit={(event) => void onSubmit(event)}>
          <label>
            Tutar (TL)
            <input
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
            />
          </label>

          <label>
            İndirim (TL)
            <input
              type="number"
              min="0"
              step="1"
              value={discount}
              onChange={(event) => setDiscount(event.target.value)}
            />
          </label>

          <label>
            Ödeme Türü
            <select value={paymentType} onChange={(event) => setPaymentType(event.target.value)}>
              {PAYMENT_TYPES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

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
            Açıklama
            <textarea
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opsiyonel açıklama"
            />
          </label>

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Ödemeyi Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
