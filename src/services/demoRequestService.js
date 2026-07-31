import { db } from '../firebase/firebaseConfig';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';
import { doc, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

/**
 * @param {string} requestId
 * @param {string} newStatus
 * @param {object} [requestData]
 */
export async function updateDemoRequestStatus(requestId, newStatus, requestData = {}) {
  const id = String(requestId ?? '').trim();
  const status = String(newStatus ?? '').trim();
  if (!id || !status) {
    throw new Error('Demo talebi güncellenemedi.');
  }

  await updateDoc(doc(db, 'demoRequests', id), {
    status,
    updatedAt: serverTimestamp(),
  });

  const contactName = String(requestData.contactName ?? requestData.name ?? 'Demo talebi').trim();
  if (status === 'converted') {
    auditLogger.log({
      action: AUDIT_ACTIONS.DEMO_REQUEST_APPROVED,
      module: AUDIT_MODULES.DEMO,
      description: `${contactName} demo talebi onaylandı (Müşteri Oldu).`,
      newData: { status, requestId: id, contactName },
    });
  } else if (status === 'rejected') {
    auditLogger.log({
      action: AUDIT_ACTIONS.DEMO_REQUEST_REJECTED,
      module: AUDIT_MODULES.DEMO,
      description: `${contactName} demo talebi reddedildi.`,
      newData: { status, requestId: id, contactName },
    });
  }
}

/** @param {string} requestId @param {object} [requestData] */
export async function deleteDemoRequest(requestId, requestData = {}) {
  const id = String(requestId ?? '').trim();
  if (!id) {
    throw new Error('Demo talebi silinemedi.');
  }

  const contactName = String(requestData.contactName ?? requestData.name ?? 'Demo talebi').trim();
  await deleteDoc(doc(db, 'demoRequests', id));

  auditLogger.log({
    action: AUDIT_ACTIONS.DEMO_REQUEST_REJECTED,
    module: AUDIT_MODULES.DEMO,
    description: `${contactName} demo talebi silindi.`,
    oldData: { requestId: id, contactName, ...(requestData ?? {}) },
  });
}
