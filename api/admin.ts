import crypto from 'crypto';
import { Readable } from 'stream';
import jwt from 'jsonwebtoken';
import { google } from 'googleapis';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';

interface UserRecord {
  id: string;
  email: string;
  nombre: string;
  rol: 'doctora' | 'paciente';
  password?: string;
  estado: 'invitado' | 'registrado';
  fechaCreacion: string;
  fechaRegistro?: string;
  fechaActualizacion?: string;
  invitationToken?: string | null;
  invitationCreatedAt?: string | null;
  cuestionarioCompletado?: boolean;
  cuestionarioId?: string | null;
  cuestionarioUpdatedAt?: string | null;
  cuestionarioDriveLink?: string | null;
}

interface AuthTokenPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: 'doctora' | 'paciente';
}

interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';
const DEFAULT_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';
const GOOGLE_DRIVE_FOLDER_NAME = 'FORMULARIO CONSULTAS VELA';

function getCleanEnv(key: string): string {
  const val = process.env[key] || '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const JWT_SECRET = getCleanEnv('JWT_SECRET') || 'vela_jwt_secret_signature_key_2026_medicina_funcional';
const DOCTOR_EMAIL = (getCleanEnv('DOCTOR_EMAIL') || 'comerconcalma@gmail.com').toLowerCase().trim();

function parseServiceAccount(raw: string | undefined): any | null {
  if (!raw) return null;
  let str = raw.trim();
  if (!str) return null;

  // Strip wrapping outer quotes if present
  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  // Check if string is base64 encoded JSON
  if (!str.startsWith('{') && str.length > 20) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      if (decoded.trim().startsWith('{')) {
        str = decoded.trim();
      }
    } catch {}
  }

  // Attempt 1: Standard JSON parse
  try {
    const parsed = JSON.parse(str);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
  } catch (err: any) {
    // Attempt 2: Handle raw unescaped newlines in JSON strings
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

    // Attempt 3: Fix double-escaped slashes
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

  // Check individual env vars
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

function getAdminFirestore(): any | null {
  try {
    if (getAdminApps().length > 0) {
      return getAdminFirestoreInstance(getAdminApp());
    }

    const resolved = resolveServiceAccount();
    if (!resolved) {
      console.warn(
        '[Firebase Admin] ⚠️ No se encontró ninguna credencial válida de Firebase Admin en las variables de entorno.\n' +
        'Variables verificadas: FIREBASE_SERVICE_ACCOUNT, GOOGLE_SERVICE_ACCOUNT_KEY, FIREBASE_SERVICE_ACCOUNT_KEY, GOOGLE_APPLICATION_CREDENTIALS, SERVICE_ACCOUNT_KEY.\n' +
        'Configura en Vercel (Settings -> Environment Variables) la variable FIREBASE_SERVICE_ACCOUNT con el JSON de la clave de Firebase.'
      );
      return null;
    }

    const { sa, sourceVar } = resolved;
    const targetProjectId = sa.project_id || FIREBASE_PROJECT_ID;
    console.log(
      `[Firebase Admin] ✅ Inicializando Firebase Admin con credencial de variable "${sourceVar}".\n` +
      `  -> Proyecto destino: "${targetProjectId}"\n` +
      `  -> Client Email: "${sa.client_email}"`
    );

    initAdminApp({
      credential: cert(sa),
      projectId: targetProjectId,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.error('[Firebase Admin] ❌ Error inicializando Firebase Admin SDK:', err?.message || err);
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
    console.error('[Admin Serverless] Firebase Admin fetch error:', adminErr?.message || adminErr);
  }

  return null;
}

let localUsersCache: UserRecord[] = [];

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

function extractAuthPayload(req: any): AuthTokenPayload | null {
  let token: string | null = null;
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && req.headers?.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (const cookie of cookies) {
      const [name, val] = cookie.trim().split('=');
      if (name === 'vela_session' && val) {
        token = decodeURIComponent(val);
        break;
      }
    }
  }

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
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

async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const db = getAdminFirestore();

  if (db) {
    try {
      const snap = await db.collection('usuarios').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() as UserRecord;
        const user = { ...data, id: doc.id };
        updateCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[Admin Serverless] Firestore getUserByEmail notice:', err);
    }
  }

  const cached = localUsersCache.find((u) => u.email.toLowerCase() === cleanEmail);
  if (cached) return cached;

  if (cleanEmail === DOCTOR_EMAIL || cleanEmail === 'comerconcalma@gmail.com' || cleanEmail === 'lorena@velaclinic.co') {
    return {
      id: `doc_${DOCTOR_EMAIL.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: DOCTOR_EMAIL,
      nombre: 'Dra. Lorena Castro',
      rol: 'doctora',
      estado: 'registrado',
      fechaCreacion: new Date().toISOString(),
    };
  }

  return null;
}

async function saveUserRecord(user: UserRecord): Promise<UserRecord> {
  updateCache(user);
  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    } catch (err: any) {
      console.warn('[Admin Serverless] Firestore saveUserRecord error:', err?.message || err);
    }
  }
  return user;
}

function updateCache(user: UserRecord) {
  const index = localUsersCache.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    localUsersCache[index] = { ...localUsersCache[index], ...user };
  } else {
    localUsersCache.push(user);
  }
}

async function getAllPatients(): Promise<any[]> {
  console.log('[Admin Serverless] 🚀 Obteniendo listado de pacientes...');
  const db = getAdminFirestore();
  const usersMap = new Map<string, UserRecord>();
  const questionnairesMap = new Map<string, any>();

  for (const u of localUsersCache) {
    if (u.rol === 'paciente') {
      usersMap.set(u.id, { ...u });
    }
  }

  if (db) {
    try {
      console.log('[Admin Serverless] 📡 Consultando colección "usuarios" en Firestore...');
      const snap = await db.collection('usuarios').where('rol', '==', 'paciente').get();
      console.log(`[Admin Serverless] 📋 Colección "usuarios": ${snap.size} registros encontrados.`);
      snap.forEach((doc: any) => {
        const data = doc.data() as UserRecord;
        usersMap.set(doc.id, { ...data, id: doc.id });
      });
    } catch (err: any) {
      console.error('[Admin Serverless] ❌ Error consultando colección "usuarios":', err?.message || err);
    }

    try {
      console.log('[Admin Serverless] 📡 Consultando colección "cuestionarios_iniciales" en Firestore...');
      const qSnap = await db.collection('cuestionarios_iniciales').get();
      console.log(`[Admin Serverless] 📝 Colección "cuestionarios_iniciales": ${qSnap.size} documentos encontrados.`);
      qSnap.forEach((doc: any) => {
        const qData = doc.data();
        const qId = doc.id;
        questionnairesMap.set(qId, { ...qData, id: qId });
        console.log(`  -> [Doc: ${qId}] Paciente: "${qData.patientName || qData.identificacion?.fullName || 'N/A'}" | Email: "${qData.patientEmail || qData.userEmail || 'N/A'}" | Status: "${qData.status}" | Step: ${qData.currentStep}`);
      });
    } catch (err: any) {
      console.error('[Admin Serverless] ❌ Error consultando colección "cuestionarios_iniciales":', err?.message || err);
    }
  } else {
    console.warn('[Admin Serverless] ⚠️ Firestore no disponible (getAdminFirestore retornó null). Usando caché local.');
  }

  const patientMap = new Map<string, any>();
  const emailIndex = new Map<string, string>();
  const docIndex = new Map<string, string>();

  // Step A: Seed with invited/registered users
  for (const u of usersMap.values()) {
    const cleanEmail = (u.email || '').toLowerCase().trim();
    const item = {
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      documento: '',
      celular: '',
      rol: 'paciente' as const,
      estado: u.estado,
      clinicalStatus: (u.estado === 'invitado' ? 'invitado' : (u.cuestionarioCompletado ? 'Formulario recibido' : 'cuenta creada')) as any,
      fechaCreacion: u.fechaCreacion,
      fechaRegistro: u.fechaRegistro,
      fechaEnvio: null as string | null,
      invitationToken: u.invitationToken,
      cuestionarioCompletado: Boolean(u.cuestionarioCompletado),
      cuestionarioId: u.cuestionarioId || null,
      cuestionarioUpdatedAt: u.cuestionarioUpdatedAt || null,
      cuestionarioDriveLink: u.cuestionarioDriveLink || null,
      cuestionarioStep: undefined as number | undefined,
      isDirectSubmission: false,
    };
    patientMap.set(u.id, item);
    if (cleanEmail) {
      emailIndex.set(cleanEmail, u.id);
    }
  }

  // Step B: Merge questionnaires received
  for (const qData of questionnairesMap.values()) {
    const qId = qData.id || qData.patientId;
    const qUserId = qData.userId;
    const qEmail = (qData.patientEmail || qData.userEmail || qData.identificacion?.email || '')?.toLowerCase()?.trim();
    const qName = (qData.patientName || qData.identificacion?.fullName || '')?.trim();
    const qDoc = (qData.patientDocument || qData.identificacion?.documentNumber || '')?.trim();
    const qPhone = (qData.patientPhone || qData.identificacion?.phone || '')?.trim();
    const qDriveLink = qData.driveWebViewLink || qData.pdfUrl || null;
    const qFechaEnvio = qData.completedAt || qData.savedAt || qData.updatedAt || qData.startedAt || null;
    const qFechaCreacion = qData.startedAt || qData.updatedAt || qData.completedAt || null;
    const isCompleted = Boolean(
      qData.status === 'completado' ||
      qData.isSavedByPatient ||
      qData.completedAt ||
      qData.driveWebViewLink ||
      qData.pdfUrl ||
      (qData.currentStep && qData.currentStep >= 10)
    );
    const qStep = qData.currentStep;

    let matchedId: string | undefined;
    if (qUserId && patientMap.has(qUserId)) {
      matchedId = qUserId;
    } else if (patientMap.has(qId)) {
      matchedId = qId;
    } else if (qEmail && emailIndex.has(qEmail)) {
      matchedId = emailIndex.get(qEmail);
    } else if (qDoc && docIndex.has(qDoc)) {
      matchedId = docIndex.get(qDoc);
    }

    if (matchedId) {
      const existing = patientMap.get(matchedId)!;
      if (qName && qName !== 'Paciente en registro' && qName !== 'Paciente sin nombre') {
        existing.nombre = qName;
      }
      if (qDoc) existing.documento = qDoc;
      if (qPhone) existing.celular = qPhone;
      if (qEmail && (!existing.email || existing.email.includes('sin correo'))) {
        existing.email = qEmail;
      }
      if (qFechaEnvio) existing.fechaEnvio = qFechaEnvio;
      if (qDriveLink) existing.cuestionarioDriveLink = qDriveLink;
      if (qData.updatedAt) existing.cuestionarioUpdatedAt = qData.updatedAt;
      if (qStep) existing.cuestionarioStep = qStep;
      existing.cuestionarioId = qId;

      if (isCompleted || existing.cuestionarioCompletado) {
        existing.cuestionarioCompletado = true;
        existing.clinicalStatus = 'Formulario recibido';
      } else if (existing.estado === 'invitado') {
        existing.clinicalStatus = 'invitado';
      } else {
        existing.clinicalStatus = 'cuenta creada';
      }

      if (qDoc) docIndex.set(qDoc, matchedId);
      if (qEmail) emailIndex.set(qEmail, matchedId);
    } else {
      const validName = (qName && qName !== 'Paciente en registro' && qName !== 'Paciente sin nombre')
        ? qName
        : (qEmail ? `Paciente (${qEmail})` : 'Paciente Formulario');

      const newPatient = {
        id: qId,
        nombre: validName,
        email: qEmail || 'Sin correo',
        documento: qDoc || '',
        celular: qPhone || '',
        rol: 'paciente' as const,
        estado: 'registrado' as const,
        clinicalStatus: (isCompleted ? 'Formulario recibido' : 'cuenta creada') as any,
        fechaCreacion: qFechaCreacion || new Date().toISOString(),
        fechaEnvio: qFechaEnvio || null,
        cuestionarioCompletado: isCompleted,
        cuestionarioId: qId,
        cuestionarioDriveLink: qDriveLink,
        cuestionarioUpdatedAt: qData.updatedAt || null,
        cuestionarioStep: qStep || null,
        isDirectSubmission: true,
      };

      patientMap.set(qId, newPatient);
      if (qEmail) emailIndex.set(qEmail, qId);
      if (qDoc) docIndex.set(qDoc, qId);
    }
  }

  const patientList = Array.from(patientMap.values());
  patientList.sort((a, b) => {
    const timeA = new Date(a.fechaEnvio || a.cuestionarioUpdatedAt || a.fechaCreacion || 0).getTime();
    const timeB = new Date(b.fechaEnvio || b.cuestionarioUpdatedAt || b.fechaCreacion || 0).getTime();
    return timeB - timeA;
  });

  const countReceived = patientList.filter((p) => p.cuestionarioCompletado || p.clinicalStatus === 'Formulario recibido').length;
  const countInvited = patientList.filter((p) => p.clinicalStatus === 'invitado').length;
  console.log(`[Admin Serverless] 🏁 Consolidación finalizada: ${patientList.length} pacientes en total (${countReceived} con formulario recibido, ${countInvited} invitaciones pendientes).`);

  return patientList;
}

function extractSubPath(req: any): string {
  // 1. Direct query parameter passed from rewrite (?subpath=...)
  if (req.query?.subpath) {
    if (Array.isArray(req.query.subpath)) {
      return req.query.subpath.join('/');
    }
    return String(req.query.subpath).replace(/^\/+|\/+$/g, '');
  }
  // 2. Direct query path if catch-all
  if (req.query?.path) {
    if (Array.isArray(req.query.path)) {
      return req.query.path.join('/');
    }
    return String(req.query.path).replace(/^\/+|\/+$/g, '');
  }
  // 3. Fallback to URL path inspection
  const url = req.url || req.headers?.['x-matched-path'] || req.headers?.['x-forwarded-uri'] || '';
  if (url) {
    const raw = url.split('?')[0];
    const prefix = '/api/admin';
    if (raw.startsWith(prefix)) {
      return raw.slice(prefix.length).replace(/^\/+|\/+$/g, '');
    }
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
