export const PACKAGE_LIMIT_KEYS = Object.freeze([
  'maxStudents',
  'maxTeachers',
  'maxAdmins',
  'maxVideos',
  'maxStorageGb',
  'maxNotifications',
  'maxLessons',
  'maxBranches',
]);

export const PACKAGE_LIMIT_LABELS = Object.freeze({
  maxStudents: 'Maksimum Öğrenci',
  maxTeachers: 'Maksimum Eğitmen',
  maxAdmins: 'Maksimum Yönetici',
  maxVideos: 'Maksimum Video',
  maxStorageGb: 'Maksimum Depolama (GB)',
  maxNotifications: 'Maksimum Bildirim',
  maxLessons: 'Maksimum Ders',
  maxBranches: 'Maksimum Şube',
});

/** @returns {Record<string, number>} */
export function buildDefaultPackageLimits() {
  return PACKAGE_LIMIT_KEYS.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {});
}

/** @param {Record<string, number>|null|undefined} raw */
export function normalizePackageLimits(raw) {
  const base = buildDefaultPackageLimits();
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  PACKAGE_LIMIT_KEYS.forEach((key) => {
    const num = Number(raw[key] ?? 0);
    base[key] = Number.isFinite(num) && num >= 0 ? num : 0;
  });
  return base;
}

/** @param {number} value 0 = sınırsız */
export function formatPackageLimit(value) {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num === 0) {
    return 'Sınırsız';
  }
  return num.toLocaleString('tr-TR');
}
