import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { sanitizeLegalPlainContent, validateLegalDocumentPayload } from '../utils/legalContentSanitize';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';

function mapLegalDoc(snap) {
  const data = snap.data() ?? {};
  return {
    id: snap.id,
    title: String(data.title ?? '').trim(),
    content: sanitizeLegalPlainContent(data.content ?? ''),
    updatedAt: data.updatedAt ?? null,
    updatedBy: String(data.updatedBy ?? ''),
  };
}

/**
 * @param {string} documentId
 */
export async function fetchLegalDocument(documentId) {
  const id = String(documentId ?? '').trim();
  if (!id) {
    return null;
  }
  const snap = await getDoc(doc(db, 'legalDocuments', id));
  if (!snap.exists()) {
    return null;
  }
  return mapLegalDoc(snap);
}

/**
 * @param {string} documentId
 * @param {{ title: string, content: string }} payload
 * @param {string} [updatedByUid]
 */
export async function saveLegalDocument(documentId, { title, content }, updatedByUid) {
  const id = String(documentId ?? '').trim();
  const uid = String(updatedByUid ?? auth.currentUser?.uid ?? '').trim();
  if (!id) {
    throw new Error('Geçersiz doküman kimliği.');
  }
  if (!uid) {
    throw new Error('Oturum bulunamadı.');
  }

  const { title: titleTrim, content: contentTrim } = validateLegalDocumentPayload({ title, content });

  const previous = await fetchLegalDocument(id);

  await setDoc(
    doc(db, 'legalDocuments', id),
    {
      title: titleTrim,
      content: contentTrim,
      contentFormat: 'plain',
      updatedAt: serverTimestamp(),
      updatedBy: uid,
    },
    { merge: true },
  );

  const saved = await fetchLegalDocument(id);

  auditLogger.log({
    action: AUDIT_ACTIONS.LEGAL_DOCUMENT_UPDATED,
    module: AUDIT_MODULES.LEGAL,
    description: `Yasal metin güncellendi: ${titleTrim}.`,
    oldData: previous
      ? { title: previous.title, contentLength: previous.content?.length ?? 0 }
      : null,
    newData: { title: titleTrim, contentLength: contentTrim.length, documentId: id },
  });

  return saved;
}
