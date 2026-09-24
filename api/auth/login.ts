import bcrypt from 'bcryptjs';
import {
  applyCors,
  parseRequestBody,
  DOCTOR_EMAIL,
  DOCTOR_INITIAL_PASSWORD,
  getUserByEmail,
  signUserToken,
  serializeSessionCookie,
  ensureDoctorAccountInDb,
} from '../_lib/serverAuth';

export default async function handler(req: any, res: any) {
  // 1. CORS headers
  applyCors(req, res, 'POST, OPTIONS');

  // 2. Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 3. Strict HTTP Method validation: Must be POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(405).json({
      success: false,
      error: `Método ${req.method} no permitido. Este endpoint solo acepta peticiones POST.`,
    });
  }

  try {
    const body = parseRequestBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Por favor ingresa tu correo y contraseña.',
      });
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const cleanPassword = String(password);

    // Sync doctor in Firestore in background if available
    ensureDoctorAccountInDb().catch((err) => {
      console.warn('[Login Handler] Notice ensuring doctor in DB:', err?.message || err);
    });

    // Check if logging in as doctor
    const isDoctor =
      cleanEmail === DOCTOR_EMAIL ||
      cleanEmail === 'comerconcalma@gmail.com' ||
      cleanEmail === 'lorena@velaclinic.co';

    if (isDoctor) {
      let isPasswordValid = false;

      // Primary check: Direct match with configured DOCTOR_INITIAL_PASSWORD env var
      if (cleanPassword === DOCTOR_INITIAL_PASSWORD) {
        isPasswordValid = true;
      } else {
        // Secondary check: Test bcrypt hash if stored in DB
        const userInDb = await getUserByEmail(cleanEmail);
        if (userInDb && userInDb.password) {
          isPasswordValid = await bcrypt.compare(cleanPassword, userInDb.password);
        }
      }

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Correo o contraseña incorrectos.',
        });
      }

      const doctorUser = {
        id: `doc_${DOCTOR_EMAIL.replace(/[^a-zA-Z0-9]/g, '_')}`,
        email: DOCTOR_EMAIL,
        nombre: 'Dra. Lorena Castro',
        rol: 'doctora' as const,
        estado: 'registrado' as const,
        cuestionarioCompletado: false,
      };

      const token = signUserToken(doctorUser);
      res.setHeader('Set-Cookie', serializeSessionCookie(token, req));

      return res.status(200).json({
        success: true,
        token,
        user: doctorUser,
      });
    }

    // Patient login flow
    const patientUser = await getUserByEmail(cleanEmail);
    if (!patientUser) {
      return res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos.',
      });
    }

    if (!patientUser.password) {
      if (patientUser.estado === 'invitado') {
        return res.status(400).json({
          success: false,
          isInvited: true,
          error: 'Esta cuenta está en estado invitado. Por favor utiliza el enlace de invitación de la doctora para crear tu contraseña.',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'Contraseña no configurada.',
      });
    }

    const isValid = await bcrypt.compare(cleanPassword, patientUser.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Correo o contraseña incorrectos.',
      });
    }

    const token = signUserToken(patientUser);
    res.setHeader('Set-Cookie', serializeSessionCookie(token, req));

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: patientUser.id,
        email: patientUser.email,
        nombre: patientUser.nombre,
        rol: patientUser.rol,
        estado: patientUser.estado,
        cuestionarioCompletado: Boolean(patientUser.cuestionarioCompletado),
      },
    });
  } catch (err: any) {
    console.error('[API Auth Login Error]:', err);
    return res.status(500).json({
      success: false,
      error: 'Error al iniciar sesión: ' + (err?.message || 'Error interno del servidor'),
    });
  }
}
