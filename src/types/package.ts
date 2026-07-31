/**
 * @typedef {import('firebase/firestore').Timestamp} FirestoreTimestamp
 */

/**
 * @typedef {'active'|'inactive'|'draft'} PackageStatusValue
 */

/**
 * @typedef {Object} PackageLimits
 * @property {number} maxStudents
 * @property {number} maxTeachers
 * @property {number} maxAdmins
 * @property {number} maxVideos
 * @property {number} maxStorageGb
 * @property {number} maxNotifications
 * @property {number} maxLessons
 * @property {number} maxBranches
 */

/**
 * @typedef {Record<string, boolean>} PackageFeatures
 */

/**
 * @typedef {Record<string, boolean>} PackageModules
 */

/**
 * @typedef {Object} PackageRecord
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {number|null} monthlyPrice
 * @property {number|null} yearlyPrice
 * @property {string} currency
 * @property {PackageStatusValue|string} status
 * @property {PackageLimits} limits
 * @property {PackageFeatures} features
 * @property {PackageModules} modules
 * @property {number} sortOrder
 * @property {string} color
 * @property {string} icon
 * @property {string} slug
 * @property {number} institutionCount
 * @property {FirestoreTimestamp|null} createdAt
 * @property {FirestoreTimestamp|null} updatedAt
 * @property {boolean} archived
 * @property {boolean} [_fallback]
 */

/**
 * @typedef {Object} PackageWriteInput
 * @property {string} name
 * @property {string} [description]
 * @property {number|null} [monthlyPrice]
 * @property {number|null} [yearlyPrice]
 * @property {string} [currency]
 * @property {PackageStatusValue|string} [status]
 * @property {PackageLimits} [limits]
 * @property {PackageFeatures} [features]
 * @property {PackageModules} [modules]
 * @property {number} [sortOrder]
 * @property {string} [color]
 * @property {string} [icon]
 */

/**
 * @typedef {Object} PackageDashboardStats
 * @property {number} total
 * @property {number} active
 * @property {number} inactive
 * @property {string} mostUsedName
 */

export {};
