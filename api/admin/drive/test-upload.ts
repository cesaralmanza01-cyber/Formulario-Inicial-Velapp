import { Readable } from 'stream';
import { google } from 'googleapis';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0995145097",
  appId: "1:1028826074180:web:c5e9636ea22b1f3a850011",
  apiKey: "AIzaSyA9hePNixcQD90_2HOJREulcMz538-CaSg",
  authDomain: "gen-lang-client-0995145097.firebaseapp.com",
  storageBucket: "gen-lang-client-0995145097.firebasestorage.app",
  messagingSenderId: "1028826074180",
  measurementId: "",
  oAuthClientId: "1028826074180-m7oqf27rei6p45c2trqkiam5av9ubck1.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
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
        error: 'Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en las variables de entorno.',
      });
    }

    const tokensRef = doc(db, '_system_config', 'google_drive_tokens');
    const tokenSnap = await getDoc(tokensRef);

    if (!tokenSnap.exists() || !tokenSnap.data()?.refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Google Drive no está conectado. Por favor haz clic en "Conectar Google Drive" primero.',
      });
    }

    const refreshToken = tokenSnap.data().refreshToken;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    const testPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 80>>stream\nBT /F1 16 Tf 50 750 Td (Vela - Prueba de conexion con OAuth Google Drive en Vercel exitosa) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000228 00000 n\n0000000354 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n428\n%%EOF`;
    const buffer = Buffer.from(testPdfContent, 'utf-8');
    const testFileName = `Prueba_OAuth_Vela_${Date.now()}.pdf`;

    const fileMetadata: any = {
      name: testFileName,
      mimeType: 'application/pdf',
      description: `Archivo de prueba de conexión OAuth Google Drive — Vela Medicina & Nutrición Integral`,
    };

    if (destinationFolderId) {
      fileMetadata.parents = [destinationFolderId];
    }

    const stream = Readable.from(buffer);
    const media = {
      mimeType: 'application/pdf',
      body: stream,
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, parents',
      supportsAllDrives: true,
    });

    const fileId = driveRes.data.id || '';
    const webViewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    return res.status(200).json({
      success: true,
      fileId,
      fileName: testFileName,
      webViewLink,
      folderId: destinationFolderId,
      message: '¡Archivo de prueba subido exitosamente a tu Google Drive personal!',
    });
  } catch (error: any) {
    console.error('[Drive Test Upload ERROR]:', error?.message || error);
    return res.status(200).json({
      success: false,
      error: error?.message || 'Error en prueba de subida a Google Drive',
    });
  }
}
