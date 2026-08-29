import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { firebaseConfig } from '../../../src/firebaseConfig';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

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

    // Check Firestore for stored refresh token
    const tokensRef = doc(db, '_system_config', 'google_drive_tokens');
    const snap = await getDoc(tokensRef);

    if (snap.exists() && snap.data()?.refreshToken) {
      const data = snap.data();
      return res.status(200).json({
        success: true,
        connected: true,
        authorizedEmail: data.authorizedEmail || 'comerconcalma@gmail.com',
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        updatedAt: data.updatedAt,
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
