import { Readable } from 'stream';
import { google } from 'googleapis';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

function getCleanEnv(key: string): string {
  const val = process.env[key] || '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseServiceAccount(raw: string | undefined): any | null {
  if (!raw) return null;
  let str = raw.trim();
  if (!str) return null;

  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  if (!str.startsWith('{') && str.length > 20) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      if (decoded.trim().startsWith('{')) {
        str = decoded.trim();
      }
    } catch {}
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch (err: any) {
    try {
      const fixedStr = str.replace(/[\r\n]+/g, ' ');
      const parsed = JSON.parse(fixedStr);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {}
    try {
      const unescaped = str.replace(/\\\\/g, '\\');
      const parsed = JSON.parse(unescaped);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {}
  }

  return null;
}

function resolveServiceAccount(): { sa: any; sourceVar: string } | null {
  const envVarNames = [
    'FIREBASE_SERVICE_ACCOUNT',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'FIREBASE_SERVICE_ACCOUNT_KEY',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'SERVICE_ACCOUNT_KEY',
    'FIREBASE_CREDENTIALS',
    'GCP_SERVICE_ACCOUNT',
  ];

  for (const varName of envVarNames) {
    const val = process.env[varName];
    if (val && val.trim().length > 10) {
      const parsed = parseServiceAccount(val);
      if (parsed) {
        return { sa: parsed, sourceVar: varName };
      }
    }
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY || process.env.GOOGLE_PRIVATE_KEY;
  if (clientEmail && privateKey) {
    return {
      sa: {
        client_email: clientEmail.trim(),
        private_key: privateKey.trim().replace(/\\n/g, '\n'),
        project_id: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_PROJECT_ID || FIREBASE_PROJECT_ID,
      },
      sourceVar: 'FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY',
    };
  }

  return null;
}

function cleanFirestoreObject(obj: any): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreObject);
  }
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = cleanFirestoreObject(value);
    }
  }
  return result;
}

function getAdminFirestore() {
  try {
    if (getAdminApps().length > 0) {
      const app = getAdminApp();
      const db = getAdminFirestoreInstance(app);
      try {
        db.settings({ ignoreUndefinedProperties: true });
      } catch {}
      return db;
    }

    const resolved = resolveServiceAccount();
    if (!resolved) {
      console.warn('[Upload PDF] Firebase Admin service account no configurada o inválida.');
      return null;
    }

    const { sa, sourceVar } = resolved;
    const targetProjectId = sa.project_id || FIREBASE_PROJECT_ID;
    console.log(`[Upload PDF] ✅ Inicializando Firebase Admin con "${sourceVar}" (Project: ${targetProjectId})`);

    const app = initAdminApp({
      credential: cert(sa),
      projectId: targetProjectId,
    });

    const db = getAdminFirestoreInstance(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {}
    return db;
  } catch (err: any) {
    console.warn('[Upload PDF] Firebase Admin Init Notice:', err?.message || err);
    return null;
  }
}

async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  const envRefreshToken = getCleanEnv('GOOGLE_DRIVE_REFRESH_TOKEN');
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: getCleanEnv('GOOGLE_DRIVE_AUTHORIZED_EMAIL') || 'comerconcalma@gmail.com',
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      const snap = await dbAdmin.collection('_system_config').doc('google_drive_tokens').get();
      if (snap.exists) {
        const data = snap.data() as StoredDriveTokens;
        if (data?.refreshToken) {
          return data;
        }
      }
    }
  } catch (adminErr: any) {
    console.error('[Upload PDF] Firebase Admin fetch error:', adminErr?.message || adminErr);
  }

  return null;
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';

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
        return res.status(400).json({ success: false, error: 'Cuerpo no es un JSON válido' });
      }
    }

    const { patientName, patientId, fileDataUrl, fileName, questionnaireData } = body || {};

    if (!fileDataUrl) {
      return res.status(400).json({ success: false, error: 'No se proporcionaron datos de archivo PDF' });
    }

    const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
    const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

    if (!clientId || !clientSecret) {
      console.warn('[Upload PDF] Faltan GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET. Fallando silenciosamente...');
      return res.status(200).json({
        success: false,
        reason: 'oauth_not_configured',
        error: 'OAuth no configurado en variables de entorno',
      });
    }

    // Fetch Refresh Token via Firebase Admin SDK
    const tokenData = await getGoogleDriveStoredTokens();

    if (!tokenData || !tokenData.refreshToken) {
      console.warn('[Upload PDF] No existe refresh_token disponible. La médica no ha conectado Google Drive ni se definió GOOGLE_DRIVE_REFRESH_TOKEN.');
      return res.status(200).json({
        success: false,
        reason: 'drive_not_linked',
        error: 'Google Drive no ha sido conectado por la médica',
      });
    }

    const refreshToken = tokenData.refreshToken;

    // Initialize OAuth client with Refresh Token
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Decode base64 data to buffer
    let base64Data = fileDataUrl;
    if (typeof fileDataUrl === 'string' && fileDataUrl.includes(',')) {
      base64Data = fileDataUrl.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');

    const safePatientName = patientName || questionnaireData?.patientName || 'Paciente';
    const cleanName = safePatientName.trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ');
    const todayStr = new Date().toISOString().split('T')[0];
    const finalFileName = fileName || `Cuestionario_${cleanName}_${todayStr}.pdf`;

    const fileMetadata: any = {
      name: finalFileName,
      mimeType: 'application/pdf',
      description: `Cuestionario inicial de la paciente ${safePatientName} — Vela Medicina & Nutrición Integral`,
    };

    if (destinationFolderId) {
      fileMetadata.parents = [destinationFolderId];
    }

    const stream = Readable.from(buffer);
    const media = {
      mimeType: 'application/pdf',
      body: stream,
    };

    console.log(`[Upload PDF OAuth] Subiendo archivo '${finalFileName}' (${buffer.length} bytes) a carpeta ${destinationFolderId}...`);

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, parents',
      supportsAllDrives: true,
    });

    const fileId = driveRes.data.id || '';
    const webViewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

    console.log(`[Upload PDF OAuth] ✅ ¡Subida a Google Drive exitosa! File ID: ${fileId} — Link: ${webViewLink}`);

    // Persist complete questionnaire document directly in Firestore via Firebase Admin SDK
    const effectivePatientId = String(patientId || questionnaireData?.patientId || `paciente_${Date.now()}`).trim();
    const qData = questionnaireData || {};
    const safeDocNumber = qData.patientDocument || qData.identificacion?.documentNumber || '';
    const safeEmail = qData.patientEmail || qData.userEmail || qData.identificacion?.email || '';
    const safePhone = qData.patientPhone || qData.identificacion?.phone || '';

    const rawDocToSave = {
      ...qData,
      patientId: effectivePatientId,
      patientName: safePatientName,
      patientDocument: safeDocNumber,
      patientEmail: safeEmail,
      patientPhone: safePhone,
      status: 'completado',
      isSavedByPatient: true,
      currentStep: qData.currentStep || 11,
      startedAt: qData.startedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: qData.completedAt || new Date().toISOString(),
      driveFileId: fileId,
      driveFileName: finalFileName,
      driveWebViewLink: webViewLink,
      pdfUrl: webViewLink,
    };
    const completeDocToSave = cleanFirestoreObject(rawDocToSave);

    console.log(`[Upload PDF Serverless] 💾 Guardando cuestionario consolidado en Firestore...`);
    console.log(`  -> Colección: "cuestionarios_iniciales"`);
    console.log(`  -> ID Documento: "${effectivePatientId}"`);
    console.log(`  -> Paciente: "${safePatientName}"`);
    console.log(`  -> Documento: "${safeDocNumber}" | Email: "${safeEmail}" | Celular: "${safePhone}"`);
    console.log(`  -> Enlace Drive: "${webViewLink}"`);

    try {
      const dbAdmin = getAdminFirestore();
      if (dbAdmin) {
        // 1. Save document to 'cuestionarios_iniciales'
        await dbAdmin.collection('cuestionarios_iniciales').doc(effectivePatientId).set(completeDocToSave, { merge: true });
        console.log(`[Upload PDF Serverless] ✅ Documento guardado exitosamente en Firestore ('cuestionarios_iniciales/${effectivePatientId}').`);

        // 2. If user exists in 'usuarios', update questionnaire status
        if (safeEmail) {
          const userSnap = await dbAdmin.collection('usuarios').where('email', '==', safeEmail.toLowerCase().trim()).get();
          if (!userSnap.empty) {
            for (const userDoc of userSnap.docs) {
              await userDoc.ref.set(
                cleanFirestoreObject({
                  cuestionarioCompletado: true,
                  cuestionarioId: effectivePatientId,
                  cuestionarioDriveLink: webViewLink,
                  cuestionarioUpdatedAt: new Date().toISOString(),
                  ...(safeDocNumber ? { documento: safeDocNumber } : {}),
                  ...(safePhone ? { celular: safePhone } : {}),
                  ...(safePatientName && safePatientName !== 'Paciente' ? { nombre: safePatientName } : {}),
                }),
                { merge: true }
              );
              console.log(`[Upload PDF Serverless] 🔗 Usuario vinculado en 'usuarios' (${safeEmail}, doc: ${userDoc.id}).`);
            }
          }
        }
      } else {
        console.warn(`[Upload PDF Serverless] ⚠️ No se pudo obtener dbAdmin para guardar en Firestore.`);
      }
    } catch (fErr: any) {
      console.error(`[Upload PDF Serverless] ❌ Error guardando en Firestore:`, fErr?.message || fErr);
    }

    return res.status(200).json({
      success: true,
      fileId,
      fileName: finalFileName,
      webViewLink,
      folderId: destinationFolderId,
    });
  } catch (error: any) {
    console.error('================================================================');
    console.error('[Upload Patient PDF ERROR]:', error?.message || error);
    if (error?.response?.data) {
      console.error('[Google Drive API Raw Error]:', JSON.stringify(error.response.data));
    }
    console.error('================================================================');

    return res.status(200).json({
      success: false,
      error: error?.message || 'Error al subir a Google Drive',
      reason: 'drive_upload_failed',
    });
  }
}
