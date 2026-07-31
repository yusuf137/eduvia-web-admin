/** @param {number|null|undefined} amount */
export function formatPlanPrice(amount) {
  if (amount == null) {
    return 'Teklif alın';
  }
  return `${Number(amount).toLocaleString('tr-TR')} TL`;
}

/** @param {number|null|undefined} amount */
export function formatCurrency(amount) {
  const value = Number(amount ?? 0);
  return `${value.toLocaleString('tr-TR')} TL`;
}
