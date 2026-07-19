import { initializeApp, getApps } from 'firebase/app';
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FB_API_KEY ?? 'AIzaSyDBPAF8LeDCfywbFiWSMHeu01inc_uxSk0',
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN ?? 'ledger-d57da.firebaseapp.com',
  projectId: import.meta.env.VITE_FB_PROJECT_ID ?? 'ledger-d57da',
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET ?? 'ledger-d57da.firebasestorage.app',
  appId: import.meta.env.VITE_FB_APP_ID ?? '1:713000868232:web:b979ddfaa854ea80d5023d'
};

const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

let persistencePromise = null;
export function enablePersistence() {
  if (persistencePromise) return persistencePromise;
  persistencePromise = enableIndexedDbPersistence(db, { forceOwnership: true })
    .catch((err) => {
      if (err?.code === 'failed-precondition') {
        console.warn('[firestore] persistence unavailable (multi-tab)');
      } else if (err?.code === 'unimplemented') {
        console.warn('[firestore] persistence unsupported in this browser');
      } else {
        console.error('[firestore] persistence error', err);
      }
    });
  return persistencePromise;
}

if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === 'true') {
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
    connectAuthEmulator(auth, 'http://127.0.0.1:9099');
  } catch (e) {
    //
  }
}

enablePersistence();

export { app };
