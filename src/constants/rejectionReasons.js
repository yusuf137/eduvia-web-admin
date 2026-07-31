export const REJECTION_REASON = Object.freeze({
  PRICE_HIGH: 'price_high',
  EXISTING_SYSTEM: 'existing_system',
  NO_NEED: 'no_need',
  EVALUATE_LATER: 'evaluate_later',
  NO_RESPONSE: 'no_response',
  CONTACT_NOT_INTERESTED: 'contact_not_interested',
  NO_BUDGET: 'no_budget',
  UNDECIDED: 'undecided',
  COMPETITOR_PREFERRED: 'competitor_preferred',
  OTHER: 'other',
});

export const REJECTION_REASON_KEYS = Object.freeze(Object.values(REJECTION_REASON));

export const REJECTION_REASON_LABELS = Object.freeze({
  [REJECTION_REASON.PRICE_HIGH]: 'Fiyat yüksek geldi',
  [REJECTION_REASON.EXISTING_SYSTEM]: 'Mevcut bir sistem kullanıyor',
  [REJECTION_REASON.NO_NEED]: 'İhtiyacı yok',
  [REJECTION_REASON.EVALUATE_LATER]: 'Daha sonra değerlendirecek',
  [REJECTION_REASON.NO_RESPONSE]: 'Geri dönüş yapmadı',
  [REJECTION_REASON.CONTACT_NOT_INTERESTED]: 'Yetkili kişi ilgilenmedi',
  [REJECTION_REASON.NO_BUDGET]: 'Bütçe yok',
  [REJECTION_REASON.UNDECIDED]: 'Kararsız',
  [REJECTION_REASON.COMPETITOR_PREFERRED]: 'Rakip firma tercih edildi',
  [REJECTION_REASON.OTHER]: 'Diğer',
});

/** @param {string|null|undefined} reason */
export function getRejectionReasonLabel(reason, customReason = '') {
  const key = String(reason ?? '').trim();
  if (key === REJECTION_REASON.OTHER) {
    const custom = String(customReason ?? '').trim();
    return custom ? `Diğer: ${custom}` : REJECTION_REASON_LABELS[REJECTION_REASON.OTHER];
  }
  return REJECTION_REASON_LABELS[key] ?? (key || '—');
}

/** @param {string|null|undefined} value */
export function normalizeRejectionReason(value) {
  const raw = String(value ?? '').trim();
  if (REJECTION_REASON_KEYS.includes(raw)) {
    return raw;
  }
  return REJECTION_REASON.OTHER;
}
