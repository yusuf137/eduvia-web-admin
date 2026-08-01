/** Firestore lesson cancellation kayıtları — mobil ve web ortak koleksiyon */
export const LESSON_CANCELLATIONS_COLLECTION = 'lessonCancellations';

/** Ders iptal talebi durumları */
export const LESSON_CANCELLATION_STATUS = Object.freeze({
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  /** @deprecated Eski anında iptal kayıtları — approved ile aynı etki */
  CANCELLED: 'cancelled',
});

/** Program / telafi hakkı için geçerli (onaylanmış) iptal durumları */
export function isEffectiveCancellationStatus(status) {
  const s = String(status ?? '');
  return s === LESSON_CANCELLATION_STATUS.APPROVED || s === LESSON_CANCELLATION_STATUS.CANCELLED;
}
