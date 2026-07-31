import { ExternalLink, FileText, Download, RefreshCw, Trash2, FilePlus2 } from 'lucide-react';
import {
  hasGeneratedReceipt,
  hasPaymentReceipt,
  isImageReceipt,
  isPdfReceipt,
} from '../../../constants/paymentReceipt';
import { formatDateTime } from '../../../utils/dateFormat';

function UploadedReceiptBlock({
  payment,
  onUpload,
  onReplace,
  onDelete,
  busy,
}) {
  const hasReceipt = hasPaymentReceipt(payment);

  if (!hasReceipt) {
    return (
      <div className="payment-receipt-section__block">
        <h5 className="payment-receipt-section__subtitle">Yüklenen Makbuz</h5>
        <p className="muted">Henüz makbuz yüklenmedi.</p>
        {!payment?.legacy ? (
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={onUpload}
            disabled={busy}>
            Makbuz Yükle
          </button>
        ) : null}
      </div>
    );
  }

  const isPdf = isPdfReceipt(payment.receiptUrl, payment.receiptFileName);
  const isImage = isImageReceipt(payment.receiptUrl, payment.receiptFileName);

  return (
    <div className="payment-receipt-section__block">
      <h5 className="payment-receipt-section__subtitle">Yüklenen Makbuz</h5>
      <div className="payment-receipt-section__preview">
        {isImage ? (
          <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
            <img
              src={payment.receiptUrl}
              alt={payment.receiptFileName ?? 'Makbuz'}
              className="payment-receipt-section__thumb"
            />
          </a>
        ) : (
          <div className="payment-receipt-section__pdf-icon" aria-hidden="true">
            <FileText size={40} />
            <span>{isPdf ? 'PDF' : 'Dosya'}</span>
          </div>
        )}
        <div>
          <p className="payment-receipt-section__filename">{payment.receiptFileName ?? 'makbuz'}</p>
          {payment.receiptUploadedAt ? (
            <p className="muted payment-receipt-section__meta">
              Yüklendi: {formatDateTime(payment.receiptUploadedAt)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="payment-receipt-section__actions">
        <a
          href={payment.receiptUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--ghost btn--sm">
          <ExternalLink size={14} />
          Yeni sekmede aç
        </a>
        <a
          href={payment.receiptUrl}
          download={payment.receiptFileName ?? 'makbuz'}
          className="btn btn--ghost btn--sm">
          <Download size={14} />
          İndir
        </a>
        {!payment?.legacy ? (
          <>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onReplace}
              disabled={busy}>
              <RefreshCw size={14} />
              Değiştir
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={onDelete}
              disabled={busy}>
              <Trash2 size={14} />
              Sil
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function GeneratedReceiptBlock({
  payment,
  onGeneratePdf,
  busy,
}) {
  const hasGenerated = hasGeneratedReceipt(payment);

  return (
    <div className="payment-receipt-section__block">
      <h5 className="payment-receipt-section__subtitle">PDF Makbuz</h5>

      {hasGenerated ? (
        <>
          <div className="payment-receipt-section__preview">
            <div className="payment-receipt-section__pdf-icon" aria-hidden="true">
              <FileText size={40} />
              <span>PDF</span>
            </div>
            <div>
              <p className="payment-receipt-section__filename">
                📄 Oluşturuldu
                {payment.receiptVersion ? ` (v${payment.receiptVersion})` : ''}
              </p>
              {payment.generatedReceiptCreatedAt ? (
                <p className="muted payment-receipt-section__meta">
                  Oluşturuldu: {formatDateTime(payment.generatedReceiptCreatedAt)}
                </p>
              ) : null}
            </div>
          </div>

          <div className="payment-receipt-section__actions">
            <a
              href={payment.generatedReceiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--ghost btn--sm">
              <ExternalLink size={14} />
              PDF aç
            </a>
            <a
              href={payment.generatedReceiptUrl}
              download
              className="btn btn--ghost btn--sm">
              <Download size={14} />
              İndir
            </a>
            {!payment?.legacy ? (
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={onGeneratePdf}
                disabled={busy}>
                <RefreshCw size={14} />
                Yeniden Oluştur
              </button>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <p className="muted">Henüz PDF makbuz oluşturulmadı.</p>
          {!payment?.legacy ? (
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onGeneratePdf}
              disabled={busy}>
              <FilePlus2 size={14} />
              PDF Makbuz Oluştur
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function PaymentReceiptSection({
  payment,
  onUpload,
  onReplace,
  onDelete,
  onGeneratePdf,
  busy = false,
}) {
  return (
    <section className="payment-receipt-section">
      <h4 className="payment-receipt-section__title">Makbuz</h4>

      <GeneratedReceiptBlock
        payment={payment}
        onGeneratePdf={onGeneratePdf}
        busy={busy}
      />

      <UploadedReceiptBlock
        payment={payment}
        onUpload={onUpload}
        onReplace={onReplace}
        onDelete={onDelete}
        busy={busy}
      />
    </section>
  );
}
