import bcrypt from 'bcryptjs';
import { google } from 'googleapis';
import {
  applyCors,
  parseRequestBody,
  DOCTOR_EMAIL,
  DOCTOR_INITIAL_PASSWORD,
  getUserByEmail,
  getUserById,
  getUserByInvitationToken,
  saveUserRecord,
  signUserToken,
  serializeSessionCookie,
  serializeClearCookie,
  extractAuthPayload,
  ensureDoctorAccountInDb,
  getCleanEnv,
  getGoogleDriveStoredTokens,
  saveGoogleDriveTokens,
  getOAuthRedirectUri,
  UserRecord,
} from '../_lib/serverAuth';

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

  // Route not found in /api/auth/*
  return res.status(404).json({ success: false, error: `Ruta /api/auth/${subPath} no encontrada.` });
}
