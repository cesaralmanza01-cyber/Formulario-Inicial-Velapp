import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import {
  FirestoreQuestionnaireDocument,
  PatientBasicInfo,
  PatientMotivationInfo,
  PatientWeightHistoryInfo,
  PatientHealthMapInfo,
  PatientBodySymptomsInfo,
  PatientNutritionInfo,
  PatientPhysicalActivityInfo,
  PatientLabExamsInfo,
  PatientInBodyInfo,
  UploadedLabFile,
} from '../types';
import { evaluateClinicalRedFlags } from '../utils/clinicalFlags';

const COLLECTION_NAME = 'cuestionarios_iniciales';

/**
 * Deeply sanitizes any object to remove `undefined` values before passing to Firestore setDoc/updateDoc
 */
export function cleanFirestoreData<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return null as any;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => cleanFirestoreData(item)) as any;
  }
  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = cleanFirestoreData(value);
      }
    }
    return cleaned as T;
  }
  return obj;
}

/**
 * Retrieves a stable patient identifier for Firestore documents.
 * Uses authenticated doctor UID if logged in, or a persistent unique local UUID per patient.
 */
export async function ensurePatientAuth(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }

  // Retrieve or create a persistent anonymous identifier for the patient session
  let localId = localStorage.getItem('vela_patient_anon_id');
  if (!localId) {
    localId = `paciente_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem('vela_patient_anon_id', localId);
  }
  return localId;
}

/**
 * Converts a Blob to a Base64 data URL
 */
export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads generated clinical PDF to backend server API endpoint as a reliable backup
 */
export async function uploadPdfToServer(
  patientId: string,
  pdfBlob: Blob,
  patientName?: string
): Promise<string> {
  console.log('[Server PDF Upload] Enviando PDF al endpoint del servidor (/api/pdf/upload)...');
  const fileDataUrl = await blobToDataURL(pdfBlob);
  const response = await fetch('/api/pdf/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      patientId,
      patientName,
      fileDataUrl,
      fileName: `Cuestionario_Inicial_Vela_${(patientName || 'paciente').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`,
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`HTTP error ${response.status} en servidor PDF: ${errText || response.statusText}`);
  }

  const data = await response.json();
  if (!data.success || !data.url) {
    throw new Error(data.error || 'No se pudo generar URL del PDF en el servidor');
  }

  console.log('[Server PDF Upload] PDF alojado exitosamente en servidor:', data.url);
  return data.url;
}

/**
 * Helper to get cached step data from localStorage as fallback
 */
function getCachedStepData<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Sanitizes attached files before saving to Firestore so document size limits are respected
 */
function sanitizeLabFiles(files?: UploadedLabFile[]): UploadedLabFile[] {
  if (!files || files.length === 0) return [];
  return files.map((f) => ({
    id: f.id,
    name: f.name,
    size: f.size,
    type: f.type,
    description: f.description || '',
    uploadedAt: f.uploadedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  }));
}

/**
 * Saves or updates the patient questionnaire in Firestore and local backup
 */
export async function saveQuestionnaireToFirestore(params: {
  currentStep: number;
  isComplete?: boolean;
  isSavedByPatient?: boolean;
  step1Data?: PatientBasicInfo | null;
  step2Data?: PatientMotivationInfo | null;
  step3Data?: PatientWeightHistoryInfo | null;
  step4Data?: PatientHealthMapInfo | null;
  step5Data?: PatientBodySymptomsInfo | null;
  step6Data?: PatientNutritionInfo | null;
  step7Data?: PatientPhysicalActivityInfo | null;
  step9Data?: PatientLabExamsInfo | null;
  stepInBodyData?: PatientInBodyInfo | null;
  driveFileId?: string;
  driveFileName?: string;
  driveWebViewLink?: string;
  driveFolderId?: string;
}): Promise<string> {
  const patientId = await ensurePatientAuth();

  // Combine passed data with cached localStorage data so nothing is ever overwritten with null
  const step1 = params.step1Data ?? getCachedStepData<PatientBasicInfo>('vela_step1_data');
  const step2 = params.step2Data ?? getCachedStepData<PatientMotivationInfo>('vela_step2_data');
  const step3 = params.step3Data ?? getCachedStepData<PatientWeightHistoryInfo>('vela_step3_data');
  const step4 = params.step4Data ?? getCachedStepData<PatientHealthMapInfo>('vela_step4_data');
  const step5 = params.step5Data ?? getCachedStepData<PatientBodySymptomsInfo>('vela_step5_data');
  const step6 = params.step6Data ?? getCachedStepData<PatientNutritionInfo>('vela_step6_data');
  const step7 = params.step7Data ?? getCachedStepData<PatientPhysicalActivityInfo>('vela_step7_data');
  const step9 = params.step9Data ?? getCachedStepData<PatientLabExamsInfo>('vela_step9_data');
  const stepInBody = params.stepInBodyData ?? getCachedStepData<PatientInBodyInfo>('vela_step10_inbody_data');

  // Evaluate clinical red flags from symptoms review
  const redFlagsEvaluation = evaluateClinicalRedFlags(step5);

  const cleanLabFiles = sanitizeLabFiles(step9?.files);
  const cleanInBodyFiles = sanitizeLabFiles(stepInBody?.files);

  const docRef = doc(db, COLLECTION_NAME, patientId);
  let existingStartedAt: string | undefined;
  let existingCompletedAt: string | undefined;
  let existingSavedByPatient: boolean | undefined;
  let existingSavedAt: string | undefined;
  let existingDriveLink: string | undefined;

  try {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      existingStartedAt = data?.startedAt;
      existingCompletedAt = data?.completedAt;
      existingSavedByPatient = data?.isSavedByPatient;
      existingSavedAt = data?.savedAt;
      existingDriveLink = data?.driveWebViewLink || data?.pdfUrl;
    }
  } catch (e) {
    console.warn('Notice reading existing doc:', e);
  }

  const now = new Date().toISOString();
  const startedAt = existingStartedAt || now;
  const isSaved = params.isSavedByPatient ?? existingSavedByPatient ?? false;
  const isDone = params.isComplete || isSaved;
  const status: 'en progreso' | 'completado' = isDone ? 'completado' : 'en progreso';

  const driveLink = params.driveWebViewLink || existingDriveLink || null;

  const rawDocData: Record<string, any> = {
    patientId,
    patientName: step1?.fullName?.trim() || 'Paciente en registro',
    patientDocument: step1?.documentNumber?.trim() || '',
    status,
    isSavedByPatient: isSaved,
    savedAt: isSaved ? (existingSavedAt || now) : null,
    currentStep: params.currentStep,
    startedAt,
    updatedAt: now,
    completedAt: isDone ? (existingCompletedAt || now) : null,
    pdfUrl: driveLink,
    driveFileId: params.driveFileId || null,
    driveFileName: params.driveFileName || null,
    driveWebViewLink: driveLink,
    driveFolderId: params.driveFolderId || null,
    driveUploadedAt: driveLink ? now : null,
    banderas_revisar: redFlagsEvaluation.flags,
    identificacion: step1 || null,
    motivo_objetivos: step2 || null,
    relacion_peso: step3 || null,
    mapa_salud: step4 || null,
    revision_sistemas: step5 || null,
    entrevista_dietetica: step6 || null,
    actividad_fisica: step7 || null,
    paraclinicos: step9
      ? {
          hasRecentLabs: step9.hasRecentLabs,
          files: cleanLabFiles,
          notesOrFindings: step9.notesOrFindings,
        }
      : null,
    inbody: stepInBody
      ? {
          hasInBodyReport: stepInBody.hasInBodyReport,
          files: cleanInBodyFiles,
          testDateOrCenter: stepInBody.testDateOrCenter,
          knownMetrics: stepInBody.knownMetrics,
          notesOrGoals: stepInBody.notesOrGoals,
          extractedMetrics: stepInBody.extractedMetrics || null,
        }
      : null,
  };

  const docData = cleanFirestoreData(rawDocData);

  // 1. Save to Firestore
  await setDoc(docRef, docData, { merge: true });

  // 2. Also keep a local backup in localStorage for resiliency
  try {
    const existingBackups: any[] = JSON.parse(
      localStorage.getItem('vela_submitted_questionnaires') || '[]'
    );
    const filtered = existingBackups.filter((b) => b.patientId !== patientId);
    filtered.unshift({ id: patientId, ...docData });
    localStorage.setItem('vela_submitted_questionnaires', JSON.stringify(filtered.slice(0, 20)));
  } catch (err) {
    console.warn('Local backup write notice:', err);
  }

  return patientId;
}

/**
 * Updates the Firestore document with Google Drive file details
 */
export async function updatePatientDriveInfoInFirestore(
  patientId: string,
  driveInfo: {
    fileId?: string;
    fileName?: string;
    webViewLink?: string;
    folderId?: string;
  }
): Promise<void> {
  console.log('[Firestore] Actualizando documento con enlace de Google Drive:', driveInfo.webViewLink);
  const docRef = doc(db, COLLECTION_NAME, patientId);
  const now = new Date().toISOString();
  const updateData = cleanFirestoreData({
    pdfUrl: driveInfo.webViewLink || null,
    driveFileId: driveInfo.fileId || null,
    driveFileName: driveInfo.fileName || null,
    driveWebViewLink: driveInfo.webViewLink || null,
    driveFolderId: driveInfo.folderId || null,
    driveUploadedAt: now,
    updatedAt: now,
  });
  await setDoc(docRef, updateData, { merge: true });
  console.log('[Firestore] Enlace de Google Drive registrado con éxito en Firestore.');
}

/**
 * Loads all patient questionnaires for reference or local review
 */
export async function getAllQuestionnaires(): Promise<FirestoreQuestionnaireDocument[]> {
  const questionnaires: FirestoreQuestionnaireDocument[] = [];
  const seenIds = new Set<string>();

  // 1. Fetch from Firestore
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
    const snapshot = await getDocs(q);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as Omit<FirestoreQuestionnaireDocument, 'id'>;
      questionnaires.push({
        id: docSnap.id,
        ...data,
      });
      seenIds.add(docSnap.id);
    });
  } catch (error) {
    console.warn('Firestore fetch notice (will fallback to local cache):', error);
  }

  // 2. Merge local submissions or backups if not present in Firestore list
  try {
    const localList: FirestoreQuestionnaireDocument[] = JSON.parse(
      localStorage.getItem('vela_submitted_questionnaires') || '[]'
    );
    for (const item of localList) {
      const docId = item.id || item.patientId;
      if (docId && !seenIds.has(docId)) {
        questionnaires.push(item);
        seenIds.add(docId);
      }
    }
  } catch (err) {
    console.warn('Error reading local cache for questionnaires:', err);
  }

  // Sort descending by updatedAt
  questionnaires.sort((a, b) => {
    const tA = new Date(a.updatedAt || 0).getTime();
    const tB = new Date(b.updatedAt || 0).getTime();
    return tB - tA;
  });

  return questionnaires;
}
