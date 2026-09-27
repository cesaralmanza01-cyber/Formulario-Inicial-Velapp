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
const BACKUP_QUESTIONNAIRES_FILE = path.join(process.cwd(), 'uploads', 'questionnaires_store.json');

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

export function loadBackupQuestionnaires(): any[] {
  try {
    if (fs.existsSync(BACKUP_QUESTIONNAIRES_FILE)) {
      const data = fs.readFileSync(BACKUP_QUESTIONNAIRES_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Server Auth] Notice loading backup questionnaires file:', err);
  }
  return [];
}

export function saveBackupQuestionnaire(questionnaireData: any): void {
  try {
    const list = loadBackupQuestionnaires();
    const qId = questionnaireData.id || questionnaireData.patientId;
    const index = list.findIndex((item) => (item.id || item.patientId) === qId);
    if (index >= 0) {
      list[index] = { ...list[index], ...questionnaireData };
    } else {
      list.unshift(questionnaireData);
    }
    const dir = path.dirname(BACKUP_QUESTIONNAIRES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(BACKUP_QUESTIONNAIRES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server Auth] Notice saving backup questionnaire:', err);
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
 * Gets all patients with clinical questionnaire status, merging both invited/registered accounts
 * and direct questionnaire submissions from collection cuestionarios_iniciales and backups.
 */
export async function getAllPatientsWithStatus(getDb: () => any): Promise<any[]> {
  const db = getDb();
  
  // 1. Collect all registered/invited accounts
  const usersMap = new Map<string, UserRecord>();
  for (const u of localUsersCache) {
    if (u.rol === 'paciente') {
      usersMap.set(u.id, { ...u });
    }
  }

  if (db) {
    try {
      const snap = await db.collection('usuarios').where('rol', '==', 'paciente').get();
      snap.forEach((doc: any) => {
        const data = doc.data() as UserRecord;
        usersMap.set(doc.id, { ...data, id: doc.id });
      });
    } catch (err) {
      console.warn('[Server Auth] Firestore get usuarios notice:', err);
    }
  }

  // 2. Collect all questionnaires from backup store + Firestore collection cuestionarios_iniciales
  const questionnairesMap = new Map<string, any>();
  
  const backupList = loadBackupQuestionnaires();
  for (const q of backupList) {
    const qId = q.id || q.patientId;
    if (qId) {
      questionnairesMap.set(qId, q);
    }
  }

  if (db) {
    try {
      const qSnap = await db.collection('cuestionarios_iniciales').get();
      qSnap.forEach((doc: any) => {
        const qData = doc.data();
        const qId = doc.id;
        questionnairesMap.set(qId, { ...qData, id: qId });
      });
    } catch (err) {
      console.warn('[Server Auth] Firestore cuestionarios_iniciales query notice:', err);
    }
  }

  // 3. Build unified patient items
  const patientMap = new Map<string, any>();
  const emailIndex = new Map<string, string>(); // clean email -> patient key
  const docIndex = new Map<string, string>(); // clean doc number -> patient key

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

  // Step B: Merge questionnaires received (linking with invited accounts or adding direct responses)
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

    // Check if this matches an existing patient
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
      // Link with existing user without duplicating
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
      // Direct submission (create patient row)
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

  // Sort descending: patients with newest fechaEnvio or fechaCreacion on top
  patientList.sort((a, b) => {
    const timeA = new Date(a.fechaEnvio || a.cuestionarioUpdatedAt || a.fechaCreacion || 0).getTime();
    const timeB = new Date(b.fechaEnvio || b.cuestionarioUpdatedAt || b.fechaCreacion || 0).getTime();
    return timeB - timeA;
  });

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
