/**
 * @typedef {import('firebase/firestore').Timestamp} FirestoreTimestamp
 */

/**
 * @typedef {Object} RejectedInstitutionRecord
 * @property {string} id
 * @property {string} institutionName
 * @property {string} contactPerson
 * @property {string} phone
 * @property {string} email
 * @property {string} reason
 * @property {string} customReason
 * @property {string} notes
 * @property {boolean} recontact
 * @property {FirestoreTimestamp|null} rejectedAt
 * @property {FirestoreTimestamp|null} createdAt
 * @property {FirestoreTimestamp|null} updatedAt
 * @property {boolean} deleted
 * @property {FirestoreTimestamp|null} deletedAt
 * @property {string|null} deletedBy
 * @property {string|null} createdBy
 * @property {string} createdByName
 */

/**
 * @typedef {Object} RejectedInstitutionWriteInput
 * @property {string} institutionName
 * @property {string} [contactPerson]
 * @property {string} phone
 * @property {string} [email]
 * @property {string} reason
 * @property {string} [customReason]
 * @property {string} [notes]
 * @property {boolean} [recontact]
 * @property {Date|null} [rejectedAt]
 */

/**
 * @typedef {Object} RejectedInstitutionDashboardStats
 * @property {number} total
 * @property {number} addedThisMonth
 * @property {string} mostCommonReason
 * @property {number} recontactOpen
 */

export {};
