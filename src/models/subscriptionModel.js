import { Timestamp } from 'firebase/firestore';
import { normalizePackageName, resolvePackageNameFromInstitutionPlan } from '../constants/packageType';
import {
  resolvePackageForInstitution,
  resolvePackageMonthlyPrice,
} from '../utils/packageResolver';
import {
  DEFAULT_TRIAL_DAYS,
  SUBSCRIPTION_STATUS,
  addDays,
  normalizeSubscriptionStatus,
} from '../constants/subscriptionStatus';

/**
 * @typedef {import('../types/subscription').InstitutionSubscription} InstitutionSubscription
 * @typedef {import('../types/subscription').SubscriptionFirestoreMap} SubscriptionFirestoreMap
 */

function mapTimestamp(value) {
  if (!value) return null;
  if (value instanceof Timestamp) return value;
  if (value?.toDate) return value;
  return null;
}

/**
 * @param {SubscriptionFirestoreMap | null | undefined} raw
 * @param {object | null | undefined} [institution]
 * @param {import('../types/package').PackageRecord[]|null} [packages]
 * @returns {InstitutionSubscription}
 */
export function normalizeSubscription(raw, institution = null, packages = null) {
  const resolvedPkg = packages?.length
    ? resolvePackageForInstitution(institution, packages)
    : null;

  const legacyStatus = institution?.subscriptionStatus ?? raw?.status ?? institution?.status;
  const legacyPackage =
    raw?.packageName
    ?? raw?.package
    ?? institution?.subscription?.packageName
    ?? resolvedPkg?.name
    ?? resolvePackageNameFromInstitutionPlan(institution?.plan);

  const status = normalizeSubscriptionStatus(raw?.status ?? legacyStatus, legacyStatus);
  const packageName = resolvedPkg?.name ?? normalizePackageName(legacyPackage);
  const monthlyPrice =
    raw?.monthlyPrice != null
      ? Number(raw.monthlyPrice)
      : raw?.monthlyFee != null
        ? Number(raw.monthlyFee)
        : institution?.subscription?.monthlyPrice != null
          ? Number(institution.subscription.monthlyPrice)
          : resolvedPkg
            ? resolvePackageMonthlyPrice(resolvedPkg, null)
            : null;

  return {
    packageName,
    status,
    monthlyPrice,
    startDate: mapTimestamp(raw?.startDate ?? institution?.subscription?.startDate),
    endDate: mapTimestamp(
      raw?.endDate ?? raw?.trialEndDate ?? institution?.subscription?.endDate ?? institution?.trialEndDate,
    ),
    lastPaymentDate: mapTimestamp(raw?.lastPaymentDate ?? institution?.subscription?.lastPaymentDate),
    nextPaymentDate: mapTimestamp(raw?.nextPaymentDate ?? institution?.subscription?.nextPaymentDate),
    autoRenew: raw?.autoRenew === true,
    cancelledAt: mapTimestamp(raw?.cancelledAt ?? institution?.subscription?.cancelledAt),
    suspendedAt: mapTimestamp(raw?.suspendedAt ?? institution?.subscription?.suspendedAt),
    createdAt: mapTimestamp(raw?.createdAt ?? institution?.subscription?.createdAt),
    updatedAt: mapTimestamp(raw?.updatedAt ?? institution?.subscription?.updatedAt),
  };
}

/** @returns {SubscriptionFirestoreMap} */
export function buildDefaultSubscription(institution = null, packages = null) {
  const resolvedPkg = packages?.length
    ? resolvePackageForInstitution(institution, packages)
    : null;
  const packageName = resolvedPkg?.name ?? resolvePackageNameFromInstitutionPlan(institution?.plan);
  const start = institution?.createdAt?.toDate?.() ?? new Date();
  return {
    packageName,
    status: SUBSCRIPTION_STATUS.TRIAL,
    monthlyPrice: null,
    startDate: null,
    endDate: null,
    lastPaymentDate: null,
    nextPaymentDate: null,
    autoRenew: false,
    cancelledAt: null,
    suspendedAt: null,
    createdAt: null,
    updatedAt: null,
    _defaultStart: start,
  };
}

/** @param {InstitutionSubscription} subscription */
export function subscriptionToFirestore(subscription) {
  /** @type {SubscriptionFirestoreMap} */
  const payload = {
    packageName: normalizePackageName(subscription.packageName),
    status: normalizeSubscriptionStatus(subscription.status),
    autoRenew: subscription.autoRenew === true,
  };

  if (subscription.monthlyPrice != null) payload.monthlyPrice = Number(subscription.monthlyPrice);
  if (subscription.startDate) payload.startDate = subscription.startDate;
  if (subscription.endDate) payload.endDate = subscription.endDate;
  if (subscription.lastPaymentDate) payload.lastPaymentDate = subscription.lastPaymentDate;
  if (subscription.nextPaymentDate) payload.nextPaymentDate = subscription.nextPaymentDate;
  if (subscription.cancelledAt) payload.cancelledAt = subscription.cancelledAt;
  if (subscription.suspendedAt) payload.suspendedAt = subscription.suspendedAt;
  if (subscription.createdAt) payload.createdAt = subscription.createdAt;
  if (subscription.updatedAt) payload.updatedAt = subscription.updatedAt;

  return payload;
}

/**
 * Abonelik listesi / tablo satırı (geriye dönük alan adları dahil).
 * @param {string} institutionId
 * @param {string} institutionName
 * @param {InstitutionSubscription} subscription
 */
export function toSubscriptionListRow(
  institutionId,
  institutionName,
  subscription,
  institutionMeta = {},
) {
  return {
    id: institutionId,
    institutionId,
    institutionName,
    ...subscription,
    packageId: institutionMeta.packageId ?? null,
    plan: institutionMeta.plan ?? null,
    package: subscription.packageName,
    packageName: subscription.packageName,
    monthlyFee: subscription.monthlyPrice ?? 0,
    monthlyPrice: subscription.monthlyPrice,
    subscriptionStatus: subscription.status,
    status: subscription.status,
    trialEndDate: subscription.endDate,
  };
}

export function buildTrialEndDate(startDate = new Date()) {
  return Timestamp.fromDate(addDays(startDate, DEFAULT_TRIAL_DAYS));
}

export { SUBSCRIPTION_STATUS };
