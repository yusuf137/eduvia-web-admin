import { useEffect, useRef, useState } from 'react';
import PaymentReceiptUploadField from './PaymentReceiptUploadField';
import { uploadPaymentReceipt } from '../../../services/paymentReceiptService';

export default function PaymentReceiptUploadModal({
  payment,
  open,
  mode = 'upload',
  onClose,
  onSaved,
}) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const inputIdRef = useRef(`receipt-upload-${payment?.id ?? 'new'}`);

  useEffect(() => {
    if (open) {
      setFile(null);
      setError('');
    }
  }, [open, payment?.id]);

  if (!open || !payment) return null;

  const title = mode === 'replace' ? 'Makbuzu Değiştir' : 'Makbuz Yükle';

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!file) {
      setError('Lütfen bir makbuz dosyası seçin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await uploadPaymentReceipt(payment.institutionId, payment.id, file);
      onSaved();
      onClose();
    } catch (e) {
      setError(e?.message ?? 'Makbuz yüklenemedi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card payment-receipt-upload-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>{title}</h3>
        <p className="muted">
          {payment.institutionName} — {payment.paymentNumber}
        </p>

        {error ? <div className="alert alert--error">{error}</div> : null}

        <form onSubmit={(event) => void onSubmit(event)}>
          <PaymentReceiptUploadField
            file={file}
            onFileChange={setFile}
            disabled={saving}
            inputId={inputIdRef.current}
          />

          <div className="modal-card__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose} disabled={saving}>
              İptal
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving || !file}>
              {saving ? 'Yükleniyor…' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
