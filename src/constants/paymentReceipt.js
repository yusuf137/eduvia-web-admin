/** Makbuz dosyası — desteklenen MIME türleri */
export const RECEIPT_ALLOWED_MIME_TYPES = Object.freeze([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
]);

export const RECEIPT_ALLOWED_EXTENSIONS = Object.freeze(['.pdf', '.jpg', '.jpeg', '.png']);

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const RECEIPT_STORAGE_ROOT = 'payments';

/** @param {File} file */
export function validateReceiptFile(file) {
  if (!file) {
    return { ok: false, message: 'Dosya seçilmedi.' };
  }
  if (file.size > RECEIPT_MAX_BYTES) {
    return { ok: false, message: 'Makbuz dosyası en fazla 10 MB olabilir.' };
  }
  const mime = String(file.type ?? '').toLowerCase();
  const name = String(file.name ?? '').toLowerCase();
  const extOk = RECEIPT_ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
  const mimeOk = RECEIPT_ALLOWED_MIME_TYPES.includes(mime) || mime === 'image/jpg';
  if (!mimeOk && !extOk) {
    return { ok: false, message: 'Yalnızca PDF, JPG, JPEG veya PNG yüklenebilir.' };
  }
  return { ok: true, message: '' };
}

/** @param {string} fileName */
export function buildUniqueReceiptFileName(fileName) {
  const safe = String(fileName ?? 'receipt')
    .replace(/[^\w.\-() ]+/g, '_')
    .replace(/\s+/g, '_');
  return `${Date.now()}_${safe}`;
}

/** @param {string} institutionId @param {string} paymentId @param {string} fileName */
export function buildReceiptStoragePath(institutionId, paymentId, fileName) {
  return `${RECEIPT_STORAGE_ROOT}/${institutionId}/${paymentId}/receipt/${fileName}`;
}

/** @param {string} institutionId @param {string} paymentId @param {string} fileName */
export function buildGeneratedReceiptStoragePath(institutionId, paymentId, fileName) {
  return `${RECEIPT_STORAGE_ROOT}/${institutionId}/${paymentId}/generated/${fileName}`;
}

/** @param {{ receiptUrl?: string|null }} payment */
export function hasPaymentReceipt(payment) {
  return Boolean(payment?.receiptUrl);
}

/** @param {{ generatedReceiptUrl?: string|null }} payment */
export function hasGeneratedReceipt(payment) {
  return Boolean(payment?.generatedReceiptUrl);
}

/** @param {string} url @param {string} [fileName] */
export function isPdfReceipt(url, fileName = '') {
  const lower = `${url} ${fileName}`.toLowerCase();
  return lower.includes('.pdf');
}

/** @param {string} url @param {string} [fileName] */
export function isImageReceipt(url, fileName = '') {
  const lower = `${url} ${fileName}`.toLowerCase();
  return ['.jpg', '.jpeg', '.png'].some((ext) => lower.includes(ext));
}
