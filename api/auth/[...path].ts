import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
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
const DOCTOR_INITIAL_PASSWORD = getCleanEnv('DOCTOR_INITIAL_PASSWORD') || 'Lorenal1728*';

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
    console.warn('[Auth Serverless] Firebase Admin init notice:', err?.message || err);
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
    console.error('[Auth Serverless] Firebase Admin fetch error:', adminErr?.message || adminErr);
  }

  return null;
}

async function saveGoogleDriveTokens(tokens: StoredDriveTokens): Promise<boolean> {
  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      await dbAdmin.collection('_system_config').doc('google_drive_tokens').set(tokens, { merge: true });
      return true;
    }
    return false;
  } catch (adminErr: any) {
    console.error('[Auth Serverless] Error saving tokens:', adminErr?.message || adminErr);
    return false;
  }
}

function getOAuthRedirectUri(req: any): string {
  const customAppUrl = getCleanEnv('APP_URL');
  if (customAppUrl) {
    return `${customAppUrl.replace(/\/$/, '')}/api/auth/google/callback`;
  }
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  if (host.includes('formulario-inicial-velapp.vercel.app') || host.includes('vercel.app')) {
    return 'https://formulario-inicial-velapp.vercel.app/api/auth/google/callback';
  }
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}/api/auth/google/callback`;
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

function signUserToken(user: { id: string; email: string; nombre: string; rol: 'doctora' | 'paciente' }): string {
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

function serializeSessionCookie(token: string, req: any): string {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.connection?.encrypted;
  const maxAge = 30 * 24 * 60 * 60;
  const secureFlag = isHttps ? '; Secure' : '';
  const sameSite = isHttps ? '; SameSite=None' : '; SameSite=Lax';
  return `vela_session=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly${secureFlag}${sameSite}`;
}

function serializeClearCookie(req: any): string {
  const isHttps = req.headers['x-forwarded-proto'] === 'https' || req.connection?.encrypted;
  const secureFlag = isHttps ? '; Secure' : '';
  const sameSite = isHttps ? '; SameSite=None' : '; SameSite=Lax';
  return `vela_session=; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${secureFlag}${sameSite}`;
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

async function ensureDoctorAccountInDb(): Promise<void> {
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
    console.warn('[Auth Serverless] Notice ensuring doctor account in Firestore:', err?.message || err);
  }
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
      console.warn('[Auth Serverless] Firestore getUserByEmail notice:', err);
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

async function getUserById(id: string): Promise<UserRecord | null> {
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
      console.warn('[Auth Serverless] Firestore getUserById notice:', err);
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

async function getUserByInvitationToken(token: string): Promise<UserRecord | null> {
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
      console.warn('[Auth Serverless] Firestore getUserByInvitationToken notice:', err);
    }
  }

  return localUsersCache.find((u) => u.invitationToken === cleanToken) || null;
}

async function saveUserRecord(user: UserRecord): Promise<UserRecord> {
  updateCache(user);
  const db = getAdminFirestore();
  if (db) {
    try {
      await db.collection('usuarios').doc(user.id).set(user, { merge: true });
    } catch (err: any) {
      console.warn('[Auth Serverless] Firestore saveUserRecord error:', err?.message || err);
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

function extractSubPath(req: any): string {
  if (req.url) {
    const raw = req.url.split('?')[0];
    const prefix = '/api/auth';
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

  // 1. POST /api/auth/login
  if (subPath === 'login') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
    }

    try {
      const { email, password } = parseRequestBody(req);
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Por favor ingresa tu correo y contraseña.' });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanPassword = String(password);

      ensureDoctorAccountInDb().catch((err) => {
        console.warn('[Auth Login] Notice ensuring doctor in DB:', err?.message || err);
      });

      const isDoctor =
        cleanEmail === DOCTOR_EMAIL ||
        cleanEmail === 'comerconcalma@gmail.com' ||
        cleanEmail === 'lorena@velaclinic.co';

      if (isDoctor) {
        let isPasswordValid = false;
        if (cleanPassword === DOCTOR_INITIAL_PASSWORD) {
          isPasswordValid = true;
        } else {
          const userInDb = await getUserByEmail(cleanEmail);
          if (userInDb && userInDb.password) {
            isPasswordValid = await bcrypt.compare(cleanPassword, userInDb.password);
          }
        }

        if (!isPasswordValid) {
          return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
        }

        const doctorUser = {
          id: `doc_${DOCTOR_EMAIL.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email: DOCTOR_EMAIL,
          nombre: 'Dra. Lorena Castro',
          rol: 'doctora' as const,
          estado: 'registrado' as const,
          cuestionarioCompletado: false,
        };

        const token = signUserToken(doctorUser);
        res.setHeader('Set-Cookie', serializeSessionCookie(token, req));
        return res.status(200).json({ success: true, token, user: doctorUser });
      }

      // Patient login
      const patientUser = await getUserByEmail(cleanEmail);
      if (!patientUser) {
        return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
      }

      if (!patientUser.password) {
        if (patientUser.estado === 'invitado') {
          return res.status(400).json({
            success: false,
            isInvited: true,
            error: 'Esta cuenta está en estado invitado. Por favor utiliza el enlace de invitación de la doctora para crear tu contraseña.',
          });
        }
        return res.status(401).json({ success: false, error: 'Contraseña no configurada.' });
      }

      const isValid = await bcrypt.compare(cleanPassword, patientUser.password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
      }

      const token = signUserToken(patientUser);
      res.setHeader('Set-Cookie', serializeSessionCookie(token, req));
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: patientUser.id,
          email: patientUser.email,
          nombre: patientUser.nombre,
          rol: patientUser.rol,
          estado: patientUser.estado,
          cuestionarioCompletado: Boolean(patientUser.cuestionarioCompletado),
        },
      });
    } catch (err: any) {
      console.error('[API Auth Login Error]:', err);
      return res.status(500).json({ success: false, error: 'Error al iniciar sesión: ' + err?.message });
    }
  }

  // 2. GET /api/auth/me
  if (subPath === 'me') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido. Use GET.' });
    }

    try {
      const payload = extractAuthPayload(req);
      if (!payload) {
        return res.status(200).json({ authenticated: false, user: null });
      }

      const user = await getUserById(payload.userId);
      if (!user) {
        return res.status(200).json({ authenticated: false, user: null });
      }

      return res.status(200).json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          estado: user.estado,
          cuestionarioCompletado: Boolean(user.cuestionarioCompletado),
          cuestionarioId: user.cuestionarioId || null,
        },
      });
    } catch (err: any) {
      return res.status(200).json({ authenticated: false, user: null, error: err?.message });
    }
  }

  // 3. POST /api/auth/logout
  if (subPath === 'logout') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
    }
    res.setHeader('Set-Cookie', serializeClearCookie(req));
    return res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente.' });
  }

  // 4. POST /api/auth/register-invited
  if (subPath === 'register-invited') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
    }

    try {
      const { token, password } = parseRequestBody(req);
      if (!token || !password) {
        return res.status(400).json({ success: false, error: 'Por favor proporciona la contraseña y el token.' });
      }
      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'La contraseña debe tener un mínimo de 6 caracteres.' });
      }

      const user = await getUserByInvitationToken(token);
      if (!user) {
        return res.status(404).json({ success: false, error: 'Invitación no encontrada o token inválido.' });
      }
      if (user.estado === 'registrado' && user.password) {
        return res.status(400).json({
          success: false,
          error: 'Esta cuenta ya fue activada. Por favor inicia sesión con tu contraseña.',
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser: UserRecord = {
        ...user,
        password: hashedPassword,
        estado: 'registrado',
        fechaRegistro: new Date().toISOString(),
        invitationToken: null,
      };

      await saveUserRecord(updatedUser);
      const authToken = signUserToken(updatedUser);
      res.setHeader('Set-Cookie', serializeSessionCookie(authToken, req));

      return res.status(200).json({
        success: true,
        token: authToken,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          nombre: updatedUser.nombre,
          rol: updatedUser.rol,
          estado: updatedUser.estado,
          cuestionarioCompletado: Boolean(updatedUser.cuestionarioCompletado),
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: 'Error al activar la cuenta: ' + err?.message });
    }
  }

  // 5. GET /api/auth/invitation/:token or /api/auth/invitation?token=...
  if (subPath.startsWith('invitation')) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET, OPTIONS');
      return res.status(405).json({ valid: false, error: 'Método no permitido. Use GET.' });
    }

    try {
      let token = req.query?.token;
      if (!token) {
        const parts = subPath.split('/');
        if (parts.length > 1) {
          token = parts[1];
        }
      }

      if (!token) {
        return res.status(400).json({ valid: false, error: 'Token de invitación no suministrado.' });
      }

      const user = await getUserByInvitationToken(String(token));
      if (!user) {
        return res.status(404).json({ valid: false, error: 'Invitación no encontrada o enlace inválido.' });
      }

      if (user.estado === 'registrado' && user.password) {
        return res.status(400).json({
          valid: false,
          alreadyRegistered: true,
          email: user.email,
          nombre: user.nombre,
          error: 'Esta invitación ya fue activada previamente. Por favor inicia sesión con tu correo y contraseña.',
        });
      }

      return res.status(200).json({
        valid: true,
        invitation: {
          id: user.id,
          token: user.invitationToken || token,
          email: user.email,
          nombre: user.nombre,
          estado: user.estado,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ valid: false, error: err?.message || 'Error al verificar invitación.' });
    }
  }

  // 6. GET /api/auth/google/login
  if (subPath === 'google/login') {
    try {
      const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
      const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');

      if (!clientId || !clientSecret) {
        return res.status(400).send('Error: Faltan las variables GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET.');
      }

      const redirectUri = getOAuthRedirectUri(req);
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/userinfo.email',
          'openid',
        ],
        include_granted_scopes: true,
        state: 'admin_drive_auth',
      });

      return res.redirect(authorizeUrl);
    } catch (error: any) {
      return res.status(500).json({ error: 'Error al inicializar OAuth', details: error?.message });
    }
  }

  // 7. GET /api/auth/google/callback
  if (subPath === 'google/callback') {
    try {
      const { code, error } = req.query || {};
      if (error) {
        return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(String(error))}`);
      }
      if (!code) {
        return res.redirect('/?admin_tab=config&drive_error=no_code');
      }

      const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
      const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');
      if (!clientId || !clientSecret) {
        return res.redirect('/?admin_tab=config&drive_error=missing_client_credentials');
      }

      const redirectUri = getOAuthRedirectUri(req);
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(String(code));
      oauth2Client.setCredentials(tokens);

      let userEmail = 'comerconcalma@gmail.com';
      try {
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        if (userInfo.data.email) userEmail = userInfo.data.email;
      } catch (e) {}

      await saveGoogleDriveTokens({
        refreshToken: tokens.refresh_token || '',
        accessToken: tokens.access_token || '',
        expiryDate: tokens.expiry_date || 0,
        authorizedEmail: userEmail,
        updatedAt: new Date().toISOString(),
      });

      return res.redirect('/?admin_tab=config&drive_connected=true');
    } catch (err: any) {
      return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(err?.message || 'callback_failed')}`);
    }
  }

  return res.status(404).json({ success: false, error: `Ruta /api/auth/${subPath} no encontrada.` });
}
