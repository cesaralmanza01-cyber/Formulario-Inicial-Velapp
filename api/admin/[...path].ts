import crypto from 'crypto';
import { Readable } from 'stream';
import { google } from 'googleapis';
import {
  applyCors,
  parseRequestBody,
  extractAuthPayload,
  getAllPatients,
  getUserByEmail,
  saveUserRecord,
  getCleanEnv,
  getGoogleDriveStoredTokens,
  UserRecord,
} from '../_lib/serverAuth';

const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';
const GOOGLE_DRIVE_FOLDER_NAME = 'FORMULARIO CONSULTAS VELA';

function extractSubPath(req: any): string {
  if (req.url) {
    const raw = req.url.split('?')[0];
    const prefix = '/api/admin';
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length).replace(/^\/+|\/+$/g, '');
    }
  }
  if (req.query?.path) {
    if (Array.isArray(req.query.path)) {
      return req.query.path.join('/');
    }
    return String(req.query.path).replace(/^\/+|\/+$/g, '');
  }
  return '';
}

export default async function handler(req: any, res: any) {
  applyCors(req, res, 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const subPath = extractSubPath(req);

  // 1. GET /api/admin/patients
  if (subPath === 'patients') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido (Use GET)' });
    }

    try {
      const authUser = extractAuthPayload(req);
      if (!authUser || authUser.rol !== 'doctora') {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requiere autenticación con rol de doctora.',
        });
      }

      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      let baseUrl = `${proto}://${host}`;
      const customAppUrl = getCleanEnv('APP_URL');
      if (customAppUrl) {
        baseUrl = customAppUrl.replace(/\/$/, '');
      }

      const patients = await getAllPatients();
      const formatted = patients.map((p) => {
        let inviteLink: string | undefined = undefined;
        if (p.invitationToken) {
          inviteLink = `${baseUrl}/?invitacion=${p.invitationToken}`;
        }
        return {
          ...p,
          inviteLink,
        };
      });

      return res.status(200).json({ success: true, patients: formatted });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error al obtener pacientes' });
    }
  }

  // 2. POST /api/admin/invitations
  if (subPath === 'invitations') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido (Use POST)' });
    }

    try {
      const authUser = extractAuthPayload(req);
      if (!authUser || authUser.rol !== 'doctora') {
        return res.status(403).json({
          success: false,
          error: 'Acceso denegado. Se requiere autenticación con rol de doctora.',
        });
      }

      const { nombre, email } = parseRequestBody(req);
      if (!nombre || !email) {
        return res.status(400).json({ success: false, error: 'Ingresa el nombre completo y correo del paciente.' });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanNombre = String(nombre).trim();

      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        return res.status(400).json({ success: false, error: 'Ingresa un correo electrónico válido.' });
      }

      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const proto = req.headers['x-forwarded-proto'] || 'https';
      let baseUrl = `${proto}://${host}`;
      const customAppUrl = getCleanEnv('APP_URL');
      if (customAppUrl) {
        baseUrl = customAppUrl.replace(/\/$/, '');
      }

      const existingUser = await getUserByEmail(cleanEmail);
      const token = crypto.randomBytes(24).toString('hex');
      const inviteLink = `${baseUrl}/?invitacion=${token}`;

      if (existingUser) {
        if (existingUser.estado === 'registrado') {
          return res.status(400).json({
            success: false,
            error: `Ya existe una cuenta activa para ${cleanEmail}. El paciente ya puede ingresar con su correo y contraseña.`,
          });
        }

        const updated: UserRecord = {
          ...existingUser,
          nombre: cleanNombre || existingUser.nombre,
          invitationToken: token,
          invitationCreatedAt: new Date().toISOString(),
        };
        await saveUserRecord(updated);

        return res.status(200).json({
          success: true,
          token,
          inviteLink,
          message: 'Invitación renovada exitosamente.',
          patient: {
            id: updated.id,
            nombre: updated.nombre,
            email: updated.email,
            estado: updated.estado,
            clinicalStatus: 'invitado',
          },
        });
      }

      const newPatient: UserRecord = {
        id: `pac_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        nombre: cleanNombre,
        rol: 'paciente',
        estado: 'invitado',
        invitationToken: token,
        invitationCreatedAt: new Date().toISOString(),
        fechaCreacion: new Date().toISOString(),
      };

      await saveUserRecord(newPatient);

      return res.status(200).json({
        success: true,
        token,
        inviteLink,
        message: 'Invitación creada exitosamente.',
        patient: {
          id: newPatient.id,
          nombre: newPatient.nombre,
          email: newPatient.email,
          estado: newPatient.estado,
          clinicalStatus: 'invitado',
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Error al generar invitación' });
    }
  }

  // 3. GET /api/admin/drive/status
  if (subPath === 'drive/status') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido (Use GET)' });
    }

    try {
      const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
      const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
      const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

      if (!clientId || !clientSecret) {
        return res.status(200).json({
          success: true,
          connected: false,
          reason: 'missing_credentials',
          message: 'Faltan credenciales de Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
          folderId: destinationFolderId,
          folderName: GOOGLE_DRIVE_FOLDER_NAME,
        });
      }

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
      }

      return res.status(200).json({
        success: true,
        connected: false,
        reason: 'not_authenticated',
        message: 'La médica aún no ha conectado Google Drive mediante el botón de autorización.',
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
      });
    } catch (error: any) {
      return res.status(200).json({
        success: false,
        connected: false,
        error: error?.message || 'Error verificando el estado de Google Drive',
      });
    }
  }

  // 4. POST /api/admin/drive/test-upload
  if (subPath === 'drive/test-upload') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido (Use POST)' });
    }

    try {
      const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
      const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
      const destinationFolderId = getCleanEnv('GOOGLE_DRIVE_FOLDER_ID') || DEFAULT_FOLDER_ID;

      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'Faltan credenciales de Google OAuth (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET)',
        });
      }

      const tokenData = await getGoogleDriveStoredTokens();
      if (!tokenData || !tokenData.refreshToken) {
        return res.status(400).json({
          success: false,
          error: 'Google Drive no está conectado. Por favor haz clic en "Conectar Google Drive" primero.',
        });
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken });

      const drive = google.drive({ version: 'v3', auth: oauth2Client });
      const timestamp = new Date().toLocaleString('es-CL', { timeZone: 'America/Santiago' });
      const fileContent = `=====================================================
VELA MEDICINA & NUTRICIÓN INTEGRAL - ARCHIVO DE PRUEBA
=====================================================
Fecha y Hora: ${timestamp}
ID de Carpeta: ${destinationFolderId}
Estado: ¡Conexión OAuth con Google Drive establecida exitosamente!
=====================================================`;

      const stream = Readable.from([Buffer.from(fileContent, 'utf-8')]);
      const fileMetadata: any = {
        name: `Test_Conexion_Vela_${Date.now()}.txt`,
        mimeType: 'text/plain',
        description: 'Archivo de diagnóstico y verificación de Google Drive - Vela Médica',
      };

      if (destinationFolderId) {
        fileMetadata.parents = [destinationFolderId];
      }

      const driveRes = await drive.files.create({
        requestBody: fileMetadata,
        media: { mimeType: 'text/plain', body: stream },
        fields: 'id, name, webViewLink, parents',
        supportsAllDrives: true,
      });

      return res.status(200).json({
        success: true,
        message: 'Archivo de prueba subido exitosamente a Google Drive',
        fileId: driveRes.data.id,
        fileName: driveRes.data.name,
        webViewLink: driveRes.data.webViewLink,
        folderId: destinationFolderId,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: error?.message || 'Error al ejecutar prueba de subida a Google Drive',
      });
    }
  }

  return res.status(404).json({ success: false, error: `Ruta /api/admin/${subPath} no encontrada.` });
}
