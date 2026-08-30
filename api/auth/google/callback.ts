import { google } from 'googleapis';
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from 'firebase-admin/app';
import { getFirestore as getAdminFirestoreInstance } from 'firebase-admin/firestore';
import { initializeApp as initClientApp, getApps as getClientApps, getApp as getClientApp } from 'firebase/app';
import { getFirestore as getClientFirestore, doc as clientDoc, setDoc as clientSetDoc } from 'firebase/firestore';

const FIREBASE_PROJECT_ID = 'gen-lang-client-0995145097';

const firebaseClientConfig = {
  projectId: FIREBASE_PROJECT_ID,
  appId: '1:1028826074180:web:c5e9636ea22b1f3a850011',
  apiKey: 'AIzaSyA9hePNixcQD90_2HOJREulcMz538-CaSg',
  authDomain: 'gen-lang-client-0995145097.firebaseapp.com',
  storageBucket: 'gen-lang-client-0995145097.firebasestorage.app',
  messagingSenderId: '1028826074180',
};

interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

function getAdminFirestore() {
  if (getAdminApps().length === 0) {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
    if (serviceAccountKey) {
      try {
        const parsed = JSON.parse(serviceAccountKey);
        initAdminApp({
          credential: cert(parsed),
          projectId: parsed.project_id || FIREBASE_PROJECT_ID,
        });
      } catch (e) {
        console.warn('[OAuth Callback] Could not parse FIREBASE_SERVICE_ACCOUNT, falling back to default:', e);
        initAdminApp({ projectId: FIREBASE_PROJECT_ID });
      }
    } else {
      initAdminApp({ projectId: FIREBASE_PROJECT_ID });
    }
  }
  return getAdminFirestoreInstance(getAdminApp());
}

async function saveGoogleDriveTokens(tokens: StoredDriveTokens): Promise<boolean> {
  // Tier 1: Firebase Admin SDK
  try {
    const dbAdmin = getAdminFirestore();
    await dbAdmin.collection('_system_config').doc('google_drive_tokens').set(tokens, { merge: true });
    console.log('[OAuth Callback] Tokens guardados exitosamente con Firebase Admin SDK.');
    return true;
  } catch (adminErr: any) {
    console.warn('[OAuth Callback] Error guardando con Firebase Admin, intentando Client SDK:', adminErr?.message);
  }

  // Tier 2: Client SDK fallback
  try {
    const clientApp = getClientApps().length === 0 ? initClientApp(firebaseClientConfig) : getClientApp();
    const clientDb = getClientFirestore(clientApp);
    const docRef = clientDoc(clientDb, '_system_config', 'google_drive_tokens');
    await clientSetDoc(docRef, tokens, { merge: true });
    console.log('[OAuth Callback] Tokens guardados con Client SDK fallback.');
    return true;
  } catch (clientErr: any) {
    console.error('[OAuth Callback] Error crítico guardando tokens en Firestore:', clientErr);
    return false;
  }
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

    // Save tokens in Firestore with Admin SDK & fallback
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
