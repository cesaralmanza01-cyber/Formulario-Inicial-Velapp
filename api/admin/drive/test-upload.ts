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

function getCleanEnv(key: string): string {
  const val = process.env[key] || '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseServiceAccount(raw: string | undefined): any | null {
  if (!raw) return null;
  let str = raw.trim();
  if (!str) return null;

  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  if (!str.startsWith('{') && str.length > 20) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      if (decoded.startsWith('{')) {
        str = decoded;
      }
    } catch {}
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
    return null;
  } catch (err: any) {
    try {
      const fixedStr = str.replace(/[\r\n]+/g, ' ');
      const parsed = JSON.parse(fixedStr);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {}
    return null;
  }
}

function getAdminFirestore() {
  try {
    if (getAdminApps().length > 0) {
      return getAdminFirestoreInstance(getAdminApp());
    }

    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!serviceAccount) {
      return null;
    }

    initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.warn('[Drive Test Upload] Firebase Admin Init Notice:', err?.message || err);
    return null;
  }
}

async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  // Tier 1: Direct Environment Variable (Optional)
  const envRefreshToken = getCleanEnv('GOOGLE_DRIVE_REFRESH_TOKEN');
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: getCleanEnv('GOOGLE_DRIVE_AUTHORIZED_EMAIL') || 'comerconcalma@gmail.com',
      updatedAt: new Date().toISOString(),
    };
  }

  // Tier 2: Firebase Admin SDK
  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      const snap = await dbAdmin.collection('_system_config').doc('google_drive_tokens').get();
      if (snap.exists) {
        const data = snap.data() as StoredDriveTokens;
        if (data?.refreshToken) {
          return data;
        }
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
    const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
    const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

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
