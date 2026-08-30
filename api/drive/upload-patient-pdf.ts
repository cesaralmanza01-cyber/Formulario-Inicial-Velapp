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
    console.warn('[Upload PDF] Firebase Admin Init Notice:', err?.message || err);
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
    console.warn('[Upload PDF] Firebase Admin fetch notice:', adminErr?.message || adminErr);
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
    console.warn('[Upload PDF] Client SDK getDoc notice:', clientErr?.message || clientErr);
  }

  return null;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';

export default async function handler(req: any, res: any) {
  // CORS support
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido (Use POST)' });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr: any) {
        return res.status(400).json({ success: false, error: 'Cuerpo no es un JSON válido' });
      }
    }

    const { patientName, patientId, fileDataUrl, fileName } = body || {};

    if (!fileDataUrl) {
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos de archivo PDF' });
    }

    const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
    const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

    if (!clientId || !clientSecret) {
      console.warn('[Upload PDF] Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Fallando silenciosamente...');
      return res.status(200).json({
        success: false,
        reason: 'oauth_not_configured',
        error: 'OAuth no configurado en variables de entorno',
      });
    }

    // 1. Fetch Refresh Token using multi-tier fallback (Env Var -> Firebase Admin -> Client SDK)
    const tokenData = await getGoogleDriveStoredTokens();

    if (!tokenData || !tokenData.refreshToken) {
      console.warn('[Upload PDF] No existe refresh_token disponible. La médica no ha conectado Google Drive ni se definió GOOGLE_DRIVE_REFRESH_TOKEN.');
      return res.status(200).json({
        success: false,
        reason: 'drive_not_linked',
        error: 'Google Drive no ha sido conectado por la médica',
      });
    }

    const refreshToken = tokenData.refreshToken;

    // 2. Initialize OAuth client with Refresh Token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // 3. Decode base64 data to buffer
    let base64Data = fileDataUrl;
    if (typeof fileDataUrl === 'string' && fileDataUrl.includes(',')) {
      base64Data = fileDataUrl.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');

    const safePatientName = patientName || 'Paciente';
    const cleanName = safePatientName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    const todayStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName || `Cuestionario_${cleanName}_${todayStr}.pdf`;

    const fileMetadata: any = {
      name: finalFileName,
      mimeType: 'application/pdf',
      description: `Cuestionario inicial de la paciente ${safePatientName} — Vela Medicina & Nutrición Integral`,
    };

    if (destinationFolderId) {
      fileMetadata.parents = [destinationFolderId];
    }

    const stream = Readable.from(buffer);
    const media = {
      mimeType: 'application/pdf',
      body: stream,
    };

    console.log(`[Upload PDF OAuth] Subiendo archivo '${finalFileName}' (${buffer.length} bytes) a carpeta ${destinationFolderId}...`);

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, parents',
      supportsAllDrives: true,
    });

    const fileId = driveRes.data.id || '';
    const webViewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`[Upload PDF OAuth] ¡Subida exitosa! File ID: ${fileId} — Link: ${webViewLink}`);

    return res.status(200).json({
      success: true,
      fileId,
      fileName: finalFileName,
      webViewLink,
      folderId: destinationFolderId,
    });
  } catch (error: any) {
    console.error('================================================================');
    console.error('[Upload Patient PDF ERROR]:', error?.message || error);
    if (error?.response?.data) {
      console.error('[Google Drive API Raw Error]:', JSON.stringify(error.response.data));
    }
    console.error('================================================================');

    return res.status(200).json({
      success: false,
      error: error?.message || 'Error al subir a Google Drive',
      reason: 'drive_upload_failed',
    });
  }
}
