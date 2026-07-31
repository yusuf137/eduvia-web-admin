import { SUBSCRIPTION_STATUS } from '../constants/subscriptionStatus';
import { AUDIT_ACTIONS } from '../constants/auditActions';

/** @param {object|null|undefined} sub */
export function serializeSubscriptionSnapshot(sub) {
  if (!sub) return null;
  return {
    packageName: sub.packageName ?? null,
    status: sub.status ?? null,
    monthlyPrice: sub.monthlyPrice ?? null,
    autoRenew: sub.autoRenew ?? null,
  };
}

/** @param {string} status */
export function resolveSubscriptionAuditAction(status) {
  switch (status) {
    case SUBSCRIPTION_STATUS.ACTIVE:
      return AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED;
    case SUBSCRIPTION_STATUS.SUSPENDED:
      return AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED;
    case SUBSCRIPTION_STATUS.CANCELLED:
      return AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED;
    case SUBSCRIPTION_STATUS.EXPIRED:
      return AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED;
    default:
      return AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED;
  }
}

/** @param {string} institutionName @param {object|null} previous @param {object} next @param {string} [reason] */
export function buildSubscriptionAuditDescription(institutionName, previous, next, reason = '') {
  const name = institutionName || 'Kurum';
  if (previous?.packageName !== next?.packageName && next?.packageName) {
    return `${name} kurumunun aboneliğini ${next.packageName} yaptı.`;
  }
  if (previous?.status !== next?.status && next?.status) {
    return `${name} kurumunun abonelik durumu ${next.status} olarak güncellendi.`;
  }
  return reason || `${name} kurumunun aboneliği güncellendi.`;
}
