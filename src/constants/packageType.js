/**
 * Paket türleri — Firestore subscription.packageName değerleri.
 */

export const PACKAGE_TYPE = Object.freeze({
  BASLANGIC: 'Başlangıç',
  PRO: 'Pro',
  PREMIUM: 'Premium',
});

export const PACKAGE_TYPE_VALUES = Object.freeze(Object.values(PACKAGE_TYPE));

/** Eski anahtar → packageName */
const LEGACY_PACKAGE_KEY_MAP = Object.freeze({
  starter: PACKAGE_TYPE.BASLANGIC,
  standard: PACKAGE_TYPE.BASLANGIC,
  pro: PACKAGE_TYPE.PRO,
  premium: PACKAGE_TYPE.PREMIUM,
  custom: PACKAGE_TYPE.PREMIUM,
});

/** @param {string | null | undefined} value */
export function normalizePackageName(value) {
  const raw = String(value ?? '').trim();
  if (PACKAGE_TYPE_VALUES.includes(raw)) {
    return raw;
  }
  if (raw in LEGACY_PACKAGE_KEY_MAP) {
    return LEGACY_PACKAGE_KEY_MAP[raw];
  }
  if (raw.toLowerCase() === 'pro') return PACKAGE_TYPE.PRO;
  if (raw.toLowerCase() === 'premium') return PACKAGE_TYPE.PREMIUM;
  return PACKAGE_TYPE.BASLANGIC;
}

/** @param {string | null | undefined} packageName */
export function getDefaultMonthlyPriceForPackage(packageName) {
  const name = normalizePackageName(packageName);
  if (name === PACKAGE_TYPE.PRO) return 4490;
  if (name === PACKAGE_TYPE.PREMIUM) return 5990;
  return 1990;
}

/** Kurum plan alanından packageName türet */
export function resolvePackageNameFromInstitutionPlan(plan) {
  const raw = String(plan ?? '').trim();
  if (raw === 'pro') return PACKAGE_TYPE.PRO;
  if (raw === 'standard' || raw === 'premium' || raw === 'custom') return PACKAGE_TYPE.PREMIUM;
  return PACKAGE_TYPE.BASLANGIC;
}
