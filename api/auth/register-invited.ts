import bcrypt from 'bcryptjs';
import {
  applyCors,
  parseRequestBody,
  getUserByInvitationToken,
  saveUserRecord,
  signUserToken,
  serializeSessionCookie,
  UserRecord,
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
    console.error('[Register Invited Error]:', err);
    return res.status(500).json({ success: false, error: 'Error al activar la cuenta: ' + err?.message });
  }
}
