import {
  applyCors,
  serializeClearCookie,
} from '../_lib/serverAuth';

export default async function handler(req: any, res: any) {
  applyCors(req, res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({ success: false, error: 'Método no permitido (Use POST)' });
  }

  res.setHeader('Set-Cookie', serializeClearCookie(req));
  return res.status(200).json({ success: true, message: 'Sesión cerrada exitosamente.' });
}
