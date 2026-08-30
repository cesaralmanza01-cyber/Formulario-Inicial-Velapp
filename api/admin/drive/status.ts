import { getGoogleDriveStoredTokens } from '../../lib/serverTokens';

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
    const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
    const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
    const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

    if (!hasClientId || !hasClientSecret) {
      return res.status(200).json({
        success: true,
        connected: false,
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        authorizedEmail: null,
        error: 'Faltan las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET en Vercel',
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
        authorizedEmail: null,
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: 'Google Drive no está conectado aún. La Dra. Lorena debe hacer clic en "Conectar Google Drive".',
      });
    }
  } catch (error: any) {
    console.error('[Drive Status Error]:', error);
    return res.status(200).json({
      success: false,
      connected: false,
      error: error?.message || 'Error al verificar estado de Google Drive',
    });
  }
}
