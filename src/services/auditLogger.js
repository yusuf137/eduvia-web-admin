import { auth } from '../firebase/firebaseConfig';
import { writeAuditLogRecord } from './auditLogService';

/**
 * Merkezi audit logger — tüm sistem bu servisi kullanmalı.
 * Hata durumunda ana işlemi bozmaz (fire-and-forget).
 */
export const auditLogger = {
  /**
   * @param {import('../types/auditLog').AuditLogWriteInput} input
   */
  log(input) {
    void writeAuditLogRecord(input).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn('AUDIT LOG FAILED:', error?.message ?? error);
    });
  },

  /**
   * @param {import('../types/auditLog').AuditLogWriteInput} input
   */
  async logAsync(input) {
    await writeAuditLogRecord(input);
  },
};

/** SuperAdmin oturum bilgisi */
export function getAuditActor() {
  const user = auth.currentUser;
  return {
    performedByUid: user?.uid ?? null,
    performedByEmail: user?.email ?? null,
    performedBy: user?.displayName || user?.email || 'SuperAdmin',
  };
}
