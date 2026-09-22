import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Request, Response, NextFunction } from 'express';

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

const JWT_SECRET = process.env.JWT_SECRET || 'vela_jwt_secret_signature_key_2026_medicina_funcional';
const DOCTOR_EMAIL = (process.env.DOCTOR_EMAIL || 'comerconcalma@gmail.com').toLowerCase().trim();
const DOCTOR_INITIAL_PASSWORD = process.env.DOCTOR_INITIAL_PASSWORD || 'Lorenal1728*';
const BACKUP_USERS_FILE = path.join(process.cwd(), 'uploads', 'users_store.json');

// Memory cache of users for lightning-fast lookups and resilient offline/local fallback
let localUsersCache: UserRecord[] = [];

function loadBackupUsers(): UserRecord[] {
  try {
    if (fs.existsSync(BACKUP_USERS_FILE)) {
      const data = fs.readFileSync(BACKUP_USERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Server Auth] Notice loading backup users file:', err);
  }
  return [];
}

function saveBackupUsers(users: UserRecord[]) {
  try {
    const dir = path.dirname(BACKUP_USERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server Auth] Notice saving backup users file:', err);
  }
}

localUsersCache = loadBackupUsers();

/**
 * Initializes, creates, or updates the doctor account with exact credentials in both Firestore and local store.
 * The password is always hashed using bcrypt before persisting.
 */
export async function ensureDoctorAccounts(getDb: () => any): Promise<void> {
  const db = getDb();
  const targetEmail = DOCTOR_EMAIL;
  const targetPassword = DOCTOR_INITIAL_PASSWORD;

  // Hash using bcrypt as mandated
  const hashedPassword = await bcrypt.hash(targetPassword, 10);
  const now = new Date().toISOString();

  // 1. Update/Sync in local memory cache & backup store
  let foundInCache = false;
  for (let i = 0; i < localUsersCache.length; i++) {
    const u = localUsersCache[i];
    if (u.rol === 'doctora' || u.email.toLowerCase() === targetEmail || u.email.toLowerCase() === 'lorena@velaclinic.co') {
      localUsersCache[i] = {
        ...u,
        email: targetEmail,
        password: hashedPassword,
        rol: 'doctora',
        estado: 'registrado',
        nombre: 'Dra. Lorena Castro',
        fechaActualizacion: now,
      };
      foundInCache = true;
    }
  }

  if (!foundInCache) {
    const doctorUser: UserRecord = {
      id: `doc_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: targetEmail,
      nombre: 'Dra. Lorena Castro',
      rol: 'doctora',
      password: hashedPassword,
      estado: 'registrado',
      fechaCreacion: now,
      fechaActualizacion: now,
    };
    localUsersCache.push(doctorUser);
  }

  // Deduplicate cache
  const uniqueUsers: UserRecord[] = [];
  const seenEmails = new Set<string>();
  for (const u of localUsersCache) {
    const key = u.email.toLowerCase();
    if (!seenEmails.has(key)) {
      seenEmails.add(key);
      uniqueUsers.push(u);
    }
  }
  localUsersCache = uniqueUsers;
  saveBackupUsers(localUsersCache);

  // 2. Update/Sync in Firestore
  if (db) {
    try {
      // Find any existing doctor accounts
      const docQuery = await db.collection('usuarios').where('rol', '==', 'doctora').get();
      // Also check by target email
      const emailQuery = await db.collection('usuarios').where('email', '==', targetEmail).get();

      const matchedDocIds = new Set<string>();
      docQuery.forEach((doc: any) => matchedDocIds.add(doc.id));
      emailQuery.forEach((doc: any) => matchedDocIds.add(doc.id));

      if (matchedDocIds.size > 0) {
        for (const docId of matchedDocIds) {
          await db.collection('usuarios').doc(docId).set({
            email: targetEmail,
            password: hashedPassword,
            rol: 'doctora',
            estado: 'registrado',
            nombre: 'Dra. Lorena Castro',
            fechaActualizacion: now,
          }, { merge: true });
          console.log(`[Server Auth] Cuenta de doctora actualizada en Firestore (doc ${docId}): ${targetEmail}`);
        }
      } else {
        const docId = `doc_${targetEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        await db.collection('usuarios').doc(docId).set({
          id: docId,
          email: targetEmail,
          nombre: 'Dra. Lorena Castro',
          rol: 'doctora',
          password: hashedPassword,
          estado: 'registrado',
          fechaCreacion: now,
          fechaActualizacion: now,
        }, { merge: true });
        console.log(`[Server Auth] Nueva cuenta de doctora creada en Firestore: ${targetEmail}`);
      }
    } catch (err: any) {
      console.warn('[Server Auth] Error asegurando cuenta de doctora en Firestore:', err?.message || err);
    }
  }
}

/**
 * Finds user by email in Firestore or local cache
 */
export async function getUserByEmail(email: string, getDb: () => any): Promise<UserRecord | null> {
  const cleanEmail = email.toLowerCase().trim();
  const db = getDb();

  if (db) {
    try {
      const snap = await db.collection('usuarios').where('email', '==', cleanEmail).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() as UserRecord;
        const user = { ...data, id: doc.id };
        // Sync to cache
        updateLocalUserCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[Server Auth] Firestore getUserByEmail notice:', err);
    }
  }

  // Fallback to local cache
  return localUsersCache.find((u) => u.email.toLowerCase() === cleanEmail) || null;
}

/**
 * Finds user by ID in Firestore or local cache
 */
export async function getUserById(id: string, getDb: () => any): Promise<UserRecord | null> {
  const db = getDb();

  if (db) {
    try {
      const snap = await db.collection('usuarios').doc(id).get();
      if (snap.exists) {
        const data = snap.data() as UserRecord;
        const user = { ...data, id: snap.id };
        updateLocalUserCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[Server Auth] Firestore getUserById notice:', err);
    }
  }

  return localUsersCache.find((u) => u.id === id) || null;
}

/**
 * Finds user by invitation token in Firestore or local cache
 */
export async function getUserByInvitationToken(token: string, getDb: () => any): Promise<UserRecord | null> {
  const cleanToken = token.trim();
  const db = getDb();

  if (db) {
    try {
      const snap = await db.collection('usuarios').where('invitationToken', '==', cleanToken).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        const data = doc.data() as UserRecord;
        const user = { ...data, id: doc.id };
        updateLocalUserCache(user);
        return user;
      }
    } catch (err) {
      console.warn('[Server Auth] Firestore getUserByInvitationToken notice:', err);
    }
  }

  return localUsersCache.find((u) => u.invitationToken === cleanToken) || null;
}

/**
 * Creates or updates a user in Firestore and local cache
 */
export async function saveUserRecord(user: UserRecord, getDb: () => any): Promise<UserRecord> {
  updateLocalUserCache(user);
  saveBackupUsers(localUsersCache);

  const db = getDb();
  if (db) {
    try {
      await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    } catch (err: any) {
      console.warn('[Server Auth] Firestore saveUserRecord error:', err?.message || err);
    }
  }

  return user;
}

/**
 * Gets all patients with clinical questionnaire status
 */
export async function getAllPatientsWithStatus(getDb: () => any): Promise<any[]> {
  const db = getDb();
  const patientsMap = new Map<string, UserRecord>();

  // 1. From local cache
  for (const u of localUsersCache) {
    if (u.rol === 'paciente') {
      patientsMap.set(u.id, { ...u });
    }
  }

  // 2. From Firestore usuarios
  if (db) {
    try {
      const snap = await db.collection('usuarios').where('rol', '==', 'paciente').get();
      snap.forEach((doc: any) => {
        const data = doc.data() as UserRecord;
        patientsMap.set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
      console.warn('[Server Auth] Firestore get patients notice:', err);
    }
  }

  // 3. Cross-reference questionnaire status from collection cuestionarios_iniciales
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
      console.warn('[Server Auth] Firestore questionnaires query notice:', err);
    }
  }

  const patientList = Array.from(patientsMap.values()).map((p) => {
    // Check if questionnaire completed
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

  // Sort descending by creation date
  patientList.sort((a, b) => new Date(b.fechaCreacion || 0).getTime() - new Date(a.fechaCreacion || 0).getTime());

  return patientList;
}

function updateLocalUserCache(user: UserRecord) {
  const index = localUsersCache.findIndex((u) => u.id === user.id || u.email.toLowerCase() === user.email.toLowerCase());
  if (index >= 0) {
    localUsersCache[index] = { ...localUsersCache[index], ...user };
  } else {
    localUsersCache.push(user);
  }
}

/**
 * Signs JWT token
 */
export function signUserToken(user: UserRecord): string {
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

/**
 * Extracts and verifies JWT from cookie or Authorization header
 */
export function extractAuthPayload(req: Request): AuthTokenPayload | null {
  const token =
    req.cookies?.vela_session ||
    (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null);

  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthTokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Sets session cookie with proper cross-environment options
 */
export function setSessionCookie(req: Request, res: Response, token: string) {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('vela_session', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    path: '/',
  });
}

/**
 * Clears session cookie
 */
export function clearSessionCookie(res: Response) {
  res.clearCookie('vela_session', { path: '/' });
}

/**
 * Middleware: Requires valid authentication
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const payload = extractAuthPayload(req);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'No autorizado. Se requiere iniciar sesión.' });
  }
  (req as any).authUser = payload;
  next();
}

/**
 * Middleware: Requires role 'doctora'
 */
export function requireDoctorRole(req: Request, res: Response, next: NextFunction) {
  const payload = extractAuthPayload(req);
  if (!payload || payload.rol !== 'doctora') {
    return res.status(403).json({ success: false, error: 'Acceso denegado. Se requiere rol de doctora.' });
  }
  (req as any).authUser = payload;
  next();
}
