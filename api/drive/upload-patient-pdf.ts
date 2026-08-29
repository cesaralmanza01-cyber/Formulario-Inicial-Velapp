import { Readable } from 'stream';
import { google } from 'googleapis';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const DEFAULT_SERVICE_ACCOUNT_EMAIL = 'vela-drive-uploader@consultorio-m5-95.iam.gserviceaccount.com';

/**
 * Safely parses and normalizes Google Service Account credentials.
 */
function parseServiceAccountCredentials(rawKey: string): {
  client_email: string;
  private_key: string;
  project_id?: string;
} {
  if (!rawKey || typeof rawKey !== 'string') {
    throw new Error('Falta la variable de entorno GOOGLE_SERVICE_ACCOUNT_KEY en Vercel.');
  }

  let str = rawKey.trim();
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
    throw new Error('El JSON de la cuenta de servicio no contiene "client_email".');
  }
  if (!parsed.private_key) {
    throw new Error('El JSON de la cuenta de servicio no contiene "private_key".');
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
    project_id: parsed.project_id,
  };
}

/**
 * Upload PDF buffer directly to Google Drive via Service Account
 */
async function uploadPdfBufferWithServiceAccount(
  buffer: Buffer,
  fileName: string,
  patientName: string
): Promise<{ fileId: string; fileName: string; webViewLink: string; folderId: string }> {
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

  const jwtClient = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  const drive = google.drive({ version: 'v3', auth: jwtClient });
  const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

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
    `[Google Drive Service Account] Subiendo archivo '${fileName}' (${buffer.length} bytes) como '${credentials.client_email}' a la carpeta ID: '${destinationFolderId || 'Root'}'...`
  );

  const res = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: 'id, name, webViewLink, webContentLink, parents',
    supportsAllDrives: true,
  });

  const fileId = res.data.id || '';
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

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
        console.error('[Upload PDF Serverless] Error al parsear JSON del body:', parseErr);
        return res.status(400).json({ success: false, error: 'Cuerpo de la solicitud no es un JSON válido' });
      }
    }

    const { patientName, patientId, fileDataUrl, fileName } = body || {};

    if (!fileDataUrl) {
      console.error('[Upload PDF Serverless] Solicitud rechazada: falta fileDataUrl.');
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos de archivo PDF (fileDataUrl)' });
    }

    console.log('[Upload PDF Serverless] ========================================');
    console.log(`[Upload PDF Serverless] Iniciando subida para paciente: '${patientName || patientId || 'Sin Nombre'}'`);

    let base64Data = fileDataUrl;
    if (typeof fileDataUrl === 'string' && fileDataUrl.includes(',')) {
      base64Data = fileDataUrl.split(',')[1];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    console.log(`[Upload PDF Serverless] Tamaño del buffer decodificado: ${buffer.length} bytes`);

    const safePatientName = patientName || 'Paciente';
    const cleanName = safePatientName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    const todayStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName || `Cuestionario_${cleanName}_${todayStr}.pdf`;

    const uploadResult = await uploadPdfBufferWithServiceAccount(
      buffer,
      finalFileName,
      safePatientName
    );

    console.log(`[Upload PDF Serverless] ¡Subida a Google Drive exitosa!`);
    console.log(`[Upload PDF Serverless] File ID: ${uploadResult.fileId}`);
    console.log(`[Upload PDF Serverless] Link: ${uploadResult.webViewLink}`);
    console.log('[Upload PDF Serverless] ========================================');

    return res.status(200).json({
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      webViewLink: uploadResult.webViewLink,
      folderId: uploadResult.folderId,
    });
  } catch (error: any) {
    console.error('================================================================');
    console.error('[Upload PDF Serverless ERROR FATAL]:', error?.message || error);
    if (error?.stack) {
      console.error('[Upload PDF Serverless STACK TRACE]:', error.stack);
    }
    if (error?.response?.data) {
      console.error('[Google Drive API Raw Error Data]:', JSON.stringify(error.response.data));
    }
    console.error('================================================================');

    return res.status(200).json({
      success: false,
      error: error?.message || 'Error interno al procesar subida a Google Drive',
      reason: 'service_account_or_drive_api_error',
    });
  }
}
