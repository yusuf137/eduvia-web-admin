import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

/** Mobil Eduvia ile aynı Firebase projesi — değerleri buraya girin. */
export const firebaseConfig = {
  apiKey: 'AIzaSyDK-25hJZcDWX4JBI7dg3OqbujDbwqspB8',
  authDomain: 'eduvia-804fc.firebaseapp.com',
  projectId: 'eduvia-804fc',
  storageBucket: 'eduvia-804fc.firebasestorage.app',
  messagingSenderId: '121036189679',
  appId: '1:121036189679:web:e6962a6836eaa4e7e9d01a',
};

export const isFirebaseConfigured =
  Boolean(firebaseConfig.apiKey && firebaseConfig.apiKey !== 'BURAYA_YAZ');

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
