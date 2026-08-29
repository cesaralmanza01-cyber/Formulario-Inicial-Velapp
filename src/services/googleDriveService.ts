/**
 * Google Drive Integration Service for Vela Questionnaires
 *
 * Provides completely invisible, server-side PDF uploads for patients,
 * powered by a Google Cloud Service Account (vela-drive-uploader@consultorio-m5-95.iam.gserviceaccount.com).
 */

export const GOOGLE_DRIVE_FOLDER_NAME = 'Vela - Cuestionarios Pacientes';

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
  serviceAccountEmail?: string;
  folderName?: string;
  folderId?: string | null;
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
  console.log('[Google Drive Service] Iniciando envío de PDF al servidor para Google Drive...');
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
      console.warn(`[Google Drive Service] Respuesta no-OK del servidor (${res.status}):`, errText);
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
 * Checks current Google Drive connection status from the server (Service Account)
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

