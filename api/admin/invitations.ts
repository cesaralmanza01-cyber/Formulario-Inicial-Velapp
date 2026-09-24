import crypto from 'crypto';
import {
  applyCors,
  parseRequestBody,
  extractAuthPayload,
  getUserByEmail,
  saveUserRecord,
  getCleanEnv,
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
    const authUser = extractAuthPayload(req);
    if (!authUser || authUser.rol !== 'doctora') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere autenticación con rol de doctora.',
      });
    }

    const { nombre, email } = parseRequestBody(req);
    if (!nombre || !email) {
      return res.status(400).json({ success: false, error: 'Ingresa el nombre completo y correo del paciente.' });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanNombre = String(nombre).trim();

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return res.status(400).json({ success: false, error: 'Ingresa un correo electrónico válido.' });
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    let baseUrl = `${proto}://${host}`;
    const customAppUrl = getCleanEnv('APP_URL');
    if (customAppUrl) {
      baseUrl = customAppUrl.replace(/\/$/, '');
    }

    const existingUser = await getUserByEmail(cleanEmail);
    const token = crypto.randomBytes(24).toString('hex');
    const inviteLink = `${baseUrl}/?invitacion=${token}`;

    if (existingUser) {
      if (existingUser.estado === 'registrado') {
        return res.status(400).json({
          success: false,
          error: `Ya existe una cuenta activa para ${cleanEmail}. El paciente ya puede ingresar con su correo y contraseña.`,
        });
      }

      const updated: UserRecord = {
        ...existingUser,
        nombre: cleanNombre || existingUser.nombre,
        invitationToken: token,
        invitationCreatedAt: new Date().toISOString(),
      };
      await saveUserRecord(updated);

      return res.status(200).json({
        success: true,
        token,
        inviteLink,
        message: 'Invitación renovada exitosamente.',
        patient: {
          id: updated.id,
          nombre: updated.nombre,
          email: updated.email,
          estado: updated.estado,
          clinicalStatus: 'invitado',
        },
      });
    }

    const newPatient: UserRecord = {
      id: `pac_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      nombre: cleanNombre,
      rol: 'paciente',
      estado: 'invitado',
      invitationToken: token,
      invitationCreatedAt: new Date().toISOString(),
      fechaCreacion: new Date().toISOString(),
    };

    await saveUserRecord(newPatient);

    return res.status(200).json({
      success: true,
      token,
      inviteLink,
      message: 'Invitación creada exitosamente.',
      patient: {
        id: newPatient.id,
        nombre: newPatient.nombre,
        email: newPatient.email,
        estado: newPatient.estado,
        clinicalStatus: 'invitado',
      },
    });
  } catch (err: any) {
    console.error('[Create Invitation API Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Error al generar invitación' });
  }
}
