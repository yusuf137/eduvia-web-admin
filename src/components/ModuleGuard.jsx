import { useAuth } from '../contexts/AuthContext';
import { isModuleEnabled } from '../constants/institutionModules';

/**
 * @param {{ moduleKey?: string | null, children: import('react').ReactNode }} props
 */
export default function ModuleGuard({ moduleKey = null, children }) {
  const { institutionModules, currentUserProfile } = useAuth();

  if (currentUserProfile?.role === 'superAdmin') {
    return children;
  }

  if (!isModuleEnabled(institutionModules, moduleKey)) {
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
