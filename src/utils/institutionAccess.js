import { isModuleEnabled as checkModuleEnabled } from '../constants/institutionModules';
import {
  buildAccessFromInstitution,
  canUsePremiumFeatures,
  isSubscriptionWriteBlocked,
  resolveSubscription,
} from './subscriptionHelpers';

export { SUBSCRIPTION_STATUS } from '../constants/subscriptionStatus';
export {
  isSubscriptionActive,
  isSubscriptionExpired,
  isSubscriptionSuspended,
  canUsePremiumFeatures,
  canCreateStudents,
  canCreateLessons,
  canUploadVideos,
  canSendNotifications,
  checkSubscriptionPermission,
  validateSubscriptionAction,
} from './subscriptionHelpers';

/** @param {{ subscription?: object } | null | undefined} institution */
export function getInstitutionSubscriptionStatus(institution) {
  return buildAccessFromInstitution(institution).subscriptionStatus;
}

export function canUsePackageFeatures(institution) {
  return buildAccessFromInstitution(institution).canUseFeatures;
}

export function isSubscriptionFullyBlocked(institution) {
  return buildAccessFromInstitution(institution).isFullyBlocked;
}

export function isSubscriptionRestricted(institution) {
  return !canUsePackageFeatures(institution);
}

export function getInstitutionSubscriptionBanner(institution) {
  return buildAccessFromInstitution(institution).subscriptionBanner;
}

export function isInstitutionWriteBlocked(institution) {
  const sub = resolveSubscription(institution);
  return isSubscriptionWriteBlocked(sub);
}

export function isFeatureModuleEnabled(modules, moduleKey, institution) {
  const access = buildAccessFromInstitution(institution);
  if (!access.canUseFeatures && access.isFullyBlocked) {
    return moduleKey === 'webPanel' || !moduleKey;
  }
  return checkModuleEnabled(modules, moduleKey, {
    subscriptionStatus: access.subscriptionStatus,
    status: access.subscriptionStatus,
  });
}

export function buildInstitutionAccessContext(institution) {
  return buildAccessFromInstitution(institution);
}

/** @deprecated */
export function isPackageInactive(institution) {
  return isSubscriptionRestricted(institution);
}

/** @deprecated */
export const INACTIVE_SUBSCRIPTION_MESSAGE =
  'Aboneliğiniz geçici olarak askıya alınmıştır. Lütfen yöneticinizle iletişime geçin.';
