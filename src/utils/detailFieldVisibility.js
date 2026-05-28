/**
 * Firestore / dahili alan anahtarları — detay modal ve otomatik listelerde gösterilmez.
 */
const INTERNAL_DETAIL_FIELD_KEYS = new Set([
  'id',
  'uid',
  'lessonId',
  'baseLessonId',
  'teacherId',
  'studentId',
  'studentIds',
  'institutionId',
  'overrideId',
  'requestId',
  'paymentId',
  'receiptCounterId',
  'userId',
  'videoId',
  'docId',
  'documentId',
  'createdBy',
  'updatedBy',
  'deletedBy',
  'createdAt',
  'updatedAt',
  'deletedAt',
  'createdAtMs',
  'updatedAtMs',
  'sortMs',
  'isActive',
  'sourceType',
  'overrideMeta',
]);

/**
 * @param {string} key
 * @returns {boolean}
 */
export function isInternalDetailField(key) {
  const k = String(key ?? '').trim();
  if (!k) return true;
  if (INTERNAL_DETAIL_FIELD_KEYS.has(k)) return true;
  if (/Ids?$/.test(k)) return true;
  if (k.endsWith('At') && k !== 'paidAtLabel') return true;
  return false;
}

/**
 * @param {Record<string, unknown>|null|undefined} record
 * @returns {[string, unknown][]}
 */
export function filterDetailEntries(record) {
  return Object.entries(record ?? {}).filter(([key]) => !isInternalDetailField(key));
}

/**
 * @param {{ pricePerLesson?: number|string|null }} lesson
 * @returns {string}
 */
export function formatLessonPriceLabel(lesson) {
  const raw = lesson?.pricePerLesson;
  if (raw == null || raw === '') return 'Belirtilmemiş';
  const n = Number(raw);
  if (!Number.isFinite(n) || n === 0) return 'Belirtilmemiş';
  return `${n} ₺`;
}
