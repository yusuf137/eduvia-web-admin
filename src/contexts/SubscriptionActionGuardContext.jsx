import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import SubscriptionActionBlockedModal from '../components/admin/SubscriptionActionBlockedModal';
import { useAuth } from './AuthContext';
import { isFirestorePermissionError, getUserFacingErrorMessage } from '../utils/firestoreError';
import { checkSubscriptionPermission } from '../utils/subscriptionHelpers';

const SubscriptionActionGuardContext = createContext(null);

export function SubscriptionActionGuardProvider({ children }) {
  const { institutionRecord, isSuperAdmin } = useAuth();
  const [blocked, setBlocked] = useState(null);

  const checkPermission = useCallback(() => {
    if (isSuperAdmin) {
      return { allowed: true, reason: null, status: null };
    }
    return checkSubscriptionPermission(institutionRecord);
  }, [institutionRecord, isSuperAdmin]);

  const ensureAllowed = useCallback(() => {
    const result = checkPermission();
    if (!result.allowed) {
      setBlocked(result);
      return false;
    }
    return true;
  }, [checkPermission]);

  const closeBlockedModal = useCallback(() => {
    setBlocked(null);
  }, []);

  const resolveActionError = useCallback(
    (err, fallback = 'İşlem başarısız oldu.') => {
      if (isFirestorePermissionError(err)) {
        // eslint-disable-next-line no-console
        console.log('FIRESTORE PERMISSION ERROR:', err?.code, err?.message);
        const perm = checkPermission();
        if (!perm.allowed) {
          setBlocked(perm);
          return null;
        }
      }
      return getUserFacingErrorMessage(err, { fallback });
    },
    [checkPermission],
  );

  const runIfAllowed = useCallback(
    async (action, { fallback } = {}) => {
      if (!ensureAllowed()) {
        return { ok: false, blocked: true };
      }
      try {
        const value = await action();
        return { ok: true, value };
      } catch (err) {
        const message = resolveActionError(err, fallback);
        if (message === null) {
          return { ok: false, blocked: true, error: err };
        }
        return { ok: false, blocked: false, error: err, message };
      }
    },
    [ensureAllowed, resolveActionError],
  );

  const value = useMemo(
    () => ({
      checkPermission,
      ensureAllowed,
      resolveActionError,
      runIfAllowed,
      closeBlockedModal,
      isBlockedModalOpen: Boolean(blocked),
    }),
    [checkPermission, ensureAllowed, resolveActionError, runIfAllowed, closeBlockedModal, blocked],
  );

  return (
    <SubscriptionActionGuardContext.Provider value={value}>
      {children}
      <SubscriptionActionBlockedModal
        open={Boolean(blocked)}
        status={blocked?.status}
        reason={blocked?.reason}
        onClose={closeBlockedModal}
      />
    </SubscriptionActionGuardContext.Provider>
  );
}

export function useSubscriptionActionGuard() {
  const ctx = useContext(SubscriptionActionGuardContext);
  if (!ctx) {
    throw new Error('useSubscriptionActionGuard must be used within SubscriptionActionGuardProvider');
  }
  return ctx;
}

export { checkSubscriptionPermission, validateSubscriptionAction } from '../utils/subscriptionHelpers';
