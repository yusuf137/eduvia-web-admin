/**
 * @typedef {import('firebase/firestore').Timestamp} FirestoreTimestamp
 */

/**
 * @typedef {Object} AuditLogRecord
 * @property {string} id
 * @property {string} action
 * @property {string} module
 * @property {string|null} institutionId
 * @property {string|null} institutionName
 * @property {string} performedBy
 * @property {string|null} performedByUid
 * @property {string|null} performedByEmail
 * @property {string} description
 * @property {Record<string, unknown>|null} oldData
 * @property {Record<string, unknown>|null} newData
 * @property {FirestoreTimestamp|null} createdAt
 * @property {string|null} ipAddress
 * @property {string|null} device
 * @property {string|null} browser
 * @property {boolean} deleted
 * @property {FirestoreTimestamp|null} [deletedAt]
 * @property {string|null} [deletedBy]
 */

/**
 * @typedef {Object} AuditLogStats
 * @property {number} todayCount
 * @property {number} last7DaysCount
 * @property {string} mostActiveAdmin
 * @property {FirestoreTimestamp|null} lastActionAt
 */

/**
 * @typedef {Object} AuditLogWriteInput
 * @property {string} action
 * @property {string} module
 * @property {string} [institutionId]
 * @property {string} [institutionName]
 * @property {string} description
 * @property {Record<string, unknown>|null} [oldData]
 * @property {Record<string, unknown>|null} [newData]
 */

export {};
