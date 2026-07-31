/**
 * @typedef {import('firebase/firestore').Timestamp} FirestoreTimestamp
 */

/**
 * @typedef {'success'|'pending'|'failed'|'refund'} PaymentStatusValue
 */

/**
 * @typedef {'bank_transfer'|'cash'|'credit_card'|'manual'|'iyzico'|'paytr'} PaymentMethodValue
 */

/**
 * @typedef {'TRY'|'USD'|'EUR'} PaymentCurrencyValue
 */

/**
 * @typedef {Object} SubscriptionPaymentRecord
 * @property {string} id
 * @property {string} paymentNumber
 * @property {string} institutionId
 * @property {string} institutionName
 * @property {string} subscriptionId
 * @property {string} packageName
 * @property {number} amount
 * @property {PaymentCurrencyValue|string} currency
 * @property {PaymentMethodValue|string} paymentMethod
 * @property {PaymentStatusValue|string} status
 * @property {FirestoreTimestamp|null} paymentDate
 * @property {FirestoreTimestamp|null} nextPaymentDate
 * @property {string|null} transactionReference
 * @property {string} description
 * @property {string|null} createdBy
 * @property {string} createdByName
 * @property {FirestoreTimestamp|null} createdAt
 * @property {FirestoreTimestamp|null} updatedAt
 * @property {string|null} [receiptUrl]
 * @property {string|null} [receiptFileName]
 * @property {FirestoreTimestamp|null} [receiptUploadedAt]
 * @property {string|null} [receiptUploadedBy]
 * @property {string|null} [generatedReceiptUrl]
 * @property {FirestoreTimestamp|null} [generatedReceiptCreatedAt]
 * @property {string|null} [generatedReceiptCreatedBy]
 * @property {number} [receiptVersion]
 * @property {boolean} [deleted]
 * @property {FirestoreTimestamp|null} [deletedAt]
 * @property {string|null} [deletedBy]
 * @property {boolean} [legacy]
 */

/**
 * @typedef {Object} SubscriptionPaymentCreateInput
 * @property {string} institutionId
 * @property {string} [institutionName]
 * @property {string} [packageName]
 * @property {number} amount
 * @property {PaymentCurrencyValue|string} [currency]
 * @property {PaymentMethodValue|string} paymentMethod
 * @property {PaymentStatusValue|string} status
 * @property {Date} paymentDate
 * @property {Date|null} [nextPaymentDate]
 * @property {string} [transactionReference]
 * @property {string} [description]
 * @property {File|null} [receiptFile]
 */

/**
 * @typedef {Object} PaymentHistoryStats
 * @property {number} collectedThisMonth
 * @property {number} pendingTotal
 * @property {number} overdueTotal
 * @property {number} totalCollected
 */

export {};
