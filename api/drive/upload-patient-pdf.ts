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
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { patientName, patientId, fileDataUrl, fileName } = req.body || {};
    if (!fileDataUrl) {
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos de archivo PDF' });
    }

    console.log('[Google Drive Serverless] ========================================');
    console.log(`[Google Drive Serverless] Solicitud de subida para paciente: ${patientName || patientId}`);

    let base64Data = fileDataUrl;
    if (fileDataUrl.includes(',')) {
      base64Data = fileDataUrl.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');

    const safePatientName = patientName || 'Paciente';
    const cleanName = safePatientName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    const todayStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName || `Cuestionario_${cleanName}_${todayStr}.pdf`;

    const uploadResult = await uploadPdfBufferWithServiceAccount(
      buffer,
      finalFileName,
      safePatientName
    );

    console.log(`[Google Drive Serverless] Subida a Drive completada con éxito. Link: ${uploadResult.webViewLink}`);
    console.log('[Google Drive Serverless] ========================================');

    return res.status(200).json({
      success: true,
      fileId: uploadResult.fileId,
      fileName: uploadResult.fileName,
      webViewLink: uploadResult.webViewLink,
      folderId: uploadResult.folderId,
    });
  } catch (error: any) {
    console.warn('[Google Drive Serverless Service Account Notice]:', error?.message);
    return res.status(200).json({
      success: false,
      error: error.message || 'Error al subir PDF a Google Drive',
      reason: 'service_account_not_configured_or_error',
    });
  }
}
