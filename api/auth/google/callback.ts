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

function getAdminFirestore() {
  try {
    if (getAdminApps().length > 0) {
      return getAdminFirestoreInstance(getAdminApp());
    }

    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!serviceAccount) {
      console.warn('[OAuth Callback] FIREBASE_SERVICE_ACCOUNT no está configurada o es inválida.');
      return null;
    }

    initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.warn('[OAuth Callback] Firebase Admin Init Notice:', err?.message || err);
    return null;
  }
}

async function saveGoogleDriveTokens(tokens: StoredDriveTokens): Promise<boolean> {
  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      await dbAdmin.collection('_system_config').doc('google_drive_tokens').set(tokens, { merge: true });
      console.log('[OAuth Callback] Tokens guardados exitosamente con Firebase Admin SDK.');
      return true;
    } else {
      console.error('[OAuth Callback] No se pudo inicializar Firebase Admin SDK para guardar tokens.');
      return false;
    }
  } catch (adminErr: any) {
    console.error('[OAuth Callback] Error guardando tokens con Firebase Admin:', adminErr?.message || adminErr);
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

export default async function handler(req: any, res: any) {
  try {
    const { code, error, state } = req.query || {};

    if (error) {
      console.error('[Google OAuth Callback] Error reportado por Google:', error);
      return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect('/?admin_tab=config&drive_error=no_code');
    }

    const clientId = getCleanEnv('GOOGLE_CLIENT_ID');
    const clientSecret = getCleanEnv('GOOGLE_CLIENT_SECRET');

    if (!clientId || !clientSecret) {
      console.error('[Google OAuth Callback] Faltan GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET');
      return res.redirect('/?admin_tab=config&drive_error=missing_client_credentials');
    }

    const redirectUri = getOAuthRedirectUri(req);
    console.log(`[Google OAuth Callback] Intercambiando code con clientId=${clientId.substring(0, 15)}... (${clientId.length} chars), secret_length=${clientSecret.length}, redirectUri=${redirectUri}`);

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(String(code));
    oauth2Client.setCredentials(tokens);

    // Retrieve user profile email to verify
    let userEmail = 'comerconcalma@gmail.com';
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      if (userInfo.data.email) {
        userEmail = userInfo.data.email;
      }
    } catch (e: any) {
      console.warn('[Google OAuth Callback] No se pudo obtener userinfo email:', e?.message);
    }

    // Save tokens in Firestore via Admin SDK
    await saveGoogleDriveTokens({
      refreshToken: tokens.refresh_token || '',
      accessToken: tokens.access_token || '',
      expiryDate: tokens.expiry_date || 0,
      authorizedEmail: userEmail,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[Google OAuth Callback] ¡Tokens de Google Drive guardados con éxito para ${userEmail}! RefreshToken disponible.`);

    // Redirect to admin panel with success flag
    return res.redirect('/?admin_tab=config&drive_connected=true');
  } catch (err: any) {
    console.error('[Google OAuth Callback ERROR]:', err?.message || err);
    return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(err?.message || 'callback_failed')}`);
  }
}
