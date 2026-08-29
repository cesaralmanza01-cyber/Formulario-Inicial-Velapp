/**
 * Google Drive Integration Service for Vela Questionnaires
 *
 * Server-side OAuth 2.0 with offline refresh_token flow.
 * The doctor (comerconcalma@gmail.com) authorizes the app once from /admin,
 * and the server transparently uploads patient questionnaires to the
 * "FORMULARIO CONSULTAS VELA" folder.
 */

export const GOOGLE_DRIVE_FOLDER_NAME = 'FORMULARIO CONSULTAS VELA';
export const GOOGLE_DRIVE_FOLDER_ID = '1GF3_uCNeiuevL7PsNiwXzIXRIuocrpK8';

export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  webContentLink?: string;
  folderId?: string;
  reason?: string;
  error?: string;
}

export interface DriveServerStatus {
  success: boolean;
  connected: boolean;
  authorizedEmail?: string | null;
  folderName?: string;
  folderId?: string | null;
  updatedAt?: string;
  error?: string;
}

/**
 * Formats a Date object into YYYY-MM-DD
 */
export function formatDriveDate(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Cleans and formats patient name for safe file naming:
 * "Cuestionario_[Nombre completo de la paciente]_[fecha AAAA-MM-DD].pdf"
 */
export function generateDrivePdfFileName(patientName: string, date: Date = new Date()): string {
  const cleanName = (patientName || 'Paciente')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ');
  const dateStr = formatDriveDate(date);
  return `Cuestionario_${cleanName}_${dateStr}.pdf`;
}

/**
 * Converts a Blob to a Base64 Data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads patient PDF directly through the server to Google Drive.
 * 100% invisible to the patient, zero auth prompts.
 */
export async function uploadPatientPdfToServerDrive(
  pdfBlob: Blob,
  patientName: string,
  patientId: string
): Promise<DriveUploadResult> {
  console.log('[Google Drive Service] Iniciando subida de PDF a Google Drive...');
  try {
    const fileDataUrl = await blobToDataUrl(pdfBlob);
    const fileName = generateDrivePdfFileName(patientName);

    const res = await fetch('/api/drive/upload-patient-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientName,
        patientId,
        fileName,
        fileDataUrl,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`[Google Drive Service] Servidor devolvió status (${res.status}):`, errText);
      return {
        success: false,
        error: `Servidor devolvió status ${res.status}`,
      };
    }

    const data = await res.json();
    return data as DriveUploadResult;
  } catch (error: any) {
    console.error('[Google Drive Service Error]:', error);
    return {
      success: false,
      error: error?.message || 'Error de red al conectar con el servidor',
    };
  }
}

/**
 * Checks current Google Drive connection status from the server
 */
export async function getDriveServerStatus(): Promise<DriveServerStatus> {
  try {
    const res = await fetch('/api/admin/drive/status');
    if (!res.ok) {
      return { success: false, connected: false, error: `Error ${res.status}` };
    }
    const data = await res.json();
    return data as DriveServerStatus;
  } catch (err: any) {
    return { success: false, connected: false, error: err?.message };
  }
}

/**
 * Executes a test upload to verify server Google Drive connection
 */
export async function testDriveServerConnection(): Promise<DriveUploadResult & { message?: string }> {
  try {
    const res = await fetch('/api/admin/drive/test-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error de red' };
  }
}
