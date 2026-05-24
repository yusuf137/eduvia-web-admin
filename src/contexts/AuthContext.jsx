import { onAuthStateChanged } from 'firebase/auth';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

import { auth } from '../firebase/firebaseConfig';

import { DEFAULT_MODULES, normalizeModules } from '../constants/institutionModules';

import { fetchInstitutionById } from '../services/institutionService';

import { fetchUserProfile } from '../services/authService';



const AuthContext = createContext(null);



export function AuthProvider({ children }) {

  const [currentUser, setCurrentUser] = useState(null);

  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const [institutionModules, setInstitutionModules] = useState(DEFAULT_MODULES);

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

          setModulesLoading(false);

          return;

        }



        if (profile.role === 'admin' && profile.institutionId) {

          setModulesLoading(true);

          try {

            const inst = await fetchInstitutionById(profile.institutionId);

            const mods = normalizeModules(inst?.modules);

            setInstitutionModules(mods);

            // eslint-disable-next-line no-console

            console.log('WEB INSTITUTION MODULES:', mods);

          } catch (modErr) {

            setInstitutionModules(DEFAULT_MODULES);

            // eslint-disable-next-line no-console

            console.log('WEB INSTITUTION MODULES LOAD ERROR:', modErr?.code, modErr?.message);

          } finally {

            setModulesLoading(false);

          }

        } else {

          setInstitutionModules(DEFAULT_MODULES);

          setModulesLoading(false);

        }

      } catch (e) {

        setCurrentUserProfile(null);

        setInstitutionModules(DEFAULT_MODULES);

        setModulesLoading(false);

        setError(e?.message ?? 'Profil okunamadı.');

      } finally {

        setLoading(false);

      }

    });

    return () => unsub();

  }, []);



  const value = useMemo(

    () => ({

      currentUser,

      currentUserProfile,

      loading,

      error,

      isSuperAdmin: currentUserProfile?.role === 'superAdmin',

      isAdmin: currentUserProfile?.role === 'admin',

      institutionId: currentUserProfile?.institutionId ?? null,

      institutionModules,

      modulesLoading,

    }),

    [currentUser, currentUserProfile, loading, error, institutionModules, modulesLoading],

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


