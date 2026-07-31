import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_ACTION_BLOCKED_MESSAGES,
  hasFullPackageFeatureAccess,
  isLimitedAccessStatus,
  normalizeSubscriptionStatus,
  resolveEffectiveSubscriptionStatus,
} from '../constants/subscriptionStatus';
import { normalizeSubscription } from '../models/subscriptionModel';

/**
 * @param {import('../types/subscription').InstitutionSubscription | object | null | undefined} subscription
 * @param {Date} [now]
 */
export function getEffectiveStatus(subscription, now = new Date()) {
  if (!subscription) return SUBSCRIPTION_STATUS.ACTIVE;
  return resolveEffectiveSubscriptionStatus(
    {
      subscriptionStatus: subscription.status,
      status: subscription.status,
      endDate: subscription.endDate,
      trialEndDate: subscription.endDate,
    },
    now,
  );
}

/** @param {object | null | undefined} institutionOrSubscription */
export function resolveSubscription(institutionOrSubscription) {
  if (!institutionOrSubscription) {
    return normalizeSubscription(null);
  }
  if (institutionOrSubscription.subscription) {
    return normalizeSubscription(institutionOrSubscription.subscription, institutionOrSubscription);
  }
  return normalizeSubscription(institutionOrSubscription);
}

export function isSubscriptionActive(subscription, now = new Date()) {
  return getEffectiveStatus(subscription, now) === SUBSCRIPTION_STATUS.ACTIVE;
}

export function isSubscriptionExpired(subscription, now = new Date()) {
  return getEffectiveStatus(subscription, now) === SUBSCRIPTION_STATUS.EXPIRED;
}

export function isSubscriptionSuspended(subscription, now = new Date()) {
  return getEffectiveStatus(subscription, now) === SUBSCRIPTION_STATUS.SUSPENDED;
}

export function isSubscriptionCancelled(subscription, now = new Date()) {
  return getEffectiveStatus(subscription, now) === SUBSCRIPTION_STATUS.CANCELLED;
}

export function isSubscriptionTrial(subscription, now = new Date()) {
  return getEffectiveStatus(subscription, now) === SUBSCRIPTION_STATUS.TRIAL;
}

export function canUsePremiumFeatures(subscription, now = new Date()) {
  return hasFullPackageFeatureAccess(getEffectiveStatus(subscription, now));
}

export function canCreateStudents(subscription, now = new Date()) {
  return canUsePremiumFeatures(subscription, now);
}

export function canCreateLessons(subscription, now = new Date()) {
  return canUsePremiumFeatures(subscription, now);
}

export function canUploadVideos(subscription, now = new Date()) {
  return canUsePremiumFeatures(subscription, now);
}

export function canSendNotifications(subscription, now = new Date()) {
  return canUsePremiumFeatures(subscription, now);
}

export function isSubscriptionWriteBlocked(subscription, now = new Date()) {
  return !canUsePremiumFeatures(subscription, now);
}

export function getSubscriptionBannerForSubscription(subscription, now = new Date()) {
  const status = getEffectiveStatus(subscription, now);
  if (status === SUBSCRIPTION_STATUS.SUSPENDED) {
    return 'Aboneliğiniz geçici olarak askıya alınmıştır. Lütfen yöneticinizle iletişime geçin.';
  }
  if (status === SUBSCRIPTION_STATUS.EXPIRED) {
    return 'Abonelik süreniz sona ermiştir.';
  }
  if (status === SUBSCRIPTION_STATUS.CANCELLED) {
    return 'Aboneliğiniz iptal edilmiştir.';
  }
  return null;
}

/**
 * Yazma işlemi öncesi abonelik kontrolü.
 * @returns {{ allowed: boolean, reason: string|null, status: string|null }}
 */
export function checkSubscriptionPermission(institutionOrSubscription, now = new Date()) {
  if (institutionOrSubscription === null) {
    return { allowed: true, reason: null, status: null };
  }

  const subscription = resolveSubscription(institutionOrSubscription);
  const status = getEffectiveStatus(subscription, now);

  if (canUsePremiumFeatures(subscription, now)) {
    return { allowed: true, reason: null, status };
  }

  return {
    allowed: false,
    reason:
      SUBSCRIPTION_ACTION_BLOCKED_MESSAGES[status]
      ?? 'Kurum aboneliği nedeniyle bu işlem gerçekleştirilemiyor.',
    status,
  };
}

/** @deprecated alias — checkSubscriptionPermission kullanın */
export const validateSubscriptionAction = checkSubscriptionPermission;

/** @param {object | null | undefined} institution */
export function buildAccessFromInstitution(institution, now = new Date()) {
  const subscription = resolveSubscription(institution);
  const effectiveStatus = getEffectiveStatus(subscription, now);
  return {
    subscription,
    subscriptionStatus: effectiveStatus,
    status: normalizeSubscriptionStatus(subscription.status),
    subscriptionBanner: getSubscriptionBannerForSubscription(subscription, now),
    isWriteBlocked: isSubscriptionWriteBlocked(subscription, now),
    isFullyBlocked: effectiveStatus === SUBSCRIPTION_STATUS.CANCELLED,
    isLimited: isLimitedAccessStatus(effectiveStatus),
    canUseFeatures: canUsePremiumFeatures(subscription, now),
    canCreateStudents: canCreateStudents(subscription, now),
    canCreateLessons: canCreateLessons(subscription, now),
    canUploadVideos: canUploadVideos(subscription, now),
    canSendNotifications: canSendNotifications(subscription, now),
  };
}
