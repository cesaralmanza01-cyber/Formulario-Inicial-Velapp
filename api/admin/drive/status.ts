import { google } from 'googleapis';

const DEFAULT_SERVICE_ACCOUNT_EMAIL = 'vela-drive-uploader@consultorio-m5-95.iam.gserviceaccount.com';
const GOOGLE_DRIVE_FOLDER_NAME = 'Vela - Cuestionarios Pacientes';

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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const rawKey =
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.GCP_SERVICE_ACCOUNT_KEY;

    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

    if (!rawKey) {
      return res.status(200).json({
        success: true,
        connected: false,
        serviceAccountEmail: DEFAULT_SERVICE_ACCOUNT_EMAIL,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: 'Falta configurar la variable GOOGLE_SERVICE_ACCOUNT_KEY en Vercel',
      });
    }

    try {
      const credentials = parseServiceAccountCredentials(rawKey);
      return res.status(200).json({
        success: true,
        connected: true,
        serviceAccountEmail: credentials.client_email || DEFAULT_SERVICE_ACCOUNT_EMAIL,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
      });
    } catch (authErr: any) {
      console.error('[Drive Status Check Auth Error]:', authErr?.message);
      return res.status(200).json({
        success: true,
        connected: false,
        serviceAccountEmail: DEFAULT_SERVICE_ACCOUNT_EMAIL,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: authErr.message,
      });
    }
  } catch (error: any) {
    console.error('[Drive Status Check Uncaught Error]:', error?.message);
    return res.status(200).json({ success: false, connected: false, error: error.message });
  }
}
