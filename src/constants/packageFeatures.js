/** Paket özellik anahtarları — yeni özellik eklemek için buraya satır ekleyin. */
export const PACKAGE_FEATURE_KEYS = Object.freeze([
  'finance',
  'videoPool',
  'videoTracking',
  'weeklySchedule',
  'notifications',
  'developmentNotes',
  'reporting',
  'export',
  'studentPaymentTracking',
  'lessonReminders',
  'multiAdmin',
  'multiBranch',
  'apiAccess',
  'prioritySupport',
  'customTheme',
  'fileUpload',
]);

export const PACKAGE_FEATURE_LABELS = Object.freeze({
  finance: 'Finans',
  videoPool: 'Video Havuzu',
  videoTracking: 'Video Takibi',
  weeklySchedule: 'Haftalık Program',
  notifications: 'Bildirim Sistemi',
  developmentNotes: 'Gelişim Notları',
  reporting: 'Raporlama',
  export: 'Dışa Aktarma',
  studentPaymentTracking: 'Öğrenci Ödeme Takibi',
  lessonReminders: 'Ders Hatırlatmaları',
  multiAdmin: 'Çoklu Yönetici',
  multiBranch: 'Çoklu Şube',
  apiAccess: 'API Erişimi',
  prioritySupport: 'Öncelikli Destek',
  customTheme: 'Özel Tema',
  fileUpload: 'Dosya Yükleme',
});

/** @returns {Record<string, boolean>} */
export function buildDefaultPackageFeatures(enabled = false) {
  return PACKAGE_FEATURE_KEYS.reduce((acc, key) => {
    acc[key] = enabled;
    return acc;
  }, {});
}

/** @param {Record<string, boolean>|null|undefined} raw */
export function normalizePackageFeatures(raw) {
  const base = buildDefaultPackageFeatures(false);
  if (!raw || typeof raw !== 'object') {
    return base;
  }
  PACKAGE_FEATURE_KEYS.forEach((key) => {
    base[key] = raw[key] === true;
  });
  return base;
}
