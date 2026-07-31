import { useAuth } from '../contexts/AuthContext';
import { isAdminRouteAllowed } from '../config/adminMenu';
import { normalizeModules } from '../constants/institutionModules';
import { SUBSCRIPTION_STATUS } from '../constants/subscriptionStatus';
import ModuleGuard from './ModuleGuard';

/** @param {{ moduleKey: string, children: import('react').ReactNode }} props */
export function AdminModulePage({ moduleKey, children }) {
  return <ModuleGuard moduleKey={moduleKey}>{children}</ModuleGuard>;
}

/** Talepler sayfası: telafi veya yoklama modülü açıksa erişilebilir. */
export function AdminRequestsGuard({ children }) {
  const { institutionModules, institutionAccess, modulesLoading, subscriptionBanner } = useAuth();

  if (modulesLoading) {
    return (
      <div className="page-card">
        <p className="muted">Yükleniyor…</p>
      </div>
    );
  }

  if (
    subscriptionBanner
    && institutionAccess?.subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED
  ) {
    return (
      <div className="page-card module-guard">
        <h3 className="page-heading">{subscriptionBanner}</h3>
        <p className="muted">Paket gerektiren işlemler devre dışıdır.</p>
      </div>
    );
  }

  const modules = normalizeModules(institutionModules);
  if (!isAdminRouteAllowed('/admin/requests', modules, institutionAccess)) {
    return (
      <div className="page-card module-guard">
        <h3 className="page-heading">Bu özellik kurumunuz için aktif değil.</h3>
        <p className="muted">Kurum yöneticinizden telafi veya yoklama modülünü açmasını talep edebilirsiniz.</p>
      </div>
    );
  }

  return children;
}

/** @param {{ pathname: string, children: import('react').ReactNode }} props */
export function AdminPathGuard({ pathname, children }) {
  const { institutionModules, institutionAccess, modulesLoading, subscriptionBanner } = useAuth();

  if (modulesLoading) {
    return (
      <div className="page-card">
        <p className="muted">Yükleniyor…</p>
      </div>
    );
  }

  if (
    subscriptionBanner
    && institutionAccess?.subscriptionStatus === SUBSCRIPTION_STATUS.CANCELLED
    && pathname !== '/admin'
  ) {
    return (
      <div className="page-card module-guard">
        <h3 className="page-heading">{subscriptionBanner}</h3>
        <p className="muted">Paket gerektiren işlemler devre dışıdır.</p>
      </div>
    );
  }

  if (!isAdminRouteAllowed(pathname, institutionModules, institutionAccess)) {
    return (
      <div className="page-card module-guard">
        <h3 className="page-heading">Bu özellik kurumunuz için aktif değil.</h3>
        <p className="muted">Kurum yöneticinizden bu modülün açılmasını talep edebilirsiniz.</p>
      </div>
    );
  }

  return children;
}
