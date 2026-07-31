import { getRejectionReasonLabel } from '../../../constants/rejectionReasons';
import { formatDate, formatDateTime } from '../../../utils/dateFormat';

/** @param {object} props */
export function RejectedInstitutionDetailModal({ record, open, onClose, onEdit }) {
  if (!open || !record) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card rejected-institution-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <h3>{record.institutionName}</h3>
        <p className="muted">Red veren kurum detayı</p>

        <dl className="subscription-detail-grid">
          <div>
            <dt>Kurum Adı</dt>
            <dd>{record.institutionName || '—'}</dd>
          </div>
          <div>
            <dt>Yetkili Kişi</dt>
            <dd>{record.contactPerson || '—'}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>{record.phone || '—'}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{record.email || '—'}</dd>
          </div>
          <div>
            <dt>Red Sebebi</dt>
            <dd>{getRejectionReasonLabel(record.reason, record.customReason)}</dd>
          </div>
          <div>
            <dt>Red Tarihi</dt>
            <dd>{formatDate(record.rejectedAt)}</dd>
          </div>
          <div>
            <dt>Tekrar Aranabilir</dt>
            <dd>
              <span className={`badge ${record.recontact ? 'badge--ok' : 'badge--muted'}`}>
                {record.recontact ? 'Evet' : 'Hayır'}
              </span>
            </dd>
          </div>
          <div className="subscription-detail-grid__full">
            <dt>Notlar</dt>
            <dd>{record.notes || '—'}</dd>
          </div>
          <div>
            <dt>Eklenme Tarihi</dt>
            <dd>{formatDateTime(record.createdAt)}</dd>
          </div>
          <div>
            <dt>Son Güncelleme</dt>
            <dd>{formatDateTime(record.updatedAt)}</dd>
          </div>
        </dl>

        <div className="modal-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onEdit}>
            Düzenle
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
