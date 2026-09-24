import express from "express";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { google } from "googleapis";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp as initAdminApp, getApps as getAdminApps, cert, getApp as getAdminApp } from "firebase-admin/app";
import { getFirestore as getAdminFirestoreInstance } from "firebase-admin/firestore";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  ensureDoctorAccounts,
  getUserByEmail,
  getUserById,
  getUserByInvitationToken,
  saveUserRecord,
  getAllPatientsWithStatus,
  signUserToken,
  extractAuthPayload,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
  requireDoctorRole,
  UserRecord,
} from "./server/auth";

dotenv.config();

const FIREBASE_PROJECT_ID = "gen-lang-client-0995145097";

interface StoredDriveTokens {
  refreshToken?: string;
  accessToken?: string;
  expiryDate?: number;
  authorizedEmail?: string;
  updatedAt?: string;
}

function getCleanEnv(key: string): string {
  const val = process.env[key] || "";
  let trimmed = val.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function parseServiceAccount(raw: string | undefined): any | null {
  if (!raw) return null;
  let str = raw.trim();
  if (!str) return null;

  if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
    str = str.slice(1, -1).trim();
  }

  if (!str.startsWith('{') && str.length > 20) {
    try {
      const decoded = Buffer.from(str, 'base64').toString('utf-8');
      if (decoded.startsWith('{')) {
        str = decoded;
      }
    } catch {}
  }

  try {
    const parsed = JSON.parse(str);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    if (parsed.client_email && parsed.private_key) {
      return parsed;
    }
    return null;
  } catch (err: any) {
    try {
      const fixedStr = str.replace(/[\r\n]+/g, ' ');
      const parsed = JSON.parse(fixedStr);
      if (parsed.private_key && typeof parsed.private_key === 'string') {
        parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
      }
      if (parsed.client_email && parsed.private_key) {
        return parsed;
      }
    } catch {}
    return null;
  }
}

function getAdminFirestore() {
  try {
    if (getAdminApps().length > 0) {
      return getAdminFirestoreInstance(getAdminApp());
    }

    const serviceAccount = parseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (!serviceAccount) {
      return null;
    }

    initAdminApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || FIREBASE_PROJECT_ID,
    });

    return getAdminFirestoreInstance(getAdminApp());
  } catch (err: any) {
    console.warn("[Server] Firebase Admin Init Notice:", err?.message || err);
    return null;
  }
}

async function getGoogleDriveStoredTokens(): Promise<StoredDriveTokens | null> {
  // Tier 1: Direct Environment Variable (Optional)
  const envRefreshToken = getCleanEnv("GOOGLE_DRIVE_REFRESH_TOKEN");
  if (envRefreshToken) {
    return {
      refreshToken: envRefreshToken,
      authorizedEmail: getCleanEnv("GOOGLE_DRIVE_AUTHORIZED_EMAIL") || "comerconcalma@gmail.com",
      updatedAt: new Date().toISOString(),
    };
  }

  // Tier 2: Firebase Admin SDK
  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      const snap = await dbAdmin.collection("_system_config").doc("google_drive_tokens").get();
      if (snap.exists) {
        const data = snap.data() as StoredDriveTokens;
        if (data?.refreshToken) {
          return data;
        }
      }
    }
  } catch (adminErr: any) {
    console.error("[Server] Firebase Admin fetch error:", adminErr?.message || adminErr);
  }

  return null;
}

async function saveGoogleDriveTokens(tokens: StoredDriveTokens): Promise<boolean> {
  try {
    const dbAdmin = getAdminFirestore();
    if (dbAdmin) {
      await dbAdmin.collection("_system_config").doc("google_drive_tokens").set(tokens, { merge: true });
      console.log("[Server] Tokens guardados exitosamente con Firebase Admin SDK.");
      return true;
    } else {
      console.error("[Server] Firebase Admin no disponible para guardar tokens.");
      return false;
    }
  } catch (adminErr: any) {
    console.error("[Server] Error guardando con Firebase Admin:", adminErr?.message || adminErr);
    return false;
  }
}

dotenv.config();

const DEFAULT_FOLDER_ID = "1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8";
const GOOGLE_DRIVE_FOLDER_NAME = "FORMULARIO CONSULTAS VELA";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Directory for storing uploaded clinical PDFs
  const uploadsDir = path.join(process.cwd(), "uploads", "pdfs");
  try {
    fs.mkdirSync(uploadsDir, { recursive: true });
  } catch (err) {
    console.warn("Notice: could not create uploads directory:", err);
  }

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(cookieParser());

  // Helper for computing base URL for invitation links
  const getBaseUrl = (req: express.Request): string => {
    const envAppUrl = getCleanEnv("APP_URL");
    if (envAppUrl) {
      return envAppUrl.replace(/\/$/, "");
    }
    const host = req.get("host") || `localhost:${PORT}`;
    const proto = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    return `${proto}://${host}`;
  };

  // Seed fixed doctor account on startup
  ensureDoctorAccounts(getAdminFirestore).catch((err) => {
    console.warn("[Server] Doctor account seed notice:", err?.message || err);
  });

  // ==========================================
  // CUSTOM AUTHENTICATION & PATIENT SESSIONS
  // ==========================================

  // 1. Login endpoint (for both Doctora and Paciente)
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: "Por favor ingresa tu correo y contraseña." });
      }

      await ensureDoctorAccounts(getAdminFirestore);

      const user = await getUserByEmail(email, getAdminFirestore);
      if (!user) {
        return res.status(401).json({ success: false, error: "Correo o contraseña incorrectos." });
      }

      if (!user.password) {
        if (user.estado === "invitado") {
          return res.status(400).json({
            success: false,
            isInvited: true,
            error: "Esta cuenta está en estado invitado. Por favor utiliza el enlace de invitación de la doctora para crear tu contraseña.",
          });
        }
        return res.status(401).json({ success: false, error: "Contraseña no configurada." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ success: false, error: "Correo o contraseña incorrectos." });
      }

      const token = signUserToken(user);
      setSessionCookie(req, res, token);

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol,
          estado: user.estado,
          cuestionarioCompletado: Boolean(user.cuestionarioCompletado),
        },
      });
    } catch (err: any) {
      console.error("[Login Error]:", err);
      return res.status(500).json({ success: false, error: "Error al iniciar sesión: " + (err?.message || "Desconocido") });
    }
  });

  // 2. Check current session / verify token
  app.get("/api/auth/me", async (req, res) => {
    try {
      const payload = extractAuthPayload(req);
      if (!payload) {
        return res.json({ authenticated: false, user: null });
      }

      const user = await getUserById(payload.userId, getAdminFirestore);
      if (!user) {
        return res.json({ authenticated: false, user: null });
      }

      return res.json({
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
      return res.json({ authenticated: false, user: null, error: err?.message });
    }
  });

  // 3. Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(res);
    return res.json({ success: true, message: "Sesión cerrada exitosamente." });
  });

  // 4. Verify invitation token (used by patient when clicking the invitation link)
  app.get("/api/auth/invitation/:token", async (req, res) => {
    try {
      const token = req.params.token;
      if (!token) {
        return res.status(400).json({ valid: false, error: "Token de invitación no suministrado." });
      }

      const user = await getUserByInvitationToken(token, getAdminFirestore);
      if (!user) {
        return res.status(404).json({ valid: false, error: "Invitación no encontrada o enlace inválido." });
      }

      if (user.estado === "registrado" && user.password) {
        return res.status(400).json({
          valid: false,
          alreadyRegistered: true,
          email: user.email,
          nombre: user.nombre,
          error: "Esta invitación ya fue activada previamente. Por favor inicia sesión con tu correo y contraseña.",
        });
      }

      return res.json({
        valid: true,
        invitation: {
          id: user.id,
          token: user.invitationToken,
          email: user.email,
          nombre: user.nombre,
          estado: user.estado,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ valid: false, error: err?.message || "Error al verificar invitación." });
    }
  });

  // 5. Activate account from invitation (set password)
  app.post("/api/auth/register-invited", async (req, res) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ success: false, error: "Por favor proporciona la contraseña y el token." });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: "La contraseña debe tener un mínimo de 6 caracteres." });
      }

      const user = await getUserByInvitationToken(token, getAdminFirestore);
      if (!user) {
        return res.status(404).json({ success: false, error: "Invitación no encontrada o token inválido." });
      }

      if (user.estado === "registrado" && user.password) {
        return res.status(400).json({
          success: false,
          error: "Esta cuenta ya fue activada. Por favor inicia sesión con tu contraseña.",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const updatedUser: UserRecord = {
        ...user,
        password: hashedPassword,
        estado: "registrado",
        fechaRegistro: new Date().toISOString(),
        invitationToken: null, // Consume invitation token
      };

      await saveUserRecord(updatedUser, getAdminFirestore);

      const authToken = signUserToken(updatedUser);
      setSessionCookie(req, res, authToken);

      return res.json({
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
      console.error("[Register Invited Error]:", err);
      return res.status(500).json({ success: false, error: "Error al activar la cuenta: " + err?.message });
    }
  });

  // 6. Doctor endpoint: List patients with clinical status
  app.get("/api/admin/patients", requireDoctorRole, async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const patients = await getAllPatientsWithStatus(getAdminFirestore);

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

      return res.json({ success: true, patients: formatted });
    } catch (err: any) {
      console.error("[Get Patients Error]:", err);
      return res.status(500).json({ success: false, error: err?.message || "Error al obtener pacientes" });
    }
  });

  // 7. Doctor endpoint: Create invitation for a new patient
  app.post("/api/admin/invitations", requireDoctorRole, async (req, res) => {
    try {
      const { nombre, email } = req.body;
      if (!nombre || !email) {
        return res.status(400).json({ success: false, error: "Ingresa el nombre completo y correo del paciente." });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanNombre = String(nombre).trim();

      if (!cleanEmail.includes("@") || !cleanEmail.includes(".")) {
        return res.status(400).json({ success: false, error: "Ingresa un correo electrónico válido." });
      }

      const existingUser = await getUserByEmail(cleanEmail, getAdminFirestore);
      const token = crypto.randomBytes(24).toString("hex");
      const baseUrl = getBaseUrl(req);
      const inviteLink = `${baseUrl}/?invitacion=${token}`;

      if (existingUser) {
        if (existingUser.estado === "registrado") {
          return res.status(400).json({
            success: false,
            error: `Ya existe una cuenta activa para ${cleanEmail}. El paciente ya puede ingresar con su correo y contraseña.`,
          });
        }

        // Renew invitation token for pending invited patient
        const updated = {
          ...existingUser,
          nombre: cleanNombre || existingUser.nombre,
          invitationToken: token,
          invitationCreatedAt: new Date().toISOString(),
        };
        await saveUserRecord(updated, getAdminFirestore);

        return res.json({
          success: true,
          token,
          inviteLink,
          message: "Invitación renovada exitosamente.",
          patient: {
            id: updated.id,
            nombre: updated.nombre,
            email: updated.email,
            estado: updated.estado,
            clinicalStatus: "invitado",
          },
        });
      }

      // Create new patient record
      const newPatient: UserRecord = {
        id: `pac_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`,
        email: cleanEmail,
        nombre: cleanNombre,
        rol: "paciente",
        estado: "invitado",
        invitationToken: token,
        invitationCreatedAt: new Date().toISOString(),
        fechaCreacion: new Date().toISOString(),
      };

      await saveUserRecord(newPatient, getAdminFirestore);

      return res.json({
        success: true,
        token,
        inviteLink,
        message: "Invitación creada exitosamente.",
        patient: {
          id: newPatient.id,
          nombre: newPatient.nombre,
          email: newPatient.email,
          estado: newPatient.estado,
          clinicalStatus: "invitado",
        },
      });
    } catch (err: any) {
      console.error("[Create Invitation Error]:", err);
      return res.status(500).json({ success: false, error: err?.message || "Error al generar invitación" });
    }
  });

  // 8. Link questionnaire progress to authenticated patient
  app.post("/api/patient/link-questionnaire", requireAuth, async (req, res) => {
    try {
      const authUser = (req as any).authUser;
      const { questionnaireId, isComplete, driveLink } = req.body;

      if (authUser && authUser.userId) {
        const user = await getUserById(authUser.userId, getAdminFirestore);
        if (user) {
          const updated: UserRecord = {
            ...user,
            cuestionarioId: questionnaireId || user.cuestionarioId,
            cuestionarioCompletado: isComplete !== undefined ? Boolean(isComplete) : user.cuestionarioCompletado,
            cuestionarioUpdatedAt: new Date().toISOString(),
            cuestionarioDriveLink: driveLink || user.cuestionarioDriveLink,
          };
          await saveUserRecord(updated, getAdminFirestore);
        }
      }

      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // ==========================================
  // GOOGLE DRIVE OAUTH 2.0 API ENDPOINTS
  // ==========================================

  const getGoogleRedirectUri = (req: express.Request): string => {
    const host = req.get("host") || "";
    const proto = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

    if (host.includes("formulario-inicial-velapp.vercel.app") || host.includes("vercel.app")) {
      return "https://formulario-inicial-velapp.vercel.app/api/auth/google/callback";
    }

    const envAppUrl = getCleanEnv("APP_URL");
    if (envAppUrl && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      return `${envAppUrl.replace(/\/$/, "")}/api/auth/google/callback`;
    }

    return `${proto}://${host}/api/auth/google/callback`;
  };

  // Initiate OAuth login flow
  app.get("/api/auth/google/login", (req, res) => {
    try {
      const clientId = getCleanEnv("GOOGLE_CLIENT_ID");
      const clientSecret = getCleanEnv("GOOGLE_CLIENT_SECRET");

      if (!clientId || !clientSecret) {
        return res.status(400).send("Error: Faltan las variables GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET.");
      }

      const redirectUri = getGoogleRedirectUri(req);
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent select_account",
        scope: [
          "https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/userinfo.email",
          "openid",
        ],
      });

      return res.redirect(authorizeUrl);
    } catch (err: any) {
      console.error("[OAuth Login Error]:", err);
      return res.status(500).send(`Error iniciando login: ${err?.message}`);
    }
  });

  // OAuth callback endpoint
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, error } = req.query;
      if (error) {
        return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(String(error))}`);
      }
      if (!code) {
        return res.redirect("/?admin_tab=config&drive_error=no_code");
      }

      const clientId = getCleanEnv("GOOGLE_CLIENT_ID");
      const clientSecret = getCleanEnv("GOOGLE_CLIENT_SECRET");
      const redirectUri = getGoogleRedirectUri(req);

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const { tokens } = await oauth2Client.getToken(String(code));
      oauth2Client.setCredentials(tokens);

      let userEmail = "comerconcalma@gmail.com";
      try {
        const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
        const info = await oauth2.userinfo.get();
        if (info.data.email) userEmail = info.data.email;
      } catch (e) {}

      // Save tokens in Firestore under _system_config/google_drive_tokens
      await saveGoogleDriveTokens({
        refreshToken: tokens.refresh_token || "",
        accessToken: tokens.access_token || "",
        expiryDate: tokens.expiry_date || 0,
        authorizedEmail: userEmail,
        updatedAt: new Date().toISOString(),
      });

      console.log(`[Express OAuth Callback] Google Drive tokens guardados para ${userEmail}`);
      return res.redirect("/?admin_tab=config&drive_connected=true");
    } catch (err: any) {
      console.error("[OAuth Callback Error]:", err);
      return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(err?.message || "callback_failed")}`);
    }
  });

  // Check Drive status (with live verification of token validity)
  app.get("/api/admin/drive/status", async (req, res) => {
    try {
      const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
      const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
      const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

      if (!hasClientId || !hasClientSecret) {
        return res.json({
          success: true,
          connected: false,
          authorized: false,
          folderId: destinationFolderId,
          folderName: GOOGLE_DRIVE_FOLDER_NAME,
          error: "Faltan las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET",
        });
      }

      const tokenData = await getGoogleDriveStoredTokens();

      if (tokenData && tokenData.refreshToken) {
        const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
        const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
        oauth2Client.setCredentials({ refresh_token: tokenData.refreshToken });

        oauth2Client.on("tokens", (newTokens) => {
          if (newTokens.refresh_token) {
            saveGoogleDriveTokens({
              refreshToken: newTokens.refresh_token,
              accessToken: newTokens.access_token || "",
              expiryDate: newTokens.expiry_date || 0,
              authorizedEmail: tokenData.authorizedEmail || "comerconcalma@gmail.com",
              updatedAt: new Date().toISOString(),
            }).catch(console.error);
          }
        });

        try {
          const liveToken = await oauth2Client.getAccessToken();
          if (!liveToken || !liveToken.token) {
            throw new Error("No se pudo obtener un token de acceso válido");
          }

          return res.json({
            success: true,
            connected: true,
            authorized: true,
            expired: false,
            authorizedEmail: tokenData.authorizedEmail || "comerconcalma@gmail.com",
            folderId: destinationFolderId,
            folderName: GOOGLE_DRIVE_FOLDER_NAME,
            updatedAt: tokenData.updatedAt || new Date().toISOString(),
          });
        } catch (authError: any) {
          const errMsg = authError?.message || authError?.response?.data?.error || "Error de autorización";
          const isTestingExpired =
            errMsg.includes("unauthorized_client") ||
            errMsg.includes("invalid_grant") ||
            authError?.response?.status === 401;

          console.warn("[Drive Status Check] Token verification notice:", errMsg);
          return res.json({
            success: true,
            connected: false,
            authorized: false,
            expired: true,
            isTestingExpired,
            authorizedEmail: tokenData.authorizedEmail || "comerconcalma@gmail.com",
            folderId: destinationFolderId,
            folderName: GOOGLE_DRIVE_FOLDER_NAME,
            updatedAt: tokenData.updatedAt,
            error: isTestingExpired
              ? "La autorización de Google Drive caducó (la app de Google está en modo 'Testing' de 7 días). Haz clic en 'Re-autorizar Google Drive' o pasa la app a 'Producción' en Google Cloud Console para evitar que expire."
              : `Error al verificar autorización de Google Drive: ${errMsg}`,
          });
        }
      }

      return res.json({
        success: true,
        connected: false,
        authorized: false,
        expired: false,
        folderId: destinationFolderId,
        folderName: GOOGLE_DRIVE_FOLDER_NAME,
        error: "Google Drive no está conectado aún",
      });
    } catch (error: any) {
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Test upload endpoint
  app.post("/api/admin/drive/test-upload", async (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
      const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

      if (!clientId || !clientSecret) {
        return res.status(400).json({ success: false, error: "Faltan credenciales de Google OAuth." });
      }

      const tokenData = await getGoogleDriveStoredTokens();
      if (!tokenData || !tokenData.refreshToken) {
        return res.status(400).json({ success: false, error: "Google Drive no está conectado." });
      }

      const refreshToken = tokenData.refreshToken;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      oauth2Client.on("tokens", (newTokens) => {
        if (newTokens.refresh_token) {
          saveGoogleDriveTokens({
            refreshToken: newTokens.refresh_token,
            accessToken: newTokens.access_token || "",
            expiryDate: newTokens.expiry_date || 0,
            authorizedEmail: tokenData.authorizedEmail || "comerconcalma@gmail.com",
            updatedAt: new Date().toISOString(),
          }).catch(console.error);
        }
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });
      const testPdfContent = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 80>>stream\nBT /F1 16 Tf 50 750 Td (Vela - Prueba de conexion con OAuth Google Drive exitosa) Tj ET\nendstream\nendobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\nxref\n0 6\n0000000000 65535 f\n0000000010 00000 n\n0000000060 00000 n\n0000000117 00000 n\n0000000228 00000 n\n0000000354 00000 n\ntrailer<</Size 6/Root 1 0 R>>\nstartxref\n428\n%%EOF`;
      const buffer = Buffer.from(testPdfContent, "utf-8");
      const testFileName = `Prueba_OAuth_Vela_${Date.now()}.pdf`;

      const fileMetadata: any = {
        name: testFileName,
        mimeType: "application/pdf",
        description: "Archivo de prueba de conexión OAuth Google Drive — Vela Medicina & Nutrición",
      };

      if (destinationFolderId) {
        fileMetadata.parents = [destinationFolderId];
      }

      const stream = Readable.from(buffer);
      const media = { mimeType: "application/pdf", body: stream };

      try {
        const driveRes = await drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: "id, name, webViewLink, webContentLink, parents",
          supportsAllDrives: true,
        });

        const fileId = driveRes.data.id || "";
        const webViewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

        return res.json({
          success: true,
          fileId,
          fileName: testFileName,
          webViewLink,
          folderId: destinationFolderId,
          message: "¡Archivo de prueba subido exitosamente a tu Google Drive!",
        });
      } catch (uploadError: any) {
        const errMsg = uploadError?.message || uploadError?.response?.data?.error || "Error al subir";
        const isExpired =
          errMsg.includes("unauthorized_client") ||
          errMsg.includes("invalid_grant") ||
          uploadError?.response?.status === 401;

        console.error("[OAuth Test Upload Error]:", uploadError);
        return res.status(400).json({
          success: false,
          isExpired,
          error: isExpired
            ? "La autorización de Google Drive caducó (la app está en modo 'Testing' en Google Cloud Console, que vence cada 7 días). Haz clic en 'Re-autorizar Google Drive' para renovar el acceso."
            : `Error de subida a Google Drive: ${errMsg}`,
        });
      }
    } catch (error: any) {
      console.error("[OAuth Test Upload Error]:", error);
      return res.status(500).json({ success: false, error: error.message });
    }
  });

  // Patient upload endpoint (server-side via stored refresh token)
  app.post("/api/drive/upload-patient-pdf", async (req, res) => {
    try {
      const { patientName, patientId, fileDataUrl, fileName } = req.body;
      if (!fileDataUrl) {
        return res.json({ success: false, error: "No se proporcionaron datos de archivo PDF" });
      }

      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
      const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

      if (!clientId || !clientSecret) {
        return res.json({ success: false, reason: "oauth_not_configured" });
      }

      const tokenData = await getGoogleDriveStoredTokens();
      if (!tokenData || !tokenData.refreshToken) {
        return res.json({ success: false, reason: "drive_not_linked" });
      }

      const refreshToken = tokenData.refreshToken;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

      oauth2Client.on("tokens", (newTokens) => {
        if (newTokens.refresh_token) {
          saveGoogleDriveTokens({
            refreshToken: newTokens.refresh_token,
            accessToken: newTokens.access_token || "",
            expiryDate: newTokens.expiry_date || 0,
            authorizedEmail: tokenData.authorizedEmail || "comerconcalma@gmail.com",
            updatedAt: new Date().toISOString(),
          }).catch(console.error);
        }
      });

      const drive = google.drive({ version: "v3", auth: oauth2Client });

      let base64Data = fileDataUrl;
      if (fileDataUrl.includes(",")) {
        base64Data = fileDataUrl.split(",")[1];
      }
      const buffer = Buffer.from(base64Data, "base64");

      const safePatientName = patientName || "Paciente";
      const cleanName = safePatientName.trim().replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, " ");
      const todayStr = new Date().toISOString().split("T")[0];
      const finalFileName = fileName || `Cuestionario_${cleanName}_${todayStr}.pdf`;

      const fileMetadata: any = {
        name: finalFileName,
        mimeType: "application/pdf",
        description: `Cuestionario inicial de la paciente ${safePatientName} — Vela Medicina & Nutrición Integral`,
      };

      if (destinationFolderId) {
        fileMetadata.parents = [destinationFolderId];
      }

      const stream = Readable.from(buffer);
      const media = { mimeType: "application/pdf", body: stream };

      const driveRes = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: "id, name, webViewLink, webContentLink, parents",
        supportsAllDrives: true,
      });

      const fileId = driveRes.data.id || "";
      const webViewLink = driveRes.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

      return res.json({
        success: true,
        fileId,
        fileName: finalFileName,
        webViewLink,
        folderId: destinationFolderId,
      });
    } catch (error: any) {
      const errMsg = error?.message || error?.response?.data?.error || "";
      const isExpired = errMsg.includes("unauthorized_client") || errMsg.includes("invalid_grant") || error?.response?.status === 401;
      console.warn("[Upload Patient PDF Notice]:", errMsg);
      return res.json({
        success: false,
        error: isExpired ? "Token de Google Drive caducado (modo Testing de 7 días). Requiere re-autorizar en el panel médico." : (error.message || "Error al subir PDF a Google Drive"),
        reason: isExpired ? "token_expired" : "drive_upload_failed",
      });
    }
  });

  // Helper for lazy Gemini initialization
  const getGeminiClient = () => {
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  };

  // API endpoint to upload patient clinical PDF securely and reliably
  app.post("/api/pdf/upload", (req, res) => {
    try {
      const { patientId, fileName, fileDataUrl, patientName } = req.body;
      if (!fileDataUrl) {
        return res.status(400).json({ success: false, error: "No se proporcionaron datos de archivo" });
      }

      let base64Data = fileDataUrl;
      if (fileDataUrl.includes(",")) {
        base64Data = fileDataUrl.split(",")[1];
      }

      const buffer = Buffer.from(base64Data, "base64");
      const safePatientId = (patientId || "paciente").replace(/[^a-zA-Z0-9_-]/g, "_");
      const safePatientName = (patientName || "paciente").replace(/[^a-zA-Z0-9_-]/g, "_");
      const timestamp = Date.now();
      const uniqueFileName = `${safePatientId}_${safePatientName}_${timestamp}.pdf`;
      const filePath = path.join(uploadsDir, uniqueFileName);

      fs.writeFileSync(filePath, buffer);
      console.log(`[PDF Upload] Archivo PDF guardado en servidor: ${filePath} (${buffer.length} bytes)`);

      // Determine public URL
      const host = req.get("host") || `localhost:${PORT}`;
      const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
      const viewUrl = `${protocol}://${host}/api/pdf/view/${uniqueFileName}`;
      const downloadUrl = `${protocol}://${host}/api/pdf/download/${uniqueFileName}`;

      return res.json({
        success: true,
        fileId: uniqueFileName,
        url: viewUrl,
        downloadUrl: downloadUrl,
        size: buffer.length,
        fileName: fileName || uniqueFileName,
      });
    } catch (error: any) {
      console.error("[PDF Upload Error] Error al guardar PDF en servidor:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Error al procesar el archivo PDF",
      });
    }
  });

  // API endpoint to view uploaded PDF inline
  app.get("/api/pdf/view/:fileName", (req, res) => {
    try {
      const fileName = req.params.fileName;
      const sanitized = path.basename(fileName);
      const filePath = path.join(uploadsDir, sanitized);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo PDF no encontrado.");
      }

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${sanitized}"`);
      const fileStream = fs.createReadStream(filePath);
      return fileStream.pipe(res);
    } catch (err: any) {
      return res.status(500).send("Error al leer el archivo PDF.");
    }
  });

  // API endpoint to download uploaded PDF
  app.get("/api/pdf/download/:fileName", (req, res) => {
    try {
      const fileName = req.params.fileName;
      const sanitized = path.basename(fileName);
      const filePath = path.join(uploadsDir, sanitized);

      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo PDF no encontrado.");
      }

      return res.download(filePath, sanitized);
    } catch (err: any) {
      return res.status(500).send("Error al descargar el archivo PDF.");
    }
  });

  // API Route for InBody AI Analysis using Gemini 2.5 Flash
  app.post("/api/inbody/analyze", async (req, res) => {
    try {
      const { images, patientContext } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Se requiere al menos una imagen del examen InBody." });
      }

      const ai = getGeminiClient();

      const imageParts = images.map((base64Image: string) => {
        let mimeType = "image/jpeg";
        let data = base64Image;

        if (base64Image.includes(";base64,")) {
          const parts = base64Image.split(";base64,");
          mimeType = parts[0].replace("data:", "");
          data = parts[1];
        }

        return {
          inlineData: {
            mimeType,
            data,
          },
        };
      });

      const promptText = `
Eres un asistente médico experto en análisis de composición corporal clínica para la consulta de Medicina y Nutrición Integral de la Dra. Lorena Castro (Vela Medicina Funcional).

Analiza detalladamente la(s) hoja(s) de resultados InBody adjuntas y extrae todos los parámetros numéricos con la mayor precisión posible.
Si algún parámetro no está presente o no es legible en la imagen, omítelo o márcalo como null.

Contexto del paciente si está disponible:
- Nombre / Identificador: ${patientContext?.patientName || "No especificado"}
- Edad: ${patientContext?.age || "No especificada"}
- Sexo: ${patientContext?.gender || "Femenino"}
- Estatura reportada: ${patientContext?.height || "No especificada"}

Devuelve un JSON estrictamente estructurado según el schema con las mediciones extraídas y un breve resumen clínico integral en español claro y empático.
`;

      const contents = [
        ...imageParts,
        {
          text: promptText,
        },
      ];

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              peso_kg: { type: Type.NUMBER, description: "Peso corporal total en kilogramos" },
              masa_muscular_esqueletica_kg: { type: Type.NUMBER, description: "Masa de Músculo Esquelético (MME) en kg" },
              masa_grasa_corporal_kg: { type: Type.NUMBER, description: "Masa Grasa Corporal (MGC) en kg" },
              porcentaje_grasa_corporal: { type: Type.NUMBER, description: "Porcentaje de Grasa Corporal (PGC) en %" },
              agua_corporal_total_l: { type: Type.NUMBER, description: "Agua Corporal Total (ACT) en litros" },
              masa_libre_grasa_kg: { type: Type.NUMBER, description: "Masa Libre de Grasa (MLG) en kg" },
              imc: { type: Type.NUMBER, description: "Índice de Masa Corporal (IMC)" },
              tasa_metabolica_basal_kcal: { type: Type.NUMBER, description: "Tasa Metabólica Basal (TMB) en kcal" },
              relacion_cintura_cadera: { type: Type.NUMBER, description: "Relación Cintura-Cadera (RCC)" },
              nivel_grasa_visceral: { type: Type.NUMBER, description: "Nivel de Grasa Visceral (escala 1-20)" },
              puntuacion_inbody: { type: Type.NUMBER, description: "Puntuación InBody (sobre 100 puntos)" },
              analisis_segmental: {
                type: Type.OBJECT,
                properties: {
                  brazo_derecho_kg: { type: Type.NUMBER },
                  brazo_izquierdo_kg: { type: Type.NUMBER },
                  tronco_kg: { type: Type.NUMBER },
                  pierna_derecha_kg: { type: Type.NUMBER },
                  pierna_izquierda_kg: { type: Type.NUMBER },
                },
              },
              interpretacion_clinica: {
                type: Type.STRING,
                description: "Breve síntesis médica del perfil de composición corporal destacando masa muscular, adiposidad y grasa visceral.",
              },
            },
            required: ["peso_kg", "porcentaje_grasa_corporal", "interpretacion_clinica"],
          },
        },
      });

      const jsonText = response.text?.trim() || "{}";
      const parsedData = JSON.parse(jsonText);

      return res.json({
        success: true,
        data: parsedData,
      });
    } catch (err: any) {
      console.error("Error en análisis de InBody con Gemini:", err);
      return res.status(500).json({
        error: "No se pudo procesar la imagen del examen InBody.",
        details: err.message,
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Ensure the doctor credentials and account in Firestore / store are in sync
    ensureDoctorAccounts(getAdminFirestore).catch((err) => {
      console.warn("[Server Auth Startup] Notice ensuring doctor account:", err?.message || err);
    });
  });
}

startServer();
