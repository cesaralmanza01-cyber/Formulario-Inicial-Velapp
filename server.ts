import express from "express";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { google } from "googleapis";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import firebaseConfig from "./firebase-applet-config.json";

dotenv.config();

const appFirebase = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(appFirebase);

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

  // ==========================================
  // GOOGLE DRIVE OAUTH 2.0 API ENDPOINTS
  // ==========================================

  // Initiate OAuth login flow
  app.get("/api/auth/google/login", (req, res) => {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

      if (!clientId || !clientSecret) {
        return res.status(400).send("Error: Faltan las variables GOOGLE_CLIENT_ID y/o GOOGLE_CLIENT_SECRET.");
      }

      const host = req.get("host");
      const proto = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

      let redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`
        : `${proto}://${host}/api/auth/google/callback`;

      if (host && host.includes("formulario-inicial-velapp.vercel.app")) {
        redirectUri = "https://formulario-inicial-velapp.vercel.app/api/auth/google/callback";
      }

      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
      const authorizeUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [
          "https://www.googleapis.com/auth/drive.file",
          "https://www.googleapis.com/auth/userinfo.email",
          "openid",
        ],
        include_granted_scopes: true,
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

      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

      const host = req.get("host");
      const proto = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";

      let redirectUri = process.env.APP_URL
        ? `${process.env.APP_URL.replace(/\/$/, "")}/api/auth/google/callback`
        : `${proto}://${host}/api/auth/google/callback`;

      if (host && host.includes("formulario-inicial-velapp.vercel.app")) {
        redirectUri = "https://formulario-inicial-velapp.vercel.app/api/auth/google/callback";
      }

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
      const tokensRef = doc(db, "_system_config", "google_drive_tokens");
      await setDoc(
        tokensRef,
        {
          refreshToken: tokens.refresh_token || "",
          accessToken: tokens.access_token || "",
          expiryDate: tokens.expiry_date || 0,
          authorizedEmail: userEmail,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      console.log(`[Express OAuth Callback] Google Drive tokens guardados para ${userEmail}`);
      return res.redirect("/?admin_tab=config&drive_connected=true");
    } catch (err: any) {
      console.error("[OAuth Callback Error]:", err);
      return res.redirect(`/?admin_tab=config&drive_error=${encodeURIComponent(err?.message || "callback_failed")}`);
    }
  });

  // Check Drive status
  app.get("/api/admin/drive/status", async (req, res) => {
    try {
      const hasClientId = Boolean(process.env.GOOGLE_CLIENT_ID);
      const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);
      const destinationFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || DEFAULT_FOLDER_ID;

      if (!hasClientId || !hasClientSecret) {
        return res.json({
          success: true,
          connected: false,
          folderId: destinationFolderId,
          folderName: GOOGLE_DRIVE_FOLDER_NAME,
          error: "Faltan las variables GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET",
        });
      }

      const tokensRef = doc(db, "_system_config", "google_drive_tokens");
      const snap = await getDoc(tokensRef);

      if (snap.exists() && snap.data()?.refreshToken) {
        const data = snap.data();
        return res.json({
          success: true,
          connected: true,
          authorizedEmail: data.authorizedEmail || "comerconcalma@gmail.com",
          folderId: destinationFolderId,
          folderName: GOOGLE_DRIVE_FOLDER_NAME,
          updatedAt: data.updatedAt,
        });
      }

      return res.json({
        success: true,
        connected: false,
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

      const tokensRef = doc(db, "_system_config", "google_drive_tokens");
      const snap = await getDoc(tokensRef);
      if (!snap.exists() || !snap.data()?.refreshToken) {
        return res.status(400).json({ success: false, error: "Google Drive no está conectado." });
      }

      const refreshToken = snap.data().refreshToken;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

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

      const tokensRef = doc(db, "_system_config", "google_drive_tokens");
      const snap = await getDoc(tokensRef);
      if (!snap.exists() || !snap.data()?.refreshToken) {
        return res.json({ success: false, reason: "drive_not_linked" });
      }

      const refreshToken = snap.data().refreshToken;
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });

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
      console.warn("[Upload Patient PDF Notice]:", error?.message);
      return res.json({
        success: false,
        error: error.message || "Error al subir PDF a Google Drive",
        reason: "drive_upload_failed",
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
  });
}

startServer();
