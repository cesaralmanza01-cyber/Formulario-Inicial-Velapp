export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

function applyCors(req: any, res: any, allowedMethods: string) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

function parseRequestBody(req: any): any {
  if (!req.body) return {};
  if (typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: any, res: any) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Método no permitido (Use POST)' });
  }

  try {
    const { patientId, fileName, fileDataUrl, patientName } = parseRequestBody(req);
    if (!fileDataUrl) {
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos de archivo' });
    }

    const safePatientId = (patientId || 'paciente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safePatientName = (patientName || 'paciente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const timestamp = Date.now();
    const uniqueFileName = `${safePatientId}_${safePatientName}_${timestamp}.pdf`;

    return res.status(200).json({
      success: true,
      fileId: uniqueFileName,
      url: `/api/pdf/view/${uniqueFileName}`,
      downloadUrl: `/api/pdf/download/${uniqueFileName}`,
      size: typeof fileDataUrl === 'string' ? fileDataUrl.length : 0,
      fileName: fileName || uniqueFileName,
    });
  } catch (error: any) {
    console.error('[PDF Upload Serverless Error]:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar el archivo PDF',
    });
  }
}
