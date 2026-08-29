/**
 * Google OAuth Token Helper using Google Identity Services (GSI)
 * Handles client-side token acquisition for Google Drive access
 *
 * Target recipient Google Account: comerconcalma@gmail.com
 */

import firebaseConfig from '../../firebase-applet-config.json';

const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file';
export const TARGET_GOOGLE_ACCOUNT = 'comerconcalma@gmail.com';

let tokenClient: any = null;
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Initializes and requests an OAuth Access Token from the user for Google Drive.
 * Uses GSI Token Client configured with the project's OAuth client ID.
 */
export async function getGoogleDriveAccessToken(clientId?: string): Promise<string> {
  // If we already have a valid non-expired token in memory
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  // Check if token is cached in sessionStorage
  try {
    const stored = sessionStorage.getItem('vela_google_drive_token');
    const storedExp = sessionStorage.getItem('vela_google_drive_token_exp');
    if (stored && storedExp) {
      const exp = parseInt(storedExp, 10);
      if (Date.now() < exp - 60000) {
        cachedAccessToken = stored;
        tokenExpiresAt = exp;
        return stored;
      }
    }
  } catch {}

  const effectiveClientId =
    clientId ||
    firebaseConfig.oAuthClientId ||
    (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID ||
    '1028826074180-m7oqf27rei6p45c2trqkiam5av9ubck1.apps.googleusercontent.com';

  return new Promise((resolve, reject) => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
      return reject(
        new Error('Google Identity Services no está cargado aún en el navegador.')
      );
    }

    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: GOOGLE_DRIVE_SCOPE,
        hint: TARGET_GOOGLE_ACCOUNT,
        callback: (tokenResponse: any) => {
          if (tokenResponse.error) {
            console.error('[Google OAuth Error]:', tokenResponse);
            return reject(new Error(tokenResponse.error_description || tokenResponse.error));
          }
          if (tokenResponse.access_token) {
            const token = tokenResponse.access_token;
            const expiresIn = parseInt(tokenResponse.expires_in || '3599', 10);
            cachedAccessToken = token;
            tokenExpiresAt = Date.now() + expiresIn * 1000;
            try {
              sessionStorage.setItem('vela_google_drive_token', token);
              sessionStorage.setItem('vela_google_drive_token_exp', tokenExpiresAt.toString());
            } catch {}
            resolve(token);
          } else {
            reject(new Error('No se recibió token de acceso de Google'));
          }
        },
      });

      // Request token with hint towards target account
      tokenClient.requestAccessToken({ prompt: 'select_account', hint: TARGET_GOOGLE_ACCOUNT });
    } catch (err) {
      reject(err);
    }
  });
}
