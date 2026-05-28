import { useEffect, useMemo, useState } from 'react';
import {
  buildReceiptDescription,
  formatCurrency,
  formatReceiptDate,
  monthPeriodLabel,
  normalizePaymentForReceipt,
  printReceipt,
  resolveInstitutionForReceipt,
  validateAdminReceiptAccess,
} from '../services/receiptPrintService';

export default function ReceiptModal({
  open,
  onClose,
  payment,
  institutionId,
  institutionName = 'Kurum',
  receivedByFallback = '',
}) {
  const [institution, setInstitution] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !payment) {
      return () => {};
    }
    let cancelled = false;
    setLoading(true);
    setError('');

    const accessError = validateAdminReceiptAccess(payment, institutionId);
    if (accessError) {
      setError(accessError);
      setLoading(false);
      return () => {};
    }

    void resolveInstitutionForReceipt(institutionId, institutionName)
      .then((inst) => {
        if (!cancelled) {
          setInstitution(inst);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e?.message ?? 'Kurum bilgisi yüklenemedi.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, payment, institutionId, institutionName]);

  const normalized = useMemo(() => {
    if (!payment) {
      return null;
    }
    return normalizePaymentForReceipt(payment, { receivedByFallback });
  }, [payment, receivedByFallback]);

  if (!open || !payment || !normalized) {
    return null;
  }

  const handlePrint = () => {
    const inst = institution || { name: institutionName };
    printReceipt(normalized, inst);
  };

  const instDisplay = institution || { name: institutionName };
  const contactParts = [];
  if (instDisplay.phone) {
    contactParts.push(`Tel: ${instDisplay.phone}`);
  }
  if (instDisplay.email) {
    contactParts.push(instDisplay.email);
  }

  return (
    <div className="modal-backdrop receipt-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card receipt-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}>
        <div className="receipt-modal__toolbar no-print">
          <h3>Makbuz</h3>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>
            Kapat
          </button>
        </div>

        {error ? <div className="alert alert--error no-print">{error}</div> : null}

        {loading ? (
          <p className="muted no-print">Makbuz yükleniyor…</p>
        ) : (
          <div className="receipt-preview" id="receipt-print-area">
            <div className="receipt-preview__header">
              <div>
                <h1 className="receipt-preview__title">TAHSİLAT MAKBUZU</h1>
                <p className="receipt-preview__org">{instDisplay.name}</p>
                {instDisplay.address || instDisplay.city ? (
                  <p className="receipt-preview__muted">
                    {[instDisplay.address, instDisplay.city].filter(Boolean).join(', ')}
                  </p>
                ) : null}
                {contactParts.length ? (
                  <p className="receipt-preview__muted">{contactParts.join(' · ')}</p>
                ) : null}
              </div>
              <div className="receipt-preview__meta">
                <p>
                  <span className="receipt-preview__muted">Makbuz No</span>
                  <br />
                  <strong>{normalized.receiptNo}</strong>
                </p>
                <p>
                  <span className="receipt-preview__muted">Tarih</span>
                  <br />
                  <strong>{normalized.dateLabel || formatReceiptDate(normalized.date)}</strong>
                </p>
              </div>
            </div>

            <dl className="receipt-preview__rows">
              <div>
                <dt>Öğrenci</dt>
                <dd>{normalized.studentName}</dd>
              </div>
              <div>
                <dt>Ödeme Ayı</dt>
                <dd>
                  {monthPeriodLabel(normalized.month)} ({normalized.month})
                </dd>
              </div>
              <div>
                <dt>Tahsil Eden</dt>
                <dd>{normalized.receivedByName}</dd>
              </div>
              <div>
                <dt>Tutar</dt>
                <dd className="receipt-preview__amount">{formatCurrency(normalized.amount)}</dd>
              </div>
            </dl>

            <p className="receipt-preview__note">
              <strong>Açıklama:</strong> {buildReceiptDescription(normalized.month)}
            </p>

            <p className="receipt-preview__footer">Bu makbuz Eduvia sistemi üzerinden oluşturulmuştur.</p>
          </div>
        )}

        <div className="modal-card__actions no-print">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Kapat
          </button>
          <button type="button" className="btn btn--primary" onClick={handlePrint} disabled={loading}>
            Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}
