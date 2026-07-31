/**
 * Firestore izin hatalarını ayırt eder; kullanıcıya ham mesaj gösterilmemeli.
 * @param {unknown} err
 */
export function isFirestorePermissionError(err) {
  const code = String(err?.code ?? '');
  const message = String(err?.message ?? '');
  return (
    code === 'permission-denied'
    || message.includes('Missing or insufficient permissions')
    || message.includes('insufficient permissions')
  );
}

/**
 * @param {unknown} err
 * @param {{ fallback?: string }} [options]
 */
export function getUserFacingErrorMessage(err, options = {}) {
  const fallback = options.fallback ?? 'İşlem başarısız oldu.';
  if (!err) return fallback;
  if (typeof err === 'string') return err;
  return String(err?.message ?? fallback);
}
