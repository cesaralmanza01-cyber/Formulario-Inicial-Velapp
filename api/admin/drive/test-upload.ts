import { Readable } from 'stream';
import { google } from 'googleapis';
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
        console.warn('[Drive Test Upload] Could not parse FIREBASE_SERVICE_ACCOUNT, falling back to default:', e);
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
    console.warn('[Drive Test Upload] Firebase Admin fetch notice:', adminErr?.message || adminErr);
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
    console.warn('[Drive Test Upload] Client SDK getDoc notice:', clientErr?.message || clientErr);
  }

  return null;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

    if (!clientId || !clientSecret) {
      return res.status(400).json({
        success: false,
        error: 'Faltan credenciales de Google OAuth en variables de entorno (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
      });
    }

    const tokenData = await getGoogleDriveStoredTokens();

    if (!tokenData || !tokenData.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive no está conectado. Por favor haz clic en "Conectar Google Drive" primero.',
      });
    }

    const refreshToken = tokenData.refreshToken;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const timestamp = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
    const fileContent = `=====================================================
VELA MEDICINA & NUTRICIÓN INTEGRAL - ARCHIVO DE PRUEBA
=====================================================
Fecha y Hora: ${timestamp}
ID de Carpeta: ${destinationFolderId}
Estado: ¡Conexión OAuth con Google Drive establecida exitosamente!
=====================================================`;

    const stream = Readable.from([Buffer.from(fileContent, 'utf-8')]);
    const fileMetadata: any = {
      name: `Test_Conexion_Vela_${Date.now()}.txt`,
      mimeType: 'text/plain',
      description: 'Archivo de diagnóstico y verificación de Google Drive - Vela Médica',
    };

    if (destinationFolderId) {
      fileMetadata.parents = [destinationFolderId];
    }

    const media = {
      mimeType: 'text/plain',
      body: stream,
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, parents',
      supportsAllDrives: true,
    });

    return res.status(200).json({
      success: true,
      message: 'Archivo de prueba subido exitosamente a Google Drive',
      fileId: driveRes.data.id,
      fileName: driveRes.data.name,
      webViewLink: driveRes.data.webViewLink,
      folderId: destinationFolderId,
    });
  } catch (error: any) {
    console.error('[Google Drive Test Upload Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al ejecutar prueba de subida a Google Drive',
    });
  }
}
