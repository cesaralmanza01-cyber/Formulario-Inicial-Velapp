import { Readable } from 'stream';
import { google } from 'googleapis';

export const GOOGLE_DRIVE_FOLDER_NAME = 'Vela - Cuestionarios Pacientes';
export const SERVICE_ACCOUNT_EMAIL = 'vela-drive-uploader@consultorio-m5-95.iam.gserviceaccount.com';

/**
 * Safely parses and normalizes Google Service Account credentials.
 * Handles escaped newlines, stringified JSON, base64 encoding, and formatting edge cases.
 */
export function parseServiceAccountCredentials(rawKey: string): {
  client_email: string;
  private_key: string;
  project_id?: string;
} {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY en el servidor/Vercel.');
  }

  let str = rawKey.trim();

  // Remove potential wrapping quotes if added by Vercel env variable UI
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  let parsed: any;
  if (str.startsWith('{')) {
    try {
      parsed = JSON.parse(str);
    } catch (e: any) {
      try {
        const sanitized = str.replace(/\r?\n/g, '\\n');
        parsed = JSON.parse(sanitized);
      } catch (e2: any) {
        throw new Error(`Error parseando el JSON de GOOGLE_SERVICE_ACCOUNT_KEY: ${e.message}`);
      }
    }
  } else {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch (e: any) {
      throw new Error(`El valor de GOOGLE_SERVICE_ACCOUNT_KEY no es un JSON válido ni base64: ${e.message}`);
    }
  }

  if (!parsed.client_email) {
    throw new Error('El JSON de la cuenta de servicio no contiene el campo "client_email".');
  }
  if (!parsed.private_key) {
    throw new Error('El JSON de la cuenta de servicio no contiene el campo "private_key".');
  }

  // CRITICAL FIX: Convert literal escaped \n strings to real newline characters
  let formattedPrivateKey = parsed.private_key;
  if (typeof formattedPrivateKey === 'string') {
    formattedPrivateKey = formattedPrivateKey.replace(/\\n/g, '\n');
    // Ensure standard PEM boundary if truncated
    if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      formattedPrivateKey = `-----BEGIN PRIVATE KEY-----\n${formattedPrivateKey}\n-----END PRIVATE KEY-----\n`;
    }
  }

  return {
    client_email: String(parsed.client_email).trim(),
    private_key: formattedPrivateKey,
    project_id: parsed.project_id,
  };
}

/**
 * Helper to get Google Drive client authenticated via Direct JWT Client.
 * Using JWT avoids slow GCP metadata server lookups that cause serverless function timeouts.
 */
export function getGoogleDriveServiceAccountClient(): {
  drive: any;
  folderId: string;
  serviceAccountEmail: string;
} {
  const rawKey =
    process.env.GOOGLE_SERVICE_ACCOUNT_KEY ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON ||
    process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!rawKey) {
    throw new Error(
      'Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY en Vercel. Por favor configura el JSON de la cuenta de servicio.'
    );
  }

  const credentials = parseServiceAccountCredentials(rawKey);

  // Use direct JWT auth to avoid metadata server discovery lag in serverless environments
  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth: jwtClient });
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

  const stream = Readable.from(buffer);
  stream.on('error', (err) => {
    console.error('[Google Drive Stream Error]:', err);
  });

  const media = {
    mimeType: 'application/pdf',
    body: stream,
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
