import { Readable } from 'stream';
import { google } from 'googleapis';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../../src/firebaseConfig';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

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

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
    const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

    if (!clientId || !clientSecret) {
      console.warn('[Upload PDF] Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Fallando silenciosamente...');
      return res.status(200).json({
        success: false,
        reason: 'oauth_not_configured',
        error: 'OAuth no configurado en variables de entorno',
      });
    }

    // 1. Fetch Refresh Token from Firestore
    const tokensRef = doc(db, '_system_config', 'google_drive_tokens');
    const tokenSnap = await getDoc(tokensRef);

    if (!tokenSnap.exists() || !tokenSnap.data()?.refreshToken) {
      console.warn('[Upload PDF] No existe refresh_token en _system_config/google_drive_tokens. La médica no ha conectado Google Drive.');
      return res.status(200).json({
        success: false,
        reason: 'drive_not_linked',
        error: 'Google Drive no ha sido conectado por la médica',
      });
    }

    const tokenData = tokenSnap.data();
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
