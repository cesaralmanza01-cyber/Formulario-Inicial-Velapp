import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as clientGetDoc, setDoc as clientSetDoc } from 'firebase/firestore';

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

const firebaseClientConfig = {
  projectId: FIREBASE_PROJECT_ID,
  appId: '1:1028826074180:web:c5e9636ea22b1f3a850011',
  apiKey: 'AIzaSyA9hePNixcQD90_2HOJREulcMz538-CaSg',
  authDomain: 'gen-lang-client-0995145097.firebaseapp.com',
  storageBucket: 'gen-lang-client-0995145097.firebasestorage.app',
  messagingSenderId: '1028826074180',
};

export interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

/**
 * Initializes and returns Firebase Admin Firestore instance
 */
export function getAdminFirestore() {
  if (getAdminApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        initAdminApp({
          credential: cert(parsed),
          projectId: parsed.project_id || FIREBASE_PROJECT_ID,
        });
      } catch (e) {
        console.warn('[ServerTokens] Could not parse FIREBASE_SERVICE_ACCOUNT, falling back to default:', e);
        initAdminApp({ projectId: FIREBASE_PROJECT_ID });
      }
    } else {
      initAdminApp({ projectId: FIREBASE_PROJECT_ID });
    }
  }
  return getAdminFirestoreInstance(getAdminApp());
}

/**
 * Reads Google Drive tokens with multi-tier fallback:
 * 1. Environment variable GOOGLE_DRIVE_REFRESH_TOKEN (instant, zero network latency)
 * 2. Firebase Admin SDK (server-side, single-shot RPC, bypasses security rules)
 * 3. Client SDK getDoc with timeout fallback
 */
export async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  // Tier 1: Direct Environment Variable (Fastest & most robust in serverless)
  const envRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: process.env.GOOGLE_DRIVE_AUTHORIZED_EMAIL || 'comerconcalma@gmail.com',
      updatedAt: new Date().toISOString(),
    };
  }

  // Tier 2: Firebase Admin SDK (Recommended for Node/Serverless)
  try {
    const dbAdmin = getAdminFirestore();
    const snap = await dbAdmin.collection('_system_config').doc('google_drive_tokens').get();
    if (snap.exists) {
      const data = snap.data() as StoredDriveTokens;
      if (data?.refreshToken) {
        return data;
      }
    }
  } catch (adminErr: any) {
    console.warn('[ServerTokens] Firebase Admin fetch notice:', adminErr?.message || adminErr);
  }

  // Tier 3: Client SDK getDoc with 4s timeout
  try {
    const clientApp = getClientApps().length === 0 ? initClientApp(firebaseClientConfig) : getClientApp();
    const clientDb = getClientFirestore(clientApp);
    const docRef = clientDoc(clientDb, '_system_config', 'google_drive_tokens');
    
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout de lectura Firestore (4s)')), 4000)
    );

    const docSnap = await Promise.race([clientGetDoc(docRef), timeoutPromise]);
    if (docSnap && 'exists' in docSnap && docSnap.exists()) {
      const data = docSnap.data() as StoredDriveTokens;
      if (data?.refreshToken) {
        return data;
      }
    }
  } catch (clientErr: any) {
    console.warn('[ServerTokens] Client SDK getDoc notice:', clientErr?.message || clientErr);
  }

  return null;
}

/**
 * Saves Google Drive tokens to Firestore using Admin SDK, falling back to Client SDK
 */
export async function saveGoogleDriveTokens(tokens: StoredDriveTokens): Promise<boolean> {
  // Tier 1: Firebase Admin SDK
  try {
    const dbAdmin = getAdminFirestore();
    await dbAdmin.collection('_system_config').doc('google_drive_tokens').set(tokens, { merge: true });
    console.log('[ServerTokens] Tokens guardados exitosamente con Firebase Admin SDK.');
    return true;
  } catch (adminErr: any) {
    console.warn('[ServerTokens] Error guardando con Firebase Admin, intentando Client SDK:', adminErr?.message);
  }

  // Tier 2: Client SDK fallback
  try {
    const clientApp = getClientApps().length === 0 ? initClientApp(firebaseClientConfig) : getClientApp();
    const clientDb = getClientFirestore(clientApp);
    const docRef = clientDoc(clientDb, '_system_config', 'google_drive_tokens');
    await clientSetDoc(docRef, tokens, { merge: true });
    console.log('[ServerTokens] Tokens guardados con Client SDK fallback.');
    return true;
  } catch (clientErr: any) {
    console.error('[ServerTokens] Error crítico guardando tokens en Firestore:', clientErr);
    return false;
  }
}
