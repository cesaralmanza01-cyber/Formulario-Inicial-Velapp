import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';

export interface UserRecord {
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

export interface AuthTokenPayload {
  userId: string;
  email: string;
  nombre: string;
  rol: 'doctora' | 'paciente';
}

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

export function getCleanEnv(key: string): string {
  const val = process.env[key] || '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export const JWT_SECRET = getCleanEnv('JWT_SECRET') || 'vela_jwt_secret_signature_key_2026_medicina_funcional';
export const DOCTOR_EMAIL = (getCleanEnv('DOCTOR_EMAIL') || 'comerconcalma@gmail.com').toLowerCase().trim();
export const DOCTOR_INITIAL_PASSWORD = getCleanEnv('DOCTOR_INITIAL_PASSWORD') || 'Lorenal1728*';

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
      if (decoded.startsWith('{')) {
        str = decoded;
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
    return null;
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
    return null;
  }
}

export function getAdminFirestore(): any | null {
  try {
    if (getAdminApps().length > 0) {
      return getAdminFirestoreInstance(getAdminApp());
    }

    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!serviceAccount) {
      return null;
    }

    initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.warn('[ServerAuth] Firebase Admin init notice:', err?.message || err);
    return null;
  }
}

// Memory cache for runtime persistence within serverless instance
let localUsersCache: UserRecord[] = [];

export function applyCors(req: any, res: any, allowedMethods: string) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', allowedMethods);
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );
}

export function signUserToken(user: { id: string; email: string; nombre: string; rol: 'doctora' | 'paciente' }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      nombre: user.nombre,
      rol: user.rol,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function extractAuthPayload(req: any): AuthTokenPayload | null {
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

export function serializeSessionCookie(token: string, req: any): string {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.connection?.encrypted;
  const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
  const secureFlag = isHttps ? '; Secure' : '';
  const sameSite = isHttps ? '; SameSite=None' : '; SameSite=Lax';
  return `vela_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly${secureFlag}${sameSite}`;
}

export function serializeClearCookie(req: any): string {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.connection?.encrypted;
  const secureFlag = isHttps ? '; Secure' : '';
  const sameSite = isHttps ? '; SameSite=None' : '; SameSite=Lax';
  return `vela_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${secureFlag}${sameSite}`;
}

export function parseRequestBody(req: any): any {
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

export async function ensureDoctorAccountInDb(): Promise<void> {
  const db = getAdminFirestore();
  if (!db) return;

  const targetEmail = DOCTOR_EMAIL;
  const targetPassword = DOCTOR_INITIAL_PASSWORD;
  const now = new Date().toISOString();

  try {
    const hashedPassword = await bcrypt.hash(targetPassword, 10);
    const docQuery = await db.collection('usuarios').where('rol', '==', 'doctora').get();
    const emailQuery = await db.collection('usuarios').where('email', '==', targetEmail).get();

    const matchedDocIds = new Set<string>();
    docQuery.forEach((doc: any) => matchedDocIds.add(doc.id));
    emailQuery.forEach((doc: any) => matchedDocIds.add(doc.id));

    if (matchedDocIds.size > 0) {
      for (const docId of matchedDocIds) {
        await db.collection('usuarios').doc(docId).set(
          {
            email: targetEmail,
            password: hashedPassword,
            rol: 'doctora',
            estado: 'registrado',
            nombre: 'Dra. Lorena Castro',
            fechaActualizacion: now,
          },
          { merge: true }
        );
      }
    } else {
      const docId = `doc_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
      await db.collection('usuarios').doc(docId).set(
        {
          id: docId,
          email: targetEmail,
          nombre: 'Dra. Lorena Castro',
          rol: 'doctora',
          password: hashedPassword,
          estado: 'registrado',
          fechaCreacion: now,
          fechaActualizacion: now,
        },
        { merge: true }
      );
    }
  } catch (err: any) {
    console.warn('[ServerAuth] Notice ensuring doctor account in Firestore:', err?.message || err);
  }
}

export async function getUserByEmail(email: string): Promise<UserRecord | null> {
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
      console.warn('[ServerAuth] Firestore getUserByEmail notice:', err);
    }
  }

  // Fallback memory cache
  const cached = localUsersCache.find((u) => u.email.toLowerCase() === cleanEmail);
  if (cached) return cached;

  // Fallback for Doctor account if DB not accessible
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

export async function getUserById(id: string): Promise<UserRecord | null> {
  const db = getAdminFirestore();

  if (db) {
    try {
      const snap = await db.collection('usuarios').doc(id).get();
      if (snap.exists) {
        const data = snap.data() as UserRecord;
        const user = { ...data, id: snap.id };
        updateCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[ServerAuth] Firestore getUserById notice:', err);
    }
  }

  const cached = localUsersCache.find((u) => u.id === id);
  if (cached) return cached;

  if (id.startsWith('doc_') || id === `doc_${DOCTOR_EMAIL.replace(/[^a-zA-Z0-9]/g, '_')}`) {
    return {
      id,
      email: DOCTOR_EMAIL,
      nombre: 'Dra. Lorena Castro',
      rol: 'doctora',
      estado: 'registrado',
      fechaCreacion: new Date().toISOString(),
    };
  }

  return null;
}

export async function getUserByInvitationToken(token: string): Promise<UserRecord | null> {
  const cleanToken = token.trim();
  const db = getAdminFirestore();

  if (db) {
    try {
      const snap = await db.collection('usuarios').where('invitationToken', '==', cleanToken).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() as UserRecord;
        const user = { ...data, id: doc.id };
        updateCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[ServerAuth] Firestore getUserByInvitationToken notice:', err);
    }
  }

  return localUsersCache.find((u) => u.invitationToken === cleanToken) || null;
}

export async function saveUserRecord(user: UserRecord): Promise<UserRecord> {
  updateCache(user);
  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    } catch (err: any) {
      console.warn('[ServerAuth] Firestore saveUserRecord error:', err?.message || err);
    }
  }
  return user;
}

export async function getAllPatients(): Promise<any[]> {
  const db = getAdminFirestore();
  const patientsMap = new Map<string, UserRecord>();

  // 1. From local cache
  for (const u of localUsersCache) {
    if (u.rol === 'paciente') {
      patientsMap.set(u.id, { ...u });
    }
  }

  // 2. From Firestore
  if (db) {
    try {
      const snap = await db.collection('usuarios').where('rol', '==', 'paciente').get();
      snap.forEach((doc: any) => {
        const data = doc.data() as UserRecord;
        patientsMap.set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
      console.warn('[ServerAuth] Firestore get patients notice:', err);
    }
  }

  // 3. Cross-reference questionnaire status
  const questionnaireStatusMap = new Map<string, { completed: boolean; updatedAt?: string; driveLink?: string; currentStep?: number }>();
  if (db) {
    try {
      const qSnap = await db.collection('cuestionarios_iniciales').get();
      qSnap.forEach((doc: any) => {
        const qData = doc.data();
        const patientId = doc.id;
        const userId = qData.userId;
        const userEmail = qData.userEmail?.toLowerCase()?.trim();
        const isCompleted = qData.status === 'completado' || qData.isSavedByPatient || (qData.currentStep >= 10);

        const info = {
          completed: Boolean(isCompleted),
          updatedAt: qData.updatedAt || qData.completedAt || qData.startedAt,
          driveLink: qData.driveWebViewLink || qData.pdfUrl,
          currentStep: qData.currentStep,
        };

        if (patientId) questionnaireStatusMap.set(patientId, info);
        if (userId) questionnaireStatusMap.set(userId, info);
        if (userEmail) questionnaireStatusMap.set(userEmail, info);
      });
    } catch (err) {
      console.warn('[ServerAuth] Firestore questionnaires query notice:', err);
    }
  }

  const patientList = Array.from(patientsMap.values()).map((p) => {
    const qInfo =
      questionnaireStatusMap.get(p.id) ||
      (p.email ? questionnaireStatusMap.get(p.email.toLowerCase().trim()) : undefined) ||
      (p.cuestionarioId ? questionnaireStatusMap.get(p.cuestionarioId) : undefined);

    const isDone = Boolean(p.cuestionarioCompletado || qInfo?.completed);

    let clinicalStatus: 'invitado' | 'cuenta creada' | 'cuestionario completado' = 'invitado';
    if (p.estado === 'invitado') {
      clinicalStatus = 'invitado';
    } else if (isDone) {
      clinicalStatus = 'cuestionario completado';
    } else {
      clinicalStatus = 'cuenta creada';
    }

    return {
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol,
      estado: p.estado,
      clinicalStatus,
      fechaCreacion: p.fechaCreacion,
      fechaRegistro: p.fechaRegistro,
      invitationToken: p.invitationToken,
      cuestionarioCompletado: isDone,
      cuestionarioId: p.cuestionarioId || null,
      cuestionarioUpdatedAt: qInfo?.updatedAt || p.cuestionarioUpdatedAt || null,
      cuestionarioDriveLink: qInfo?.driveLink || p.cuestionarioDriveLink || null,
      cuestionarioStep: qInfo?.currentStep,
    };
  });

  patientList.sort((a, b) => new Date(b.fechaCreacion || 0).getTime() - new Date(a.fechaCreacion || 0).getTime());
  return patientList;
}

function updateCache(user: UserRecord) {
  const index = localUsersCache.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    localUsersCache[index] = { ...localUsersCache[index], ...user };
  } else {
    localUsersCache.push(user);
  }
}
