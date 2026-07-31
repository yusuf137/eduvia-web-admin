import { useAuth } from '../contexts/AuthContext';
import { isModuleEnabled } from '../constants/institutionModules';
import { SUBSCRIPTION_STATUS } from '../constants/subscriptionStatus';

/**
 * @param {{ moduleKey?: string | null, children: import('react').ReactNode }} props
 */
export default function ModuleGuard({ moduleKey = null, children }) {
  const {
    institutionModules,
    currentUserProfile,
    institutionAccess,
    subscriptionBanner,
    isModuleEnabled: checkModuleEnabled,
  } = useAuth();

  if (currentUserProfile?.role === 'superAdmin') {
    return children;
  }

  if (subscriptionBanner) {
    const status = institutionAccess?.subscriptionStatus;
    const isCancelled = status === SUBSCRIPTION_STATUS.CANCELLED;
    const blocked = isCancelled && moduleKey && moduleKey !== 'webPanel';

    if (blocked || (isCancelled && moduleKey)) {
      return (
        <div className="page-card module-guard">
          <h3 className="page-heading">{subscriptionBanner}</h3>
          <p className="muted">Paket gerektiren işlemler devre dışıdır.</p>
        </div>
      );
    }
  }

  const enabled = checkModuleEnabled
    ? checkModuleEnabled(moduleKey)
    : isModuleEnabled(institutionModules, moduleKey, institutionAccess);

  if (!enabled) {
    return (
      <div className="page-card module-guard">
        <h3 className="page-heading">Bu özellik kurumunuz için aktif değil.</h3>
        <p className="muted">
          Kurum yöneticinizden bu modülün açılmasını talep edebilirsiniz.
        </p>
      </div>
    );
  }

  return children;
}
