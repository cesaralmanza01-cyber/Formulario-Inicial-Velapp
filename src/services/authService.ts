import { AppUser, AuthResponse, InvitationDetails, PatientListItem } from '../types';

const TOKEN_KEY = 'vela_auth_token';
const USER_KEY = 'vela_auth_user';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.warn('Storage error:', err);
  }
}

function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (err) {
    console.warn('Storage error:', err);
  }
}

function getAuthHeaders(): HeadersInit {
  const token = getStoredToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const authService = {
  /**
   * Log in with email and password
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.token) {
          setStoredToken(data.token);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user, token: data.token };
      }

      return {
        success: false,
        error: data.error || 'Correo o contraseña incorrectos.',
      };
    } catch (err: any) {
      return {
        success: false,
        error: 'Error de conexión con el servidor. Intenta de nuevo.',
      };
    }
  },

  /**
   * Check if current session cookie/token is valid
   */
  async checkCurrentSession(): Promise<{ authenticated: boolean; user: AppUser | null }> {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!res.ok) {
        clearStoredToken();
        return { authenticated: false, user: null };
      }

      const data = await res.json();
      if (data.authenticated && data.user) {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { authenticated: true, user: data.user };
      }

      clearStoredToken();
      return { authenticated: false, user: null };
    } catch (err) {
      // In case of transient network error, check if cached user exists as temporary fallback
      try {
        const cached = localStorage.getItem(USER_KEY);
        if (cached && getStoredToken()) {
          return { authenticated: true, user: JSON.parse(cached) };
        }
      } catch {
        // ignore
      }
      return { authenticated: false, user: null };
    }
  },

  /**
   * Log out current user
   */
  async logout(): Promise<boolean> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout request warning:', err);
    } finally {
      clearStoredToken();
    }
    return true;
  },

  /**
   * Validate invitation token
   */
  async getInvitationDetails(token: string): Promise<InvitationDetails | { valid: false; error: string; alreadyRegistered?: boolean }> {
    try {
      const res = await fetch(`/api/auth/invitation/${encodeURIComponent(token)}`);
      const data = await res.json();
      if (res.ok && data.valid && data.invitation) {
        return {
          valid: true,
          id: data.invitation.id,
          token,
          email: data.invitation.email,
          nombre: data.invitation.nombre,
          estado: data.invitation.estado,
        };
      }
      return {
        valid: false,
        error: data.error || 'Enlace de invitación no válido o expirado.',
        alreadyRegistered: data.alreadyRegistered,
      };
    } catch (err: any) {
      return {
        valid: false,
        error: 'No fue posible verificar la invitación. Revisa tu conexión a internet.',
      };
    }
  },

  /**
   * Register invited patient by setting password
   */
  async registerInvited(token: string, password: string): Promise<AuthResponse> {
    try {
      const res = await fetch('/api/auth/register-invited', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        if (data.token) {
          setStoredToken(data.token);
        }
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
        return { success: true, user: data.user, token: data.token };
      }

      return {
        success: false,
        error: data.error || 'Error al activar tu cuenta. Intenta de nuevo.',
      };
    } catch (err) {
      return {
        success: false,
        error: 'Error de conexión. Por favor intenta de nuevo.',
      };
    }
  },

  /**
   * Doctor: Get all patients with status
   */
  async getPatients(): Promise<{ success: boolean; patients: PatientListItem[]; error?: string }> {
    try {
      const res = await fetch('/api/admin/patients', {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      let serverPatients: PatientListItem[] = [];
      let hadServerError = false;
      let serverErrorMsg = '';

      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.patients)) {
          serverPatients = data.patients;
        } else {
          hadServerError = true;
          serverErrorMsg = data.error || 'Error al consultar pacientes.';
        }
      } else {
        hadServerError = true;
        serverErrorMsg = `Error ${res.status} al consultar el servidor.`;
      }

      // Check local storage backups as additional safeguard
      let localBackups: any[] = [];
      try {
        const raw = localStorage.getItem('vela_submitted_questionnaires');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) localBackups = parsed;
        }
      } catch {}

      const patientMap = new Map<string, PatientListItem>();
      const emailIndex = new Map<string, string>();
      const docIndex = new Map<string, string>();

      for (const p of serverPatients) {
        patientMap.set(p.id, { ...p });
        if (p.email) emailIndex.set(p.email.toLowerCase().trim(), p.id);
        if (p.documento) docIndex.set(p.documento.trim(), p.id);
      }

      for (const b of localBackups) {
        const bId = b.id || b.patientId;
        const qName = (b.patientName || b.identificacion?.fullName || '')?.trim();
        const qEmail = (b.patientEmail || b.userEmail || b.identificacion?.email || '')?.toLowerCase()?.trim();
        const qDoc = (b.patientDocument || b.identificacion?.documentNumber || '')?.trim();
        const qPhone = (b.patientPhone || b.identificacion?.phone || '')?.trim();
        const qDriveLink = b.driveWebViewLink || b.pdfUrl || null;
        const qFechaEnvio = b.completedAt || b.savedAt || b.updatedAt || b.startedAt || null;
        const isCompleted = Boolean(
          b.status === 'completado' ||
          b.isSavedByPatient ||
          b.completedAt ||
          b.driveWebViewLink ||
          b.pdfUrl ||
          (b.currentStep && b.currentStep >= 10)
        );

        let matchedId: string | undefined;
        if (bId && patientMap.has(bId)) {
          matchedId = bId;
        } else if (qEmail && emailIndex.has(qEmail)) {
          matchedId = emailIndex.get(qEmail);
        } else if (qDoc && docIndex.has(qDoc)) {
          matchedId = docIndex.get(qDoc);
        }

        if (matchedId) {
          const existing = patientMap.get(matchedId)!;
          if (qName && qName !== 'Paciente en registro') existing.nombre = qName;
          if (qDoc) existing.documento = qDoc;
          if (qPhone) existing.celular = qPhone;
          if (qFechaEnvio) existing.fechaEnvio = qFechaEnvio;
          if (qDriveLink) existing.cuestionarioDriveLink = qDriveLink;
          if (isCompleted || existing.cuestionarioCompletado) {
            existing.cuestionarioCompletado = true;
            existing.clinicalStatus = 'Formulario recibido';
          }
        } else if (bId) {
          const newEntry: PatientListItem = {
            id: bId,
            nombre: (qName && qName !== 'Paciente en registro') ? qName : 'Paciente Formulario',
            email: qEmail || 'Sin correo',
            documento: qDoc || '',
            celular: qPhone || '',
            rol: 'paciente',
            estado: 'registrado',
            clinicalStatus: isCompleted ? 'Formulario recibido' : 'cuenta creada',
            fechaCreacion: b.startedAt || new Date().toISOString(),
            fechaEnvio: qFechaEnvio,
            cuestionarioCompletado: isCompleted,
            cuestionarioId: bId,
            cuestionarioDriveLink: qDriveLink,
            cuestionarioUpdatedAt: b.updatedAt,
            cuestionarioStep: b.currentStep,
            isDirectSubmission: true,
          };
          patientMap.set(bId, newEntry);
          if (qEmail) emailIndex.set(qEmail, bId);
          if (qDoc) docIndex.set(qDoc, bId);
        }
      }

      if (patientMap.size === 0 && hadServerError) {
        return { success: false, patients: [], error: serverErrorMsg };
      }

      const mergedList = Array.from(patientMap.values());
      mergedList.sort((a, b) => {
        const timeA = new Date(a.fechaEnvio || a.cuestionarioUpdatedAt || a.fechaCreacion || 0).getTime();
        const timeB = new Date(b.fechaEnvio || b.cuestionarioUpdatedAt || b.fechaCreacion || 0).getTime();
        return timeB - timeA;
      });

      return { success: true, patients: mergedList };
    } catch (err: any) {
      return { success: false, patients: [], error: err?.message || 'Error de conexión' };
    }
  },

  /**
   * Doctor: Create invitation
   */
  async createInvitation(nombre: string, email: string): Promise<{ success: boolean; inviteLink?: string; token?: string; error?: string }> {
    try {
      const res = await fetch('/api/admin/invitations', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ nombre, email }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, inviteLink: data.inviteLink, token: data.token };
      }
      return { success: false, error: data.error || 'Error al generar la invitación.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de conexión' };
    }
  },

  /**
   * Patient: Link questionnaire progress
   */
  async linkQuestionnaire(questionnaireId: string, isComplete: boolean, driveLink?: string): Promise<boolean> {
    try {
      await fetch('/api/patient/link-questionnaire', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ questionnaireId, isComplete, driveLink }),
      });
      return true;
    } catch {
      return false;
    }
  },
};
