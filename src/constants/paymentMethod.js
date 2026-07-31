/**
 * Abonelik ödeme yöntemleri — gateway entegrasyonu için sabit anahtarlar.
 */

export const PAYMENT_METHOD = Object.freeze({
  BANK_TRANSFER: 'bank_transfer',
  CASH: 'cash',
  CREDIT_CARD: 'credit_card',
  MANUAL: 'manual',
  IYZICO: 'iyzico',
  PAYTR: 'paytr',
});

export const PAYMENT_METHOD_KEYS = Object.freeze(Object.values(PAYMENT_METHOD));

export const PAYMENT_METHOD_LABELS = Object.freeze({
  [PAYMENT_METHOD.BANK_TRANSFER]: 'Havale/EFT',
  [PAYMENT_METHOD.CASH]: 'Nakit',
  [PAYMENT_METHOD.CREDIT_CARD]: 'Kredi Kartı',
  [PAYMENT_METHOD.MANUAL]: 'Manuel',
  [PAYMENT_METHOD.IYZICO]: 'iyzico',
  [PAYMENT_METHOD.PAYTR]: 'PayTR',
});

const LEGACY_TYPE_MAP = Object.freeze({
  other: PAYMENT_METHOD.MANUAL,
  bank_transfer: PAYMENT_METHOD.BANK_TRANSFER,
  credit_card: PAYMENT_METHOD.CREDIT_CARD,
  cash: PAYMENT_METHOD.CASH,
});

/** @param {string | null | undefined} value */
export function normalizePaymentMethod(value) {
  const raw = String(value ?? '').trim();
  if (PAYMENT_METHOD_KEYS.includes(raw)) {
    return raw;
  }
  if (raw in LEGACY_TYPE_MAP) {
    return LEGACY_TYPE_MAP[raw];
  }
  return PAYMENT_METHOD.MANUAL;
}
