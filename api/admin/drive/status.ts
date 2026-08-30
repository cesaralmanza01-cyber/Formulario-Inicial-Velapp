import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, getDoc as clientGetDoc } from 'firebase/firestore';

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

const firebaseClientConfig = {
  projectId: FIREBASE_PROJECT_ID,
  appId: '1:1028826074180:web:c5e9636ea22b1f3a850011',
  apiKey: 'AIzaSyA9hePNixcQD90_2HOJREulcMz538-CaSg',
  authDomain: 'gen-lang-client-0995145097.firebaseapp.com',
  storageBucket: 'gen-lang-client-0995145097.firebasestorage.app',
  messagingSenderId: '1028826074180',
};

interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

function getAdminFirestore() {
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
        console.warn('[Drive Status] Could not parse FIREBASE_SERVICE_ACCOUNT, falling back to default:', e);
        initAdminApp({ projectId: FIREBASE_PROJECT_ID });
      }
    } else {
      initAdminApp({ projectId: FIREBASE_PROJECT_ID });
    }
  }
  return getAdminFirestoreInstance(getAdminApp());
}

async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  // Tier 1: Direct Environment Variable (Optional)
  const envRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN?.trim();
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: process.env.GOOGLE_DRIVE_AUTHORIZED_EMAIL || 'comerconcalma@gmail.com',
      updatedAt: new Date().toISOString(),
    };
  }

  // Tier 2: Firebase Admin SDK
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
    console.warn('[Drive Status] Firebase Admin fetch notice:', adminErr?.message || adminErr);
  }

  // Tier 3: Client SDK getDoc with 4s timeout fallback
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
    console.warn('[Drive Status] Client SDK getDoc notice:', clientErr?.message || clientErr);
  }

  return null;
}

const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';
const GOOGLE_DRIVE_FOLDER_NAME = 'FORMULARIO CONSULTAS VELA';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

    if (!clientId || !clientSecret) {
      return res.status(200).json({
        success: true,
        connected: false,
        reason: 'missing_credentials',
        message: 'Faltan credenciales de Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
      });
    }

    // Check stored refresh token via multi-tier fallback
    const tokenData = await getGoogleDriveStoredTokens();

    if (tokenData && tokenData.refreshToken) {
      return res.status(200).json({
        success: true,
        connected: true,
        authorizedEmail: tokenData.authorizedEmail || 'comerconcalma@gmail.com',
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        updatedAt: tokenData.updatedAt || new Date().toISOString(),
      });
    } else {
      return res.status(200).json({
        success: true,
        connected: false,
        reason: 'not_authenticated',
        message: 'La médica aún no ha conectado Google Drive mediante el botón de autorización.',
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
      });
    }
  } catch (error: any) {
    console.error('[Google Drive Status API Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error verificando el estado de Google Drive',
    });
  }
}
