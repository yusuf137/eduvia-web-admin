/**
 * Kurum modül anahtarları — Firestore institutions.modules
 * Eski kayıtlar: videos → videoLibrary, makeup → makeupLessons
 */

export const DEFAULT_MODULES = {
  lessons: true,
  attendance: true,
  payments: true,
  finance: true,
  scheduleRequests: true,
  makeupLessons: true,
  videoLibrary: true,
  chat: true,
  notifications: true,
  branches: true,
  webPanel: true,
};

export const LEGACY_MODULE_ALIASES = {
  videos: 'videoLibrary',
  makeup: 'makeupLessons',
};

export const MODULE_DEFINITIONS = [
  { key: 'lessons', label: 'Ders Yönetimi', shortLabel: 'Ders' },
  { key: 'attendance', label: 'Yoklama', shortLabel: 'Yoklama' },
  { key: 'payments', label: 'Ödeme Takibi', shortLabel: 'Ödeme' },
  { key: 'finance', label: 'Finans', shortLabel: 'Finans' },
  { key: 'scheduleRequests', label: 'Ders Değişim Talepleri', shortLabel: 'Değişim' },
  { key: 'makeupLessons', label: 'Telafi Dersleri', shortLabel: 'Telafi' },
  { key: 'videoLibrary', label: 'Video Havuzu', shortLabel: 'Video' },
  { key: 'chat', label: 'Mesajlaşma', shortLabel: 'Mesaj' },
  { key: 'notifications', label: 'Bildirimler', shortLabel: 'Bildirim' },
  { key: 'branches', label: 'Branş Yönetimi', shortLabel: 'Branş' },
  { key: 'webPanel', label: 'Web Panel', shortLabel: 'Web' },
];

export function resolveModuleKey(key) {
  if (!key) return key;
  return LEGACY_MODULE_ALIASES[key] || key;
}

export function normalizeModules(raw) {
  const merged = { ...DEFAULT_MODULES, ...(raw ?? {}) };

  if (merged.videos === false) merged.videoLibrary = false;
  if (merged.makeup === false) merged.makeupLessons = false;
  if (merged.videoLibrary === false) merged.videos = false;
  if (merged.makeupLessons === false) merged.makeup = false;

  const out = { ...DEFAULT_MODULES };
  Object.keys(DEFAULT_MODULES).forEach((key) => {
    out[key] = merged[key] !== false;
  });
  return out;
}

export function buildModulesPayload(modules) {
  const canonical = normalizeModules(modules);
  return {
    ...canonical,
    videos: canonical.videoLibrary,
    makeup: canonical.makeupLessons,
  };
}

export function isModuleEnabled(modules, moduleKey) {
  if (!moduleKey) return true;
  const normalized = normalizeModules(modules);
  const canonical = resolveModuleKey(moduleKey);
  if (normalized[canonical] === false) return false;
  const legacyEntry = Object.entries(LEGACY_MODULE_ALIASES).find(([, v]) => v === canonical);
  if (legacyEntry && normalized[legacyEntry[0]] === false) return false;
  return true;
}

export function formatModulesSummary(modules) {
  const normalized = normalizeModules(modules);
  const active = MODULE_DEFINITIONS.filter((d) => normalized[d.key]);
  if (active.length === 0) return 'Özellik kapalı';
  if (active.length === MODULE_DEFINITIONS.length) return 'Tüm özellikler açık';
  const text = active.map((d) => d.shortLabel).join(', ');
  if (text.length > 48) return `${active.length} özellik aktif`;
  return `Modüller: ${text}`;
}
