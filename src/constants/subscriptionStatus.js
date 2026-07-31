/**
 * Abonelik durumları — tek kaynak (enum).
 * Tüm yetkilendirme subscriptionStatus alanına dayanır; package tek başına yetki vermez.
 */

export const SUBSCRIPTION_STATUS = Object.freeze({
  TRIAL: 'trial',
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled',
});

export const SUBSCRIPTION_STATUS_KEYS = Object.freeze(Object.values(SUBSCRIPTION_STATUS));

export const SUBSCRIPTION_STATUS_LABELS = Object.freeze({
  [SUBSCRIPTION_STATUS.TRIAL]: 'Trial',
  [SUBSCRIPTION_STATUS.ACTIVE]: 'Aktif',
  [SUBSCRIPTION_STATUS.SUSPENDED]: 'Askıda',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'Süresi Doldu',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'İptal Edildi',
});

/** Tutarlı badge renkleri — trial: mavi, active: yeşil, suspended: turuncu, expired: kırmızı, cancelled: gri */
export const SUBSCRIPTION_STATUS_BADGE_CLASS = Object.freeze({
  [SUBSCRIPTION_STATUS.TRIAL]: 'badge--info',
  [SUBSCRIPTION_STATUS.ACTIVE]: 'badge--ok',
  [SUBSCRIPTION_STATUS.SUSPENDED]: 'badge--warn',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'badge--danger',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'badge--muted',
});

export const SUBSCRIPTION_BANNER_MESSAGES = Object.freeze({
  [SUBSCRIPTION_STATUS.SUSPENDED]:
    'Aboneliğiniz geçici olarak askıya alınmıştır. Lütfen yöneticinizle iletişime geçin.',
  [SUBSCRIPTION_STATUS.EXPIRED]: 'Abonelik süreniz sona ermiştir.',
  [SUBSCRIPTION_STATUS.CANCELLED]: 'Aboneliğiniz iptal edilmiştir.',
});

/** İşlem engellendi modalı — duruma göre ana mesaj */
export const SUBSCRIPTION_ACTION_BLOCKED_MESSAGES = Object.freeze({
  [SUBSCRIPTION_STATUS.SUSPENDED]:
    'Kurum aboneliği geçici olarak askıya alındığı için bu işlem gerçekleştirilemiyor.',
  [SUBSCRIPTION_STATUS.EXPIRED]:
    'Kurum aboneliğinin süresi dolduğu için bu işlem gerçekleştirilemiyor.',
  [SUBSCRIPTION_STATUS.CANCELLED]:
    'Kurum aboneliği iptal edildiği için bu işlem gerçekleştirilemiyor.',
});

export const SUBSCRIPTION_ACTION_BLOCKED_FOOTNOTE =
  'Lütfen aboneliği tekrar aktif hale getirdikten sonra işlemi yeniden deneyin.';

export const SUBSCRIPTION_ACTION_BLOCKED_TITLE = 'İşlem Gerçekleştirilemedi';

/** Varsayılan deneme süresi (gün) — yeni trial abonelikler için */
export const DEFAULT_TRIAL_DAYS = 14;

const LEGACY_STATUS_MAP = Object.freeze({
  inactive: SUBSCRIPTION_STATUS.SUSPENDED,
  pending: SUBSCRIPTION_STATUS.TRIAL,
  overdue: SUBSCRIPTION_STATUS.EXPIRED,
});

/**
 * @param {string | null | undefined} value
 * @param {string | null | undefined} [legacyStatus]
 */
export function normalizeSubscriptionStatus(value, legacyStatus) {
  const raw = String(value ?? legacyStatus ?? '').trim();
  if (SUBSCRIPTION_STATUS_KEYS.includes(raw)) {
    return raw;
  }
  if (raw in LEGACY_STATUS_MAP) {
    return LEGACY_STATUS_MAP[raw];
  }
  if (legacyStatus === 'cancelled') {
    return SUBSCRIPTION_STATUS.CANCELLED;
  }
  return SUBSCRIPTION_STATUS.ACTIVE;
}

/**
 * Kayıtlı durumu döndürür; trial bitiş tarihi geçmişse expired (otomatik geçiş altyapısı).
 * @param {{ subscriptionStatus?: string, status?: string, trialEndDate?: { toDate?: () => Date } | null }} record
 * @param {Date} [now]
 */
export function resolveEffectiveSubscriptionStatus(record, now = new Date()) {
  const stored = normalizeSubscriptionStatus(record?.subscriptionStatus, record?.status);
  if (stored !== SUBSCRIPTION_STATUS.TRIAL) {
    return stored;
  }
  const trialEnd = record?.endDate?.toDate?.() ?? record?.trialEndDate?.toDate?.();
  if (trialEnd && trialEnd.getTime() < now.getTime()) {
    return SUBSCRIPTION_STATUS.EXPIRED;
  }
  return SUBSCRIPTION_STATUS.TRIAL;
}

export function hasFullPackageFeatureAccess(status) {
  return status === SUBSCRIPTION_STATUS.TRIAL || status === SUBSCRIPTION_STATUS.ACTIVE;
}

export function hasDashboardAccess(status) {
  return status !== SUBSCRIPTION_STATUS.CANCELLED;
}

export function isLimitedAccessStatus(status) {
  return status === SUBSCRIPTION_STATUS.SUSPENDED || status === SUBSCRIPTION_STATUS.EXPIRED;
}

export function isSubscriptionWriteBlocked(status) {
  return !hasFullPackageFeatureAccess(status);
}

export function canUseModuleWithSubscription(status, moduleKey) {
  if (hasFullPackageFeatureAccess(status)) {
    return true;
  }
  if (status === SUBSCRIPTION_STATUS.CANCELLED) {
    return moduleKey === 'webPanel' || !moduleKey;
  }
  if (isLimitedAccessStatus(status)) {
    return true;
  }
  return false;
}

export function getSubscriptionBannerMessage(status) {
  return SUBSCRIPTION_BANNER_MESSAGES[status] ?? null;
}

export function getSubscriptionStatusMetaFromKey(status) {
  const key = normalizeSubscriptionStatus(status);
  return {
    key,
    label: SUBSCRIPTION_STATUS_LABELS[key] ?? key,
    badgeClass: SUBSCRIPTION_STATUS_BADGE_CLASS[key] ?? 'badge--muted',
  };
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
