import {
  applyCors,
  parseRequestBody,
  extractAuthPayload,
  getUserById,
  saveUserRecord,
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
    const { questionnaireId, isComplete, driveLink } = parseRequestBody(req);

    if (authUser && authUser.userId) {
      const user = await getUserById(authUser.userId);
      if (user) {
        const updated: UserRecord = {
          ...user,
          cuestionarioId: questionnaireId || user.cuestionarioId,
          cuestionarioCompletado: isComplete !== undefined ? Boolean(isComplete) : user.cuestionarioCompletado,
          cuestionarioUpdatedAt: new Date().toISOString(),
          cuestionarioDriveLink: driveLink || user.cuestionarioDriveLink,
        };
        await saveUserRecord(updated);
      }
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al vincular cuestionario' });
  }
}
