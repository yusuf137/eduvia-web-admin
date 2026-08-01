/** @typedef {'pending' | 'approved' | 'rejected' | 'cancelled'} LessonCancellationStatus */

/**
 * @typedef {Object} LessonCancellationRecord
 * @property {string} id
 * @property {string} institutionId
 * @property {string} studentId
 * @property {string} studentName
 * @property {string} lessonId
 * @property {string} teacherId
 * @property {string} teacherName
 * @property {string} lessonDate
 * @property {string} weekStartDate
 * @property {string[]} lessonHours
 * @property {string} reason
 * @property {string} branch
 * @property {LessonCancellationStatus} status
 * @property {import('firebase/firestore').Timestamp|null} createdAt
 * @property {string} [createdAtLabel]
 * @property {number} [createdAtMs]
 * @property {string|null} [reviewedBy]
 * @property {import('firebase/firestore').Timestamp|null} [reviewedAt]
 */

export {};
