import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './firebaseConfig';

// Initialize Firebase App instance safely
export const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with in-memory caching and ignoreUndefinedProperties.
// Using memoryLocalCache prevents multi-tab / iframe IndexedDB lease conflicts
// such as "Failed to obtain primary lease for action 'Backfill Indexes'".
export const db = (() => {
  try {
    return initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: memoryLocalCache(),
    });
  } catch (e) {
    // Fallback if already initialized
    return getFirestore(app);
  }
})();

// Initialize Auth and Google Provider
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Storage
export const storage = getStorage(app);
