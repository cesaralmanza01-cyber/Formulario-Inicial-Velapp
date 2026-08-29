import { Readable } from 'stream';
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

function parseServiceAccountCredentials(rawKey: string): { client_email: string; private_key: string } {
  let str = rawKey.trim();
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }
  let parsed: any;
  if (str.startsWith('{')) {
    parsed = JSON.parse(str);
  } else {
    parsed = JSON.parse(Buffer.from(str, 'base64').toString('utf-8'));
  }

  let formattedPrivateKey = parsed.private_key;
  if (typeof formattedPrivateKey === 'string') {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
    if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
    }
  }

  return {
    client_email: String(parsed.client_email).trim(),
    private_key: formattedPrivateKey,
  };
}

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
    const rawKey =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.GCP_SERVICE_ACCOUNT_KEY;

    if (!rawKey) {
      throw new Error('Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY en Vercel.');
    }

    const credentials = parseServiceAccountCredentials(rawKey);

    const jwtClient = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });

    const drive = google.drive({ version: 'v3', auth: jwtClient });
    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

    const testPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 80>>stream\nBT /F1 16 Tf 50 750 Td (Vela - Prueba de conexion con Cuenta de Servicio Google Drive en Vercel exitosa) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000228 00000 n\n0000000354 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n428\n%%EOF`;
    const buffer = Buffer.from(testPdfContent, 'utf-8');
    const testFileName = `Prueba_ServiceAccount_Vela_${Date.now()}.pdf`;

    const fileMetadata: any = {
      name: testFileName,
      mimeType: 'application/pdf',
      description: `Archivo de prueba de conexión Google Drive — Vela Medicina & Nutrición Integral`,
    };

    if (targetFolderId) {
      fileMetadata.parents = [targetFolderId];
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
      folderId: targetFolderId,
      message: '¡Archivo de prueba subido exitosamente a Google Drive con la Cuenta de Servicio!',
    });
  } catch (error: any) {
    console.error('[Drive Test Upload Serverless ERROR]:', error?.message || error);
    return res.status(200).json({
      success: false,
      error: error?.message || 'Error en prueba de subida a Google Drive',
      reason: 'test_upload_failed',
    });
  }
}
