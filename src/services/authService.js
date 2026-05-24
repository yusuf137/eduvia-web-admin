import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/firebaseConfig';

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
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
