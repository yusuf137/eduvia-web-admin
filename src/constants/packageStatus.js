export const PACKAGE_STATUS = Object.freeze({
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  DRAFT: 'draft',
});

export const PACKAGE_STATUS_KEYS = Object.freeze(Object.values(PACKAGE_STATUS));

export const PACKAGE_STATUS_LABELS = Object.freeze({
  [PACKAGE_STATUS.ACTIVE]: 'Aktif',
  [PACKAGE_STATUS.INACTIVE]: 'Pasif',
  [PACKAGE_STATUS.DRAFT]: 'Taslak',
});

export const PACKAGE_STATUS_BADGE_CLASS = Object.freeze({
  [PACKAGE_STATUS.ACTIVE]: 'badge--ok',
  [PACKAGE_STATUS.INACTIVE]: 'badge--muted',
  [PACKAGE_STATUS.DRAFT]: 'badge--warn',
});

/** @param {string|null|undefined} value */
export function normalizePackageStatus(value) {
  const raw = String(value ?? '').trim();
  if (PACKAGE_STATUS_KEYS.includes(raw)) {
    return raw;
  }
  return PACKAGE_STATUS.DRAFT;
}
