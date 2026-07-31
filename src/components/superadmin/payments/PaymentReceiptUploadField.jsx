import { RECEIPT_ALLOWED_EXTENSIONS } from '../../../constants/paymentReceipt';

export default function PaymentReceiptUploadField({
  file,
  onFileChange,
  disabled = false,
  inputId = 'payment-receipt-upload',
}) {
  const accept = RECEIPT_ALLOWED_EXTENSIONS.join(',');

  return (
    <label className="payment-receipt-upload" htmlFor={inputId}>
      <span className="payment-receipt-upload__label">Makbuz Yükle</span>
      <input
        id={inputId}
        type="file"
        accept={accept}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          onFileChange(next);
        }}
      />
      <span className="payment-receipt-upload__hint muted">
        PDF, JPG, JPEG veya PNG (en fazla 10 MB)
      </span>
      {file ? (
        <span className="payment-receipt-upload__name">{file.name}</span>
      ) : (
        <span className="payment-receipt-upload__name muted">Dosya seçilmedi</span>
      )}
    </label>
  );
}
