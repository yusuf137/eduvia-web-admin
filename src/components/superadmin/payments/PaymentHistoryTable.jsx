import { Eye, FilePlus2, FileText, MoreVertical, Trash2, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  hasGeneratedReceipt,
  hasPaymentReceipt,
  isImageReceipt,
} from '../../../constants/paymentReceipt';
import {
  PAYMENT_METHOD_LABELS,
} from '../../../constants/paymentMethod';
import {
  PAYMENT_STATUS_BADGE_CLASS,
  PAYMENT_STATUS_LABELS,
} from '../../../constants/paymentStatus';
import { formatPaymentAmount } from '../../../utils/paymentExport';
import { formatDate } from '../../../utils/dateFormat';

function ReceiptCell({ payment, onViewGeneratedReceipt, onViewReceipt }) {
  if (hasGeneratedReceipt(payment)) {
    return (
      <button
        type="button"
        className="payment-receipt-cell payment-receipt-cell--generated"
        onClick={() => onViewGeneratedReceipt(payment)}
        title="PDF makbuzu aç">
        <span className="payment-receipt-cell__pdf">
          <FileText size={16} />
        </span>
        <span>📄 Oluşturuldu</span>
      </button>
    );
  }

  if (!hasPaymentReceipt(payment)) {
    return <span className="muted">— Makbuz Yok</span>;
  }

  const isImage = isImageReceipt(payment.receiptUrl, payment.receiptFileName);

  return (
    <button
      type="button"
      className="payment-receipt-cell"
      onClick={() => onViewReceipt(payment)}
      title="Makbuzu görüntüle">
      {isImage ? (
        <img
          src={payment.receiptUrl}
          alt=""
          className="payment-receipt-cell__thumb"
        />
      ) : (
        <span className="payment-receipt-cell__pdf">
          <FileText size={16} />
        </span>
      )}
      <span>📄 Makbuz Var</span>
    </button>
  );
}

function RowActionsMenu({
  payment,
  isActing,
  onView,
  onDelete,
  onViewReceipt,
  onViewGeneratedReceipt,
  onUploadReceipt,
  onReplaceReceipt,
  onDeleteReceipt,
  onGeneratePdfReceipt,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const hasReceipt = hasPaymentReceipt(payment);
  const hasGenerated = hasGeneratedReceipt(payment);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (event) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  const run = (fn) => {
    setOpen(false);
    fn(payment);
  };

  return (
    <div className="payment-actions-menu" ref={wrapRef}>
      <button
        type="button"
        className="btn btn--ghost btn--sm"
        title="İşlemler"
        onClick={() => setOpen((value) => !value)}
        disabled={isActing}>
        <MoreVertical size={16} />
      </button>
      {open ? (
        <div className="payment-actions-menu__dropdown">
          <button type="button" onClick={() => run(onView)}>
            Detay
          </button>
          {!payment.legacy ? (
            <button type="button" onClick={() => run(onGeneratePdfReceipt)}>
              <FilePlus2 size={14} />
              Makbuz Oluştur (PDF)
            </button>
          ) : null}
          {hasGenerated ? (
            <button type="button" onClick={() => run(onViewGeneratedReceipt)}>
              PDF Makbuz Görüntüle
            </button>
          ) : null}
          {hasReceipt ? (
            <>
              <button type="button" onClick={() => run(onViewReceipt)}>
                Makbuz Görüntüle
              </button>
              {!payment.legacy ? (
                <>
                  <button type="button" onClick={() => run(onReplaceReceipt)}>
                    Makbuzu Değiştir
                  </button>
                  <button type="button" onClick={() => run(onDeleteReceipt)}>
                    Makbuzu Sil
                  </button>
                </>
              ) : null}
            </>
          ) : !payment.legacy ? (
            <button type="button" onClick={() => run(onUploadReceipt)}>
              <Upload size={14} />
              Makbuz Yükle
            </button>
          ) : null}
          {!payment.legacy ? (
            <button type="button" className="payment-actions-menu__danger" onClick={() => run(onDelete)}>
              Ödemeyi Sil
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function PaymentHistoryTable({
  rows,
  loading,
  onView,
  onDelete,
  onViewReceipt,
  onViewGeneratedReceipt,
  onUploadReceipt,
  onReplaceReceipt,
  onDeleteReceipt,
  onGeneratePdfReceipt,
  actingId,
}) {
  if (loading) {
    return <p className="muted">Ödemeler yükleniyor…</p>;
  }

  if (!rows.length) {
    return <p className="muted">Filtreye uygun ödeme kaydı bulunamadı.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="data-table payment-history-table">
        <thead>
          <tr>
            <th>Ödeme No</th>
            <th>Kurum</th>
            <th>Paket</th>
            <th>Tutar</th>
            <th>Ödeme Tarihi</th>
            <th>Sonraki Ödeme</th>
            <th>Yöntem</th>
            <th>Durum</th>
            <th>Makbuz</th>
            <th>İşlemler</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const statusClass = PAYMENT_STATUS_BADGE_CLASS[row.status] ?? 'badge--muted';
            const isActing = actingId === row.id;
            return (
              <tr key={row.id}>
                <td>
                  <button
                    type="button"
                    className="link-button"
                    onClick={() => onView(row)}>
                    {row.paymentNumber}
                  </button>
                </td>
                <td>{row.institutionName || '—'}</td>
                <td>{row.packageName || '—'}</td>
                <td>{formatPaymentAmount(row.amount, row.currency)}</td>
                <td>{formatDate(row.paymentDate)}</td>
                <td>{formatDate(row.nextPaymentDate)}</td>
                <td>{PAYMENT_METHOD_LABELS[row.paymentMethod] ?? row.paymentMethod}</td>
                <td>
                  <span className={`badge ${statusClass}`}>
                    {PAYMENT_STATUS_LABELS[row.status] ?? row.status}
                  </span>
                </td>
                <td>
                  <ReceiptCell
                    payment={row}
                    onViewReceipt={onViewReceipt}
                    onViewGeneratedReceipt={onViewGeneratedReceipt}
                  />
                </td>
                <td>
                  <div className="payment-history-table__actions">
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      title="Detay"
                      onClick={() => onView(row)}
                      disabled={isActing}>
                      <Eye size={16} />
                    </button>
                    <RowActionsMenu
                      payment={row}
                      isActing={isActing}
                      onView={onView}
                      onDelete={onDelete}
                      onViewReceipt={onViewReceipt}
                      onViewGeneratedReceipt={onViewGeneratedReceipt}
                      onUploadReceipt={onUploadReceipt}
                      onReplaceReceipt={onReplaceReceipt}
                      onDeleteReceipt={onDeleteReceipt}
                      onGeneratePdfReceipt={onGeneratePdfReceipt}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
