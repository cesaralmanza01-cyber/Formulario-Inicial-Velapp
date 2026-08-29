/**
 * Google Drive Integration Service for Vela Questionnaires
 *
 * Handles automatic uploading of patient PDF questionnaires into the designated
 * Google Drive folder "Vela - Cuestionarios Pacientes" in the connected Google account.
 */

// Target folder name in Google Drive
export const GOOGLE_DRIVE_FOLDER_NAME = 'Vela - Cuestionarios Pacientes';

// Google Drive API endpoints
const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

/**
 * Interface for the Google Drive Upload Result
 */
export interface DriveUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  webViewLink?: string;
  webContentLink?: string;
  folderId?: string;
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
 * Searches for or creates the destination folder "Vela - Cuestionarios Pacientes"
 * in the user's Google Drive.
 */
async function getOrCreateVelaFolder(accessToken: string): Promise<string> {
  // 1. Search if folder already exists (not in trash)
  const query = `name = '${GOOGLE_DRIVE_FOLDER_NAME.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchUrl = `${DRIVE_FILES_API}?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`;

  const searchRes = await fetch(searchUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!searchRes.ok) {
    const errBody = await searchRes.text().catch(() => '');
    throw new Error(`Error buscando carpeta en Google Drive (${searchRes.status}): ${errBody || searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    const existingFolderId = searchData.files[0].id;
    console.log('[Google Drive] Carpeta existente encontrada en Drive:', GOOGLE_DRIVE_FOLDER_NAME, 'ID:', existingFolderId);
    return existingFolderId;
  }

  // 2. Create the folder if it doesn't exist
  console.log('[Google Drive] Creando nueva carpeta en Google Drive:', GOOGLE_DRIVE_FOLDER_NAME);
  const createFolderRes = await fetch(DRIVE_FILES_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: GOOGLE_DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'Expedientes y cuestionarios médicos iniciales de pacientes de Vela (Dra. Lorena Castro)',
    }),
  });

  if (!createFolderRes.ok) {
    const errBody = await createFolderRes.text().catch(() => '');
    throw new Error(`Error creando carpeta en Google Drive (${createFolderRes.status}): ${errBody || createFolderRes.statusText}`);
  }

  const newFolderData = await createFolderRes.json();
  console.log('[Google Drive] Carpeta creada exitosamente con ID:', newFolderData.id);
  return newFolderData.id;
}

/**
 * Uploads a PDF Blob to the Google Drive folder "Vela - Cuestionarios Pacientes"
 * using multipart upload.
 *
 * @param accessToken Valid Google OAuth Access Token
 * @param pdfBlob The generated questionnaire PDF Blob
 * @param patientName Full name of the patient
 * @returns DriveUploadResult with file ID and web links
 */
export async function uploadPatientPdfToGoogleDrive(
  accessToken: string,
  pdfBlob: Blob,
  patientName: string
): Promise<DriveUploadResult> {
  console.log('[Google Drive Upload] ========================================');
  console.log('[Google Drive Upload] Paso 1: Iniciando subida a Google Drive...');
  console.log('[Google Drive Upload] Paciente:', patientName, '| Tamaño PDF:', pdfBlob.size, 'bytes');

  try {
    // 1. Resolve folder ID
    const folderId = await getOrCreateVelaFolder(accessToken);

    // 2. Build official file name: "Cuestionario_[Nombre completo de la paciente]_[fecha AAAA-MM-DD].pdf"
    const fileName = generateDrivePdfFileName(patientName);
    console.log('[Google Drive Upload] Paso 2: Nombre de archivo asignado:', fileName);

    // 3. Prepare multipart body
    const metadata = {
      name: fileName,
      parents: [folderId],
      mimeType: 'application/pdf',
      description: `Cuestionario inicial de la paciente ${patientName} recibido el ${formatDriveDate()}`,
    };

    const boundary = '-------VelaDriveUploadBoundary' + Math.random().toString(36).substring(2);
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart =
      delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/pdf\r\n\r\n';

    // Convert Blob to ArrayBuffer
    const fileArrayBuffer = await pdfBlob.arrayBuffer();
    const metadataBuffer = new TextEncoder().encode(metadataPart);
    const closeBuffer = new TextEncoder().encode(closeDelimiter);

    // Combine into single Uint8Array for binary multipart upload
    const combinedBuffer = new Uint8Array(
      metadataBuffer.byteLength + fileArrayBuffer.byteLength + closeBuffer.byteLength
    );
    combinedBuffer.set(metadataBuffer, 0);
    combinedBuffer.set(new Uint8Array(fileArrayBuffer), metadataBuffer.byteLength);
    combinedBuffer.set(closeBuffer, metadataBuffer.byteLength + fileArrayBuffer.byteLength);

    console.log('[Google Drive Upload] Paso 3: Transmitiendo datos a Google Drive API...');
    const uploadRes = await fetch(DRIVE_UPLOAD_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: combinedBuffer,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text().catch(() => '');
      throw new Error(`Error en subida a Google Drive (${uploadRes.status}): ${errBody || uploadRes.statusText}`);
    }

    const uploadData = await uploadRes.json();
    console.log('[Google Drive Upload] Paso 4: Archivo subido con éxito a Drive. ID:', uploadData.id);

    // 4. Fetch the webViewLink and webContentLink
    let webViewLink = `https://drive.google.com/file/d/${uploadData.id}/view`;
    let webContentLink = `https://drive.google.com/uc?id=${uploadData.id}&export=download`;

    try {
      const fileInfoRes = await fetch(
        `${DRIVE_FILES_API}/${uploadData.id}?fields=id,name,webViewLink,webContentLink`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      if (fileInfoRes.ok) {
        const fileInfo = await fileInfoRes.json();
        if (fileInfo.webViewLink) webViewLink = fileInfo.webViewLink;
        if (fileInfo.webContentLink) webContentLink = fileInfo.webContentLink;
      }
    } catch (infoErr) {
      console.warn('[Google Drive Upload Notice] Detalle de links (usando enlaces estándar):', infoErr);
    }

    console.log('[Google Drive Upload] Paso 5: Enlace web generado:', webViewLink);
    console.log('[Google Drive Upload] ========================================');

    return {
      success: true,
      fileId: uploadData.id,
      fileName,
      webViewLink,
      webContentLink,
      folderId,
    };
  } catch (error: any) {
    console.error('[Google Drive Upload Error] Falló la subida a Google Drive:', error);
    return {
      success: false,
      error: error?.message || 'Error desconocido al subir a Google Drive',
    };
  }
}
