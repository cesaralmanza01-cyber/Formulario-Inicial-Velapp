import { google } from 'googleapis';

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

    if (!clientId || !clientSecret) {
      return res.status(400).send(
        'Error: Faltan las variables de entorno GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET en Vercel.'
      );
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    
    // Exact redirect URI
    let redirectUri = process.env.APP_URL 
      ? `${process.env.APP_URL.replace(/\/$/, '')}/api/auth/google/callback`
      : `${proto}://${host}/api/auth/google/callback`;

    // Ensure production domain is preferred
    if (host && host.includes('formulario-inicial-velapp.vercel.app')) {
      redirectUri = 'https://formulario-inicial-velapp.vercel.app/api/auth/google/callback';
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const scopes = [
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/userinfo.email',
      'openid',
    ];

    const authorizeUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: scopes,
      include_granted_scopes: true,
      state: 'admin_drive_auth',
    });

    return res.redirect(authorizeUrl);
  } catch (error: any) {
    console.error('[Google OAuth Login Init Error]:', error);
    return res.status(500).json({
      error: 'Error al inicializar flujo OAuth con Google',
      details: error?.message,
    });
  }
}
