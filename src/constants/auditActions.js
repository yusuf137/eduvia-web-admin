/** @typedef {'create'|'update'|'delete'|'payment'|'subscription'|'receipt'|'note'|'auth'} AuditColorCategory */

export const AUDIT_ACTIONS = Object.freeze({
  INSTITUTION_CREATED: 'institution_created',
  INSTITUTION_UPDATED: 'institution_updated',
  INSTITUTION_DELETED: 'institution_deleted',
  SUBSCRIPTION_ACTIVATED: 'subscription_activated',
  SUBSCRIPTION_SUSPENDED: 'subscription_suspended',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',
  SUBSCRIPTION_EXPIRED: 'subscription_expired',
  PAYMENT_ADDED: 'payment_added',
  PAYMENT_UPDATED: 'payment_updated',
  PAYMENT_DELETED: 'payment_deleted',
  RECEIPT_GENERATED: 'receipt_generated',
  RECEIPT_UPLOADED: 'receipt_uploaded',
  INSTITUTION_NOTE_ADDED: 'institution_note_added',
  INSTITUTION_NOTE_UPDATED: 'institution_note_updated',
  INSTITUTION_NOTE_DELETED: 'institution_note_deleted',
  ADMIN_LOGIN: 'admin_login',
  ADMIN_LOGOUT: 'admin_logout',
  LEGAL_DOCUMENT_UPDATED: 'legal_document_updated',
  INVITATION_CODE_CREATED: 'invitation_code_created',
  INVITATION_CODE_DELETED: 'invitation_code_deleted',
  DEMO_REQUEST_APPROVED: 'demo_request_approved',
  DEMO_REQUEST_REJECTED: 'demo_request_rejected',
  REJECTED_INSTITUTION_CREATED: 'rejected_institution_created',
  REJECTED_INSTITUTION_UPDATED: 'rejected_institution_updated',
  REJECTED_INSTITUTION_DELETED: 'rejected_institution_deleted',
  LESSON_CANCELLATION_REQUEST_CREATED: 'lesson_cancellation_request_created',
  LESSON_CANCELLATION_REQUEST_APPROVED: 'lesson_cancellation_request_approved',
  LESSON_CANCELLATION_REQUEST_REJECTED: 'lesson_cancellation_request_rejected',
  MAKEUP_CREDIT_GRANTED: 'makeup_credit_granted',
  MAKEUP_LESSON_REQUEST_CREATED: 'makeup_lesson_request_created',
  MAKEUP_CREDIT_RESERVED: 'makeup_credit_reserved',
  MAKEUP_LESSON_REQUEST_APPROVED: 'makeup_lesson_request_approved',
  MAKEUP_LESSON_CREATED_FROM_REQUEST: 'makeup_lesson_created_from_request',
  MAKEUP_LESSON_REQUEST_REJECTED: 'makeup_lesson_request_rejected',
  MAKEUP_CREDIT_RETURNED: 'makeup_credit_returned',
});

export const AUDIT_ACTION_KEYS = Object.freeze(Object.values(AUDIT_ACTIONS));

/** @type {Record<string, AuditColorCategory>} */
export const AUDIT_ACTION_COLOR_CATEGORY = Object.freeze({
  [AUDIT_ACTIONS.INSTITUTION_CREATED]: 'create',
  [AUDIT_ACTIONS.INSTITUTION_UPDATED]: 'update',
  [AUDIT_ACTIONS.INSTITUTION_DELETED]: 'delete',
  [AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED]: 'subscription',
  [AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED]: 'subscription',
  [AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED]: 'subscription',
  [AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED]: 'subscription',
  [AUDIT_ACTIONS.PAYMENT_ADDED]: 'payment',
  [AUDIT_ACTIONS.PAYMENT_UPDATED]: 'payment',
  [AUDIT_ACTIONS.PAYMENT_DELETED]: 'payment',
  [AUDIT_ACTIONS.RECEIPT_GENERATED]: 'receipt',
  [AUDIT_ACTIONS.RECEIPT_UPLOADED]: 'receipt',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_ADDED]: 'note',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_UPDATED]: 'note',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_DELETED]: 'note',
  [AUDIT_ACTIONS.ADMIN_LOGIN]: 'auth',
  [AUDIT_ACTIONS.ADMIN_LOGOUT]: 'auth',
  [AUDIT_ACTIONS.LEGAL_DOCUMENT_UPDATED]: 'update',
  [AUDIT_ACTIONS.INVITATION_CODE_CREATED]: 'create',
  [AUDIT_ACTIONS.INVITATION_CODE_DELETED]: 'delete',
  [AUDIT_ACTIONS.DEMO_REQUEST_APPROVED]: 'create',
  [AUDIT_ACTIONS.DEMO_REQUEST_REJECTED]: 'delete',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_CREATED]: 'create',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_UPDATED]: 'update',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_DELETED]: 'delete',
  [AUDIT_ACTIONS.LESSON_CANCELLATION_REQUEST_CREATED]: 'create',
  [AUDIT_ACTIONS.LESSON_CANCELLATION_REQUEST_APPROVED]: 'update',
  [AUDIT_ACTIONS.LESSON_CANCELLATION_REQUEST_REJECTED]: 'delete',
  [AUDIT_ACTIONS.MAKEUP_CREDIT_GRANTED]: 'subscription',
  [AUDIT_ACTIONS.MAKEUP_LESSON_REQUEST_CREATED]: 'create',
  [AUDIT_ACTIONS.MAKEUP_CREDIT_RESERVED]: 'update',
  [AUDIT_ACTIONS.MAKEUP_LESSON_REQUEST_APPROVED]: 'update',
  [AUDIT_ACTIONS.MAKEUP_LESSON_CREATED_FROM_REQUEST]: 'create',
  [AUDIT_ACTIONS.MAKEUP_LESSON_REQUEST_REJECTED]: 'delete',
  [AUDIT_ACTIONS.MAKEUP_CREDIT_RETURNED]: 'update',
});

export const AUDIT_COLOR_CATEGORY_CLASS = Object.freeze({
  create: 'audit-badge--create',
  update: 'audit-badge--update',
  delete: 'audit-badge--delete',
  payment: 'audit-badge--payment',
  subscription: 'audit-badge--subscription',
  receipt: 'audit-badge--receipt',
  note: 'audit-badge--note',
  auth: 'audit-badge--update',
});

export const AUDIT_MODULES = Object.freeze({
  INSTITUTION: 'institution',
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
  RECEIPT: 'receipt',
  NOTE: 'note',
  AUTH: 'auth',
  LEGAL: 'legal',
  INVITE: 'invite',
  DEMO: 'demo',
  REJECTED_INSTITUTION: 'rejected_institution',
  REQUEST: 'request',
});

export const AUDIT_MODULE_LABELS = Object.freeze({
  [AUDIT_MODULES.INSTITUTION]: 'Kurum',
  [AUDIT_MODULES.SUBSCRIPTION]: 'Abonelik',
  [AUDIT_MODULES.PAYMENT]: 'Ödeme',
  [AUDIT_MODULES.RECEIPT]: 'Makbuz',
  [AUDIT_MODULES.NOTE]: 'Not',
  [AUDIT_MODULES.AUTH]: 'Oturum',
  [AUDIT_MODULES.LEGAL]: 'Yasal Metin',
  [AUDIT_MODULES.INVITE]: 'Davet Kodu',
  [AUDIT_MODULES.DEMO]: 'Demo Talebi',
  [AUDIT_MODULES.REJECTED_INSTITUTION]: 'Red Veren Kurum',
  [AUDIT_MODULES.REQUEST]: 'Talep',
});

/** @param {string} action */
export function getAuditActionBadgeClass(action) {
  const category = AUDIT_ACTION_COLOR_CATEGORY[action] ?? 'update';
  return AUDIT_COLOR_CATEGORY_CLASS[category] ?? 'audit-badge--update';
}
