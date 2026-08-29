import {
  getGoogleDriveServiceAccountClient,
  SERVICE_ACCOUNT_EMAIL,
  GOOGLE_DRIVE_FOLDER_NAME,
} from '../../_lib/googleDriveService';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const hasKey = Boolean(
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
      process.env.GCP_SERVICE_ACCOUNT_KEY
    );

    const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

    if (!hasKey) {
      return res.status(200).json({
        success: true,
        connected: false,
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: 'Falta configurar la variable GOOGLE_SERVICE_ACCOUNT_KEY en Vercel',
      });
    }

    try {
      const { serviceAccountEmail } = getGoogleDriveServiceAccountClient();
      return res.status(200).json({
        success: true,
        connected: true,
        serviceAccountEmail: serviceAccountEmail,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
      });
    } catch (authErr: any) {
      return res.status(200).json({
        success: true,
        connected: false,
        serviceAccountEmail: SERVICE_ACCOUNT_EMAIL,
        folderId: targetFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: authErr.message,
      });
    }
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
}
