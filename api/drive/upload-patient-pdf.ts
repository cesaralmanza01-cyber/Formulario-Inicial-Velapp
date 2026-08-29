import type { IncomingMessage, ServerResponse } from 'http';
import { uploadPdfBufferWithServiceAccount } from '../_lib/googleDriveService';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

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
      stack: process.env.NODE_ENV !== 'production' ? error?.stack : undefined,
      reason: 'service_account_or_drive_api_error',
    });
  }
}
