import { google } from 'googleapis';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '../../../src/firebaseConfig';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

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

    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      return res.redirect('/?admin_tab=config&drive_error=missing_client_credentials');
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    
    let redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/google/callback`
      : `${proto}://${host}/api/auth/google/callback`;

    if (host && host.includes('formulario-inicial-velapp.vercel.app')) {
      redirectUri = 'https://formulario-inicial-velapp.vercel.app/api/auth/google/callback';
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    // Exchange code for tokens
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

    // Save tokens in Firestore under _system_config/google_drive_tokens
    const tokensRef = doc(db, '_system_config', 'google_drive_tokens');
    await setDoc(
      tokensRef,
      {
        refreshToken: tokens.refresh_token || '',
        accessToken: tokens.access_token || '',
        expiryDate: tokens.expiry_date || 0,
        authorizedEmail: userEmail,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log(`[Google OAuth Callback] ¡Tokens de Google Drive guardados con éxito para ${userEmail}!`);

    // Redirect to admin panel with success flag
    return res.redirect('/?admin_tab=config&drive_connected=true');
  } catch (err: any) {
    console.error('[Google OAuth Callback ERROR]:', err?.message || err);
    return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(err?.message || 'callback_failed')}`);
  }
}
