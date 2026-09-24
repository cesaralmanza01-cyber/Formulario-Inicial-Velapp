import {
  applyCors,
  getUserByInvitationToken,
} from '../../_lib/serverAuth';

export default async function handler(req: any, res: any) {
  applyCors(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ valid: false, error: 'Método no permitido (Use GET)' });
  }

  try {
    let token = req.query?.token;
    if (!token && typeof req.url === 'string') {
      const parts = req.url.split('?')[0].split('/');
      token = parts[parts.length - 1];
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
