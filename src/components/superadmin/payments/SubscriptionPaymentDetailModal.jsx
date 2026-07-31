import {
  PAYMENT_METHOD_LABELS,
} from '../../../constants/paymentMethod';
import {
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABELS,
} from '../../../constants/paymentStatus';
import { formatPaymentAmount } from '../../../utils/paymentExport';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';
import PaymentReceiptSection from './PaymentReceiptSection';

export default function SubscriptionPaymentDetailModal({
  payment,
  open,
  onClose,
  onUploadReceipt,
  onReplaceReceipt,
  onDeleteReceipt,
  onGeneratePdfReceipt,
  receiptBusy = false,
}) {
  if (!open || !payment) return null;

  const statusClass = PAYMENT_STATUS_BADGE_CLASS[payment.status] ?? 'badge--muted';

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card subscription-detail-modal payment-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <div className="subscription-detail-modal__head">
          <div>
            <h3>Ödeme Detayı</h3>
            <p className="muted">{payment.paymentNumber}</p>
          </div>
          <span className={`badge ${statusClass}`}>
            {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
          </span>
        </div>

        <dl className="subscription-detail-grid">
          <div>
            <dt>Kurum</dt>
            <dd>{payment.institutionName || '—'}</dd>
          </div>
          <div>
            <dt>Paket</dt>
            <dd>{payment.packageName || '—'}</dd>
          </div>
          <div>
            <dt>Tutar</dt>
            <dd>{formatPaymentAmount(payment.amount, payment.currency)}</dd>
          </div>
          <div>
            <dt>Para Birimi</dt>
            <dd>{payment.currency}</dd>
          </div>
          <div>
            <dt>Durum</dt>
            <dd>{PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}</dd>
          </div>
          <div>
            <dt>Ödeme Tarihi</dt>
            <dd>{formatDate(payment.paymentDate)}</dd>
          </div>
          <div>
            <dt>Sonraki Ödeme</dt>
            <dd>{formatDate(payment.nextPaymentDate)}</dd>
          </div>
          <div>
            <dt>Ödeme Yöntemi</dt>
            <dd>{PAYMENT_METHOD_LABELS[payment.paymentMethod] ?? payment.paymentMethod}</dd>
          </div>
          <div>
            <dt>İşlem Referans No</dt>
            <dd>{payment.transactionReference || '—'}</dd>
          </div>
          <div className="subscription-detail-grid__full">
            <dt>Açıklama</dt>
            <dd>{payment.description || '—'}</dd>
          </div>
          <div>
            <dt>Oluşturan Kullanıcı</dt>
            <dd>{payment.createdByName || '—'}</dd>
          </div>
          <div>
            <dt>Oluşturulma Tarihi</dt>
            <dd>{formatDateTime(payment.createdAt)}</dd>
          </div>
        </dl>

        <PaymentReceiptSection
          payment={payment}
          busy={receiptBusy}
          onUpload={() => onUploadReceipt(payment)}
          onReplace={() => onReplaceReceipt(payment)}
          onDelete={() => onDeleteReceipt(payment)}
          onGeneratePdf={() => onGeneratePdfReceipt(payment)}
        />

        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
