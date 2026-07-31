import { AUDIT_MODULE_LABELS, getAuditActionBadgeClass } from '../../../constants/auditActions';
import { getAuditActionUiLabel } from '../../../constants/auditActionUiLabels';
import { formatDateTime } from '../../../utils/dateFormat';
import AuditDataComparison from './AuditDataComparison';

export default function AuditLogDetailModal({ log, open, onClose }) {
  if (!open || !log) return null;

  const badgeClass = getAuditActionBadgeClass(log.action);

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card audit-log-detail-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}>
        <div className="audit-log-detail-modal__head">
          <div>
            <h3>İşlem Bilgisi</h3>
            <span className={`audit-badge ${badgeClass}`}>
              {getAuditActionUiLabel(log.action)}
            </span>
          </div>
        </div>

        <dl className="subscription-detail-grid">
          <div>
            <dt>İşlem Tipi</dt>
            <dd>{getAuditActionUiLabel(log.action)}</dd>
          </div>
          <div>
            <dt>Modül</dt>
            <dd>{AUDIT_MODULE_LABELS[log.module] ?? log.module}</dd>
          </div>
          <div>
            <dt>Kullanıcı</dt>
            <dd>{log.performedBy || '—'}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{log.performedByEmail || '—'}</dd>
          </div>
          <div>
            <dt>Kurum</dt>
            <dd>{log.institutionName || '—'}</dd>
          </div>
          <div>
            <dt>Tarih</dt>
            <dd>{formatDateTime(log.createdAt)}</dd>
          </div>
          <div>
            <dt>IP</dt>
            <dd>{log.ipAddress || '—'}</dd>
          </div>
          <div>
            <dt>Cihaz / Tarayıcı</dt>
            <dd>
              {[log.device, log.browser].filter(Boolean).join(' · ') || '—'}
            </dd>
          </div>
          <div className="subscription-detail-grid__full">
            <dt>Açıklama</dt>
            <dd>{log.description || '—'}</dd>
          </div>
        </dl>

        <section className="audit-log-detail-modal__compare">
          <h4>Değişiklik Karşılaştırması</h4>
          <AuditDataComparison oldData={log.oldData} newData={log.newData} />
        </section>

        <div className="modal-card__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
}
