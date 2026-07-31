export const PAYMENT_CURRENCY = Object.freeze({
  TRY: 'TRY',
  USD: 'USD',
  EUR: 'EUR',
});

export const PAYMENT_CURRENCY_KEYS = Object.freeze(Object.values(PAYMENT_CURRENCY));

export const DEFAULT_PAYMENT_CURRENCY = PAYMENT_CURRENCY.TRY;

/** @param {string | null | undefined} value */
export function normalizePaymentCurrency(value) {
  const raw = String(value ?? DEFAULT_PAYMENT_CURRENCY).trim().toUpperCase();
  if (PAYMENT_CURRENCY_KEYS.includes(raw)) {
    return raw;
  }
  return DEFAULT_PAYMENT_CURRENCY;
}
