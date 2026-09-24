import {
  applyCors,
  extractAuthPayload,
  getUserById,
} from '../_lib/serverAuth';

export default async function handler(req: any, res: any) {
  applyCors(req, res, 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({ success: false, error: 'Método no permitido (Use GET)' });
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
