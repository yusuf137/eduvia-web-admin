/**
 * @typedef {import('firebase/firestore').Timestamp} FirestoreTimestamp
 */

/**
 * @typedef {'trial'|'active'|'suspended'|'expired'|'cancelled'} SubscriptionStatusValue
 */

/**
 * @typedef {'Başlangıç'|'Pro'|'Premium'} PackageNameValue
 */

/**
 * @typedef {Object} InstitutionSubscription
 * @property {PackageNameValue|string} packageName
 * @property {SubscriptionStatusValue|string} status
 * @property {number|null} monthlyPrice
 * @property {FirestoreTimestamp|null} startDate
 * @property {FirestoreTimestamp|null} endDate
 * @property {FirestoreTimestamp|null} lastPaymentDate
 * @property {FirestoreTimestamp|null} nextPaymentDate
 * @property {boolean} autoRenew
 * @property {FirestoreTimestamp|null} cancelledAt
 * @property {FirestoreTimestamp|null} suspendedAt
 * @property {FirestoreTimestamp|null} createdAt
 * @property {FirestoreTimestamp|null} updatedAt
 */

/**
 * @typedef {Object} SubscriptionFirestoreMap
 * @property {string} [packageName]
 * @property {string} [status]
 * @property {number|null} [monthlyPrice]
 * @property {FirestoreTimestamp|null} [startDate]
 * @property {FirestoreTimestamp|null} [endDate]
 * @property {FirestoreTimestamp|null} [lastPaymentDate]
 * @property {FirestoreTimestamp|null} [nextPaymentDate]
 * @property {boolean} [autoRenew]
 * @property {FirestoreTimestamp|null} [cancelledAt]
 * @property {FirestoreTimestamp|null} [suspendedAt]
 * @property {FirestoreTimestamp|null} [createdAt]
 * @property {FirestoreTimestamp|null} [updatedAt]
 * @property {string} [package]
 * @property {number} [monthlyFee]
 * @property {FirestoreTimestamp|null} [trialEndDate]
 */

/**
 * @typedef {Object} SubscriptionHistoryEntry
 * @property {string} id
 * @property {string} institutionId
 * @property {string|null} oldStatus
 * @property {string|null} newStatus
 * @property {string|null} oldPackage
 * @property {string|null} newPackage
 * @property {string|null} changedBy
 * @property {string} reason
 * @property {FirestoreTimestamp|null} createdAt
 */

export {};
