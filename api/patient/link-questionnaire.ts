import jwt from 'jsonwebtoken';
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

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

function getCleanEnv(key: string): string {
  const val = process.env[key] || '';
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const JWT_SECRET = getCleanEnv('JWT_SECRET') || 'vela_jwt_secret_signature_key_2026_medicina_funcional';

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

function getAdminFirestore(): any | null {
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
    return null;
  }
}

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

async function getUserById(id: string): Promise<UserRecord | null> {
  const db = getAdminFirestore();
  if (db) {
    try {
      const snap = await db.collection('usuarios').doc(id).get();
      if (snap.exists) {
        const data = snap.data() as UserRecord;
        return { ...data, id: snap.id };
      }
    } catch (err) {}
  }
  return null;
}

async function saveUserRecord(user: UserRecord): Promise<UserRecord> {
  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    } catch (err: any) {}
  }
  return user;
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
    const authUser = extractAuthPayload(req);
    const { questionnaireId, isComplete, driveLink } = parseRequestBody(req);

    if (authUser && authUser.userId) {
      const user = await getUserById(authUser.userId);
      if (user) {
        const updated: UserRecord = {
          ...user,
          cuestionarioId: questionnaireId || user.cuestionarioId,
          cuestionarioCompletado: isComplete !== undefined ? Boolean(isComplete) : user.cuestionarioCompletado,
          cuestionarioUpdatedAt: new Date().toISOString(),
          cuestionarioDriveLink: driveLink || user.cuestionarioDriveLink,
        };
        await saveUserRecord(updated);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al vincular cuestionario' });
  }
}
