import {
  applyCors,
  extractAuthPayload,
  getAllPatients,
  getCleanEnv,
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
    const authUser = extractAuthPayload(req);
    if (!authUser || authUser.rol !== 'doctora') {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado. Se requiere autenticación con rol de doctora.',
      });
    }

    const host = req.headers['x-forwarded-host'] || req.headers.host || '';
    const proto = req.headers['x-forwarded-proto'] || 'https';
    let baseUrl = `${proto}://${host}`;
    const customAppUrl = getCleanEnv('APP_URL');
    if (customAppUrl) {
      baseUrl = customAppUrl.replace(/\/$/, '');
    }

    const patients = await getAllPatients();

    const formatted = patients.map((p) => {
      let inviteLink: string | undefined = undefined;
      if (p.invitationToken) {
        inviteLink = `${baseUrl}/?invitacion=${p.invitationToken}`;
      }
      return {
        ...p,
        inviteLink,
      };
    });

    return res.status(200).json({ success: true, patients: formatted });
  } catch (err: any) {
    console.error('[Get Patients API Error]:', err);
    return res.status(500).json({ success: false, error: err?.message || 'Error al obtener pacientes' });
  }
}
