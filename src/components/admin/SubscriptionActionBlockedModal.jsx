import { Ban, Clock, PauseCircle } from 'lucide-react';
import { SUBSCRIPTION_STATUS } from '../../constants/subscriptionStatus';
import {
  SUBSCRIPTION_ACTION_BLOCKED_FOOTNOTE,
  SUBSCRIPTION_ACTION_BLOCKED_TITLE,
} from '../../constants/subscriptionStatus';

const STATUS_META = {
  [SUBSCRIPTION_STATUS.SUSPENDED]: {
    Icon: PauseCircle,
    toneClass: 'subscription-blocked-modal--suspended',
    label: 'Askıda',
  },
  [SUBSCRIPTION_STATUS.EXPIRED]: {
    Icon: Clock,
    toneClass: 'subscription-blocked-modal--expired',
    label: 'Süresi doldu',
  },
  [SUBSCRIPTION_STATUS.CANCELLED]: {
    Icon: Ban,
    toneClass: 'subscription-blocked-modal--cancelled',
    label: 'İptal edildi',
  },
};

export default function SubscriptionActionBlockedModal({ open, status, reason, onClose }) {
  if (!open) {
    return null;
  }

  const meta = STATUS_META[status] ?? STATUS_META[SUBSCRIPTION_STATUS.CANCELLED];
  const { Icon, toneClass } = meta;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className={`modal-card subscription-blocked-modal ${toneClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-blocked-title"
        onClick={(event) => event.stopPropagation()}>
        <div className="subscription-blocked-modal__icon-wrap" aria-hidden="true">
          <Icon size={32} strokeWidth={2} />
        </div>
        <h3 id="subscription-blocked-title">{SUBSCRIPTION_ACTION_BLOCKED_TITLE}</h3>
        <p className="subscription-blocked-modal__reason">{reason}</p>
        <p className="subscription-blocked-modal__footnote muted">
          {SUBSCRIPTION_ACTION_BLOCKED_FOOTNOTE}
        </p>
        <div className="modal-card__actions subscription-blocked-modal__actions">
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}
