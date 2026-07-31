import { onAuthStateChanged } from 'firebase/auth';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { auth } from '../firebase/firebaseConfig';
import { DEFAULT_MODULES, isModuleEnabled, normalizeModules } from '../constants/institutionModules';
import { fetchInstitutionById } from '../services/institutionService';
import { fetchUserProfile } from '../services/authService';
import { buildInstitutionAccessContext } from '../utils/institutionAccess';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [institutionModules, setInstitutionModules] = useState(DEFAULT_MODULES);
  const [institutionRecord, setInstitutionRecord] = useState(null);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError('');
      setCurrentUser(user);
      if (!user) {
        setCurrentUserProfile(null);
        setInstitutionModules(DEFAULT_MODULES);
        setInstitutionRecord(null);
        setModulesLoading(false);
        setLoading(false);
        return;
      }

      try {
        const profile = await fetchUserProfile(user.uid);
        setCurrentUserProfile(profile);
        if (!profile) {
          setError('Kullanıcı profili bulunamadı.');
          setInstitutionModules(DEFAULT_MODULES);
          setInstitutionRecord(null);
          setModulesLoading(false);
          return;
        }

        if (
          (profile.role === 'admin' || profile.role === 'adminTeacher') &&
          profile.institutionId
        ) {
          setModulesLoading(true);
          try {
            const inst = await fetchInstitutionById(profile.institutionId);
            setInstitutionRecord(inst);
            setInstitutionModules(normalizeModules(inst?.modules));
          } catch (modErr) {
            setInstitutionModules(DEFAULT_MODULES);
            setInstitutionRecord(null);
            // eslint-disable-next-line no-console
            console.log('WEB INSTITUTION MODULES LOAD ERROR:', modErr?.code, modErr?.message);
          } finally {
            setModulesLoading(false);
          }
        } else {
          setInstitutionModules(DEFAULT_MODULES);
          setInstitutionRecord(null);
          setModulesLoading(false);
        }
      } catch (e) {
        setCurrentUserProfile(null);
        setInstitutionModules(DEFAULT_MODULES);
        setInstitutionRecord(null);
        setModulesLoading(false);
        setError(e?.message ?? 'Profil okunamadı.');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const institutionAccess = useMemo(
    () => buildInstitutionAccessContext(institutionRecord),
    [institutionRecord],
  );

  const checkModuleEnabled = useCallback(
    (moduleKey) => {
      if (!moduleKey) return true;
      if (currentUserProfile?.role === 'superAdmin') return true;
      return isModuleEnabled(institutionModules, moduleKey, {
        subscriptionStatus: institutionAccess.subscriptionStatus,
        status: institutionAccess.subscriptionStatus,
        endDate: institutionRecord?.subscription?.endDate ?? institutionRecord?.trialEndDate,
      });
    },
    [
      currentUserProfile?.role,
      institutionModules,
      institutionAccess.subscriptionStatus,
      institutionRecord?.trialEndDate,
    ],
  );

  const value = useMemo(
    () => ({
      currentUser,
      currentUserProfile,
      loading,
      error,
      isSuperAdmin: currentUserProfile?.role === 'superAdmin',
      isAdmin:
        currentUserProfile?.role === 'admin' || currentUserProfile?.role === 'adminTeacher',
      institutionId: currentUserProfile?.institutionId ?? null,
      institutionModules,
      institutionRecord,
      institutionAccess,
      subscriptionStatus: institutionAccess.subscriptionStatus,
      subscriptionBanner: institutionAccess.subscriptionBanner,
      isSubscriptionWriteBlocked: institutionAccess.isWriteBlocked,
      isSubscriptionFullyBlocked: institutionAccess.isFullyBlocked,
      packageInactive: institutionAccess.isFullyBlocked || institutionAccess.isLimited,
      isModuleEnabled: checkModuleEnabled,
      modulesLoading,
    }),
    [
      currentUser,
      currentUserProfile,
      loading,
      error,
      institutionModules,
      institutionRecord,
      institutionAccess,
      checkModuleEnabled,
      modulesLoading,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
