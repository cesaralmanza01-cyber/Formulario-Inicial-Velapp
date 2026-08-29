import { uploadPdfBufferWithServiceAccount } from '../../_lib/googleDriveService';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
    const testPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 80>>stream\nBT /F1 16 Tf 50 750 Td (Vela - Prueba de conexion con Cuenta de Servicio Google Drive en Vercel exitosa) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000228 00000 n\n0000000354 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n428\n%%EOF`;
    const buffer = Buffer.from(testPdfContent, 'utf-8');
    const testFileName = `Prueba_ServiceAccount_Vela_${Date.now()}.pdf`;

    const result = await uploadPdfBufferWithServiceAccount(
      buffer,
      testFileName,
      'Administración Médica Vela'
    );

    return res.status(200).json({
      success: true,
      ...result,
      message: '¡Archivo de prueba subido exitosamente a Google Drive con la Cuenta de Servicio!',
    });
  } catch (error: any) {
    console.error('[Google Drive Vercel Serverless Test Error]:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
