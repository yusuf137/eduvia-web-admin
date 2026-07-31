/**
 * Abonelik ödeme durumları — iyzico / PayTR webhook uyumlu enum.
 */

export const PAYMENT_STATUS = Object.freeze({
  SUCCESS: 'success',
  PENDING: 'pending',
  FAILED: 'failed',
  REFUND: 'refund',
});

export const PAYMENT_STATUS_KEYS = Object.freeze(Object.values(PAYMENT_STATUS));

export const PAYMENT_STATUS_LABELS = Object.freeze({
  [PAYMENT_STATUS.SUCCESS]: 'Başarılı',
  [PAYMENT_STATUS.PENDING]: 'Bekliyor',
  [PAYMENT_STATUS.FAILED]: 'Başarısız',
  [PAYMENT_STATUS.REFUND]: 'İade',
});

export const PAYMENT_STATUS_BADGE_CLASS = Object.freeze({
  [PAYMENT_STATUS.SUCCESS]: 'badge--ok',
  [PAYMENT_STATUS.PENDING]: 'badge--warn',
  [PAYMENT_STATUS.FAILED]: 'badge--danger',
  [PAYMENT_STATUS.REFUND]: 'badge--muted',
});

/** @param {string | null | undefined} value */
export function normalizePaymentStatus(value) {
  const raw = String(value ?? '').trim();
  if (PAYMENT_STATUS_KEYS.includes(raw)) {
    return raw;
  }
  return PAYMENT_STATUS.PENDING;
}
