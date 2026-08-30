import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

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
      console.warn('[Drive Status] FIREBASE_SERVICE_ACCOUNT no está configurada o es inválida.');
      return null;
    }

    initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.warn('[Drive Status] Firebase Admin Init Notice:', err?.message || err);
    return null;
  }
}

async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  // 1. Direct Environment Variable (Optional)
  const envRefreshToken = getCleanEnv('GOOGLE_DRIVE_REFRESH_TOKEN');
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: getCleanEnv('GOOGLE_DRIVE_AUTHORIZED_EMAIL') || 'comerconcalma@gmail.com',
      updatedAt: new Date().toISOString(),
    };
  }

  // 2. Firebase Admin SDK (Server Exclusive)
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
    console.error('[Drive Status] Firebase Admin fetch error:', adminErr?.message || adminErr);
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
    const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
    const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

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

    // Check stored refresh token via Firebase Admin SDK
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
    return res.status(200).json({
      success: false,
      connected: false,
      error: error?.message || 'Error verificando el estado de Google Drive',
    });
  }
}
