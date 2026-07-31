import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';
import { AUDIT_ACTIONS, AUDIT_MODULES } from '../constants/auditActions';
import { auditLogger } from './auditLogger';

// Not: Şifre sıfırlama e-postası için Firebase Auth Authorized Domains içinde
// panel.eduviaapp.com ve eduviaapp.com ekli olmalı.

export async function sendPasswordReset(email) {
  const trimmed = String(email ?? '').trim();
  if (!trimmed) {
    throw Object.assign(new Error('Lütfen e-posta adresinizi girin.'), { code: 'auth/invalid-email' });
  }
  if (!trimmed.includes('@')) {
    throw Object.assign(new Error('Lütfen geçerli bir e-posta adresi girin.'), { code: 'auth/invalid-email' });
  }

  try {
    await sendPasswordResetEmail(auth, trimmed);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('PASSWORD RESET ERROR:', error.code, error.message);
    throw error;
  }
}

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  const profile = await fetchUserProfile(cred.user.uid);

  if (profile?.role === 'superAdmin') {
    auditLogger.log({
      action: AUDIT_ACTIONS.ADMIN_LOGIN,
      module: AUDIT_MODULES.AUTH,
      description: `${profile.name || profile.email} SuperAdmin paneline giriş yaptı.`,
      newData: { email: profile.email, uid: profile.uid },
    });
  }

  return cred.user;
}

export async function logout() {
  const user = auth.currentUser;
  let profile = null;

  if (user) {
    profile = await fetchUserProfile(user.uid);
  }

  await signOut(auth);

  if (profile?.role === 'superAdmin') {
    auditLogger.log({
      action: AUDIT_ACTIONS.ADMIN_LOGOUT,
      module: AUDIT_MODULES.AUTH,
      description: `${profile.name || profile.email} SuperAdmin panelinden çıkış yaptı.`,
      oldData: { email: profile.email, uid: profile.uid },
    });
  }
}

export async function fetchUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) {
    return null;
  }
  const data = snap.data();
  const institutionId = String(data.institutionId ?? '').trim() || null;
  let institutionName = String(data.institutionName ?? '').trim();

  if (institutionId && !institutionName) {
    try {
      const instSnap = await getDoc(doc(db, 'institutions', institutionId));
      if (instSnap.exists()) {
        institutionName = String(instSnap.data()?.name ?? '').trim();
      }
    } catch {
      institutionName = '';
    }
  }

  return {
    uid,
    name: String(data.name ?? '').trim() || 'Kullanıcı',
    email: String(data.email ?? '').trim(),
    role: String(data.role ?? '').trim(),
    institutionId,
    institutionName,
    isActive: data.isActive !== false,
  };
}
