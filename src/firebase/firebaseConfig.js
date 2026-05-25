import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/** Vite build sırasında import.meta.env.* olarak gömülür; trim ile Vercel kopyala-yapıştır hatalarını azaltır. */
function readViteEnv(key) {
  const raw = import.meta.env[key];
  if (raw == null || raw === '') {
    return '';
  }
  return String(raw).trim();
}

const firebaseConfig = {
  apiKey: readViteEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readViteEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readViteEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readViteEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readViteEnv('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: readViteEnv('VITE_FIREBASE_APP_ID'),
};

// eslint-disable-next-line no-console
console.log('FIREBASE ENV CHECK:', {
  hasApiKey: !!firebaseConfig.apiKey,
  apiKeyStart: firebaseConfig.apiKey?.slice(0, 6) || '(empty)',
  hasAuthDomain: !!firebaseConfig.authDomain,
  hasProjectId: !!firebaseConfig.projectId,
  hasAppId: !!firebaseConfig.appId,
});

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  // eslint-disable-next-line no-console
  console.error('MISSING FIREBASE ENV KEYS:', missingKeys);
  throw new Error(
    'Firebase yapılandırması eksik. Local: .env dosyasını doldurun. ' +
      'Vercel: Project Settings → Environment Variables içine VITE_FIREBASE_* değişkenlerini ekleyip redeploy yapın.',
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
