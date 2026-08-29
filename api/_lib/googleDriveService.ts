import { Readable } from 'stream';
import { google } from 'googleapis';

export const GOOGLE_DRIVE_FOLDER_NAME = 'Vela - Cuestionarios Pacientes';
export const SERVICE_ACCOUNT_EMAIL = 'vela-drive-uploader@consultorio-m5-95.iam.gserviceaccount.com';

/**
 * Helper to get Google Drive client authenticated via Service Account JSON key
 */
export function getGoogleDriveServiceAccountClient(): { drive: any; folderId: string; serviceAccountEmail: string } {
  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!rawKey) {
    throw new Error(
      'Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY en el servidor/Vercel. Por favor configura el JSON de la cuenta de servicio.'
    );
  }

  let credentials: any;
  try {
    const trimmed = rawKey.trim();
    if (trimmed.startsWith('{')) {
      credentials = JSON.parse(trimmed);
    } else {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      credentials = JSON.parse(decoded);
    }
  } catch (parseErr: any) {
    throw new Error(`Error al parsear el JSON de GOOGLE_SERVICE_ACCOUNT_KEY: ${parseErr.message}`);
  }

  // Google Drive Scope
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth });
  const targetFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

  return {
    drive,
    folderId: targetFolderId,
    serviceAccountEmail: credentials.client_email || SERVICE_ACCOUNT_EMAIL,
  };
}

/**
 * Upload PDF buffer directly to Google Drive via Service Account
 */
export async function uploadPdfBufferWithServiceAccount(
  buffer: Buffer,
  fileName: string,
  patientName: string,
  overrideFolderId?: string
): Promise<{ fileId: string; fileName: string; webViewLink: string; folderId: string }> {
  const { drive, folderId: envFolderId, serviceAccountEmail } = getGoogleDriveServiceAccountClient();
  const destinationFolderId = overrideFolderId || envFolderId;

  const fileMetadata: any = {
    name: fileName,
    mimeType: 'application/pdf',
    description: `Cuestionario inicial de la paciente ${patientName} — Vela Medicina & Nutrición Integral`,
  };

  if (destinationFolderId) {
    fileMetadata.parents = [destinationFolderId];
  }

  const media = {
    mimeType: 'application/pdf',
    body: Readable.from(buffer),
  };

  console.log(
    `[Google Drive Service Account] Subiendo archivo '${fileName}' (${buffer.length} bytes) como '${serviceAccountEmail}' a la carpeta ID: '${destinationFolderId || 'Root'}'...`
  );

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink, parents',
    supportsAllDrives: true,
  });

  const fileId = res.data.id;
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  // Make file readable to anyone with link for doctor ease of viewing
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
      supportsAllDrives: true,
    });
  } catch (permErr: any) {
    console.warn('[Google Drive Service Account] Permisos públicos opcionales aviso:', permErr?.message);
  }

  return {
    fileId: fileId,
    fileName: res.data.name || fileName,
    webViewLink: webViewLink,
    folderId: destinationFolderId,
  };
}
