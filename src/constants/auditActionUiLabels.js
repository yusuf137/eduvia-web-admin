import { AUDIT_ACTIONS } from './auditActions';

/**
 * Audit action → Türkçe UI etiketleri.
 * Firestore'daki `action` değerleri İngilizce kalır; yalnızca arayüzde kullanılır.
 * Yeni işlem türü eklendiğinde buraya bir satır eklemek yeterlidir.
 */
export const AUDIT_ACTION_UI_LABELS = Object.freeze({
  [AUDIT_ACTIONS.INSTITUTION_CREATED]: 'Kurum Oluşturuldu',
  [AUDIT_ACTIONS.INSTITUTION_UPDATED]: 'Kurum Güncellendi',
  [AUDIT_ACTIONS.INSTITUTION_DELETED]: 'Kurum Silindi',
  [AUDIT_ACTIONS.SUBSCRIPTION_ACTIVATED]: 'Abonelik Aktifleştirildi',
  [AUDIT_ACTIONS.SUBSCRIPTION_SUSPENDED]: 'Abonelik Askıya Alındı',
  [AUDIT_ACTIONS.SUBSCRIPTION_CANCELLED]: 'Abonelik İptal Edildi',
  [AUDIT_ACTIONS.SUBSCRIPTION_EXPIRED]: 'Abonelik Süresi Doldu',
  [AUDIT_ACTIONS.PAYMENT_ADDED]: 'Ödeme Eklendi',
  [AUDIT_ACTIONS.PAYMENT_UPDATED]: 'Ödeme Güncellendi',
  [AUDIT_ACTIONS.PAYMENT_DELETED]: 'Ödeme Silindi',
  [AUDIT_ACTIONS.RECEIPT_GENERATED]: 'Makbuz Oluşturuldu',
  [AUDIT_ACTIONS.RECEIPT_UPLOADED]: 'Makbuz Yüklendi',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_ADDED]: 'Kurum Notu Eklendi',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_UPDATED]: 'Kurum Notu Güncellendi',
  [AUDIT_ACTIONS.INSTITUTION_NOTE_DELETED]: 'Kurum Notu Silindi',
  [AUDIT_ACTIONS.ADMIN_LOGIN]: 'Yönetici Giriş Yaptı',
  [AUDIT_ACTIONS.ADMIN_LOGOUT]: 'Yönetici Çıkış Yaptı',
  [AUDIT_ACTIONS.LEGAL_DOCUMENT_UPDATED]: 'Yasal Metin Güncellendi',
  [AUDIT_ACTIONS.INVITATION_CODE_CREATED]: 'Davet Kodu Oluşturuldu',
  [AUDIT_ACTIONS.INVITATION_CODE_DELETED]: 'Davet Kodu Silindi',
  [AUDIT_ACTIONS.DEMO_REQUEST_APPROVED]: 'Demo Talebi Onaylandı',
  [AUDIT_ACTIONS.DEMO_REQUEST_REJECTED]: 'Demo Talebi Reddedildi',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_CREATED]: 'Red Veren Kurum Eklendi',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_UPDATED]: 'Red Veren Kurum Güncellendi',
  [AUDIT_ACTIONS.REJECTED_INSTITUTION_DELETED]: 'Red Veren Kurum Silindi',
});

/** @param {string} action Firestore action değeri (ör. institution_created) */
export function getAuditActionUiLabel(action) {
  return AUDIT_ACTION_UI_LABELS[action] ?? action;
}
