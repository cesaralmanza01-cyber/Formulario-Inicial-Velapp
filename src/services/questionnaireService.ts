import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, storage } from '../firebase';
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
 * Ensures anonymous authentication for the patient to allow secure read/write to Firestore.
 */
export async function ensurePatientAuth(): Promise<string> {
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  const userCredential = await signInAnonymously(auth);
  return userCredential.user.uid;
}

/**
 * Converts a base64 data URL to Blob for upload
 */
function dataURLtoBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Uploads a file to Firebase Storage if not already uploaded,
 * organized in folder: questionnaires/{patientId}/{category}/{fileName}
 */
export async function uploadFileToStorage(
  patientId: string,
  category: 'paraclinicos' | 'inbody',
  file: UploadedLabFile
): Promise<UploadedLabFile> {
  // If it already has a downloadUrl, don't re-upload
  if (file.downloadUrl) {
    return file;
  }

  try {
    let blob: Blob | null = null;
    if (file.dataUrl) {
      blob = dataURLtoBlob(file.dataUrl);
    }

    if (!blob) {
      return file;
    }

    const safeFileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `questionnaires/${patientId}/${category}/${safeFileName}`;
    const storageRef = ref(storage, storagePath);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: file.type || 'application/octet-stream',
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);

    return {
      id: file.id,
      name: file.name,
      size: file.size,
      type: file.type,
      description: file.description || '',
      uploadedAt: file.uploadedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      downloadUrl,
      storagePath,
      // Clear dataUrl after successful upload to keep Firestore doc lightweight
    };
  } catch (error) {
    console.warn('Storage upload error (continuing with local data):', error);
    return file;
  }
}

/**
 * Sanitizes files before saving to Firestore (removes heavy dataUrls, keeps downloadUrls & metadata)
 */
async function processFilesForStorage(
  patientId: string,
  category: 'paraclinicos' | 'inbody',
  files?: UploadedLabFile[]
): Promise<UploadedLabFile[]> {
  if (!files || files.length === 0) return [];

  const processed: UploadedLabFile[] = [];
  for (const f of files) {
    const uploaded = await uploadFileToStorage(patientId, category, f);
    // Strip large dataUrl to avoid hitting Firestore 1MB document limit
    const clean: UploadedLabFile = {
      id: uploaded.id,
      name: uploaded.name,
      size: uploaded.size,
      type: uploaded.type,
      description: uploaded.description || '',
      uploadedAt: uploaded.uploadedAt,
      downloadUrl: uploaded.downloadUrl,
      storagePath: uploaded.storagePath,
    };
    processed.push(clean);
  }
  return processed;
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

  // Process files for Cloud Storage asynchronously if present
  let cleanLabFiles: UploadedLabFile[] = [];
  if (step9?.files && step9.files.length > 0) {
    try {
      cleanLabFiles = await processFilesForStorage(patientId, 'paraclinicos', step9.files);
    } catch (e) {
      console.warn('Error processing lab files for storage', e);
      cleanLabFiles = step9.files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        description: f.description,
        uploadedAt: f.uploadedAt,
      }));
    }
  }

  let cleanInBodyFiles: UploadedLabFile[] = [];
  if (stepInBody?.files && stepInBody.files.length > 0) {
    try {
      cleanInBodyFiles = await processFilesForStorage(patientId, 'inbody', stepInBody.files);
    } catch (e) {
      console.warn('Error processing inBody files for storage', e);
      cleanInBodyFiles = stepInBody.files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
        description: f.description,
        uploadedAt: f.uploadedAt,
      }));
    }
  }

  const docRef = doc(db, COLLECTION_NAME, patientId);
  let existingStartedAt: string | undefined;
  let existingCompletedAt: string | undefined;
  let existingSavedByPatient: boolean | undefined;
  let existingSavedAt: string | undefined;

  try {
    const existingDoc = await getDoc(docRef);
    if (existingDoc.exists()) {
      const data = existingDoc.data();
      existingStartedAt = data?.startedAt;
      existingCompletedAt = data?.completedAt;
      existingSavedByPatient = data?.isSavedByPatient;
      existingSavedAt = data?.savedAt;
    }
  } catch (e) {
    console.warn('Notice reading existing doc:', e);
  }

  const now = new Date().toISOString();
  const startedAt = existingStartedAt || now;
  const isSaved = params.isSavedByPatient ?? existingSavedByPatient ?? false;
  const isDone = params.isComplete || isSaved;
  const status: 'en progreso' | 'completado' = isDone ? 'completado' : 'en progreso';

  const docData: FirestoreQuestionnaireDocument = {
    patientId,
    patientName: step1?.fullName?.trim() || 'Paciente en registro',
    patientDocument: step1?.documentNumber?.trim() || '',
    status,
    isSavedByPatient: isSaved,
    savedAt: isSaved ? (existingSavedAt || now) : undefined,
    currentStep: params.currentStep,
    startedAt,
    updatedAt: now,
    completedAt: isDone ? (existingCompletedAt || now) : undefined,
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

  // 1. Save to Firestore
  await setDoc(docRef, docData, { merge: true });

  // 2. Also keep a local backup in localStorage for resiliency
  try {
    const existingBackups: FirestoreQuestionnaireDocument[] = JSON.parse(
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
 * Uploads a generated questionnaire PDF Blob to Firebase Storage,
 * associates its download URL to the patient Firestore record, and returns the URL.
 */
export async function uploadPatientPdfToStorage(
  patientId: string,
  pdfBlob: Blob,
  patientName?: string
): Promise<string> {
  console.log('[Firebase Storage] Paso 1: Verificando/asegurando sesión de autenticación para subir PDF...');
  try {
    const authUid = await ensurePatientAuth();
    console.log('[Firebase Storage] Sesión autenticada correctamente (UID:', authUid, ')');

    const timestamp = Date.now();
    const cleanName = (patientName || 'paciente').replace(/[^a-zA-Z0-9_-]/g, '_');
    const storagePath = `questionnaires_pdf/${patientId}_${cleanName}_${timestamp}.pdf`;
    const storageRef = ref(storage, storagePath);

    console.log('[Firebase Storage] Paso 2: Subiendo PDF Blob a la ruta de almacenamiento:', storagePath);
    const snapshot = await uploadBytes(storageRef, pdfBlob, {
      contentType: 'application/pdf',
      customMetadata: {
        patientId,
        patientName: patientName || '',
        uploadedAt: new Date().toISOString(),
      },
    });
    console.log('[Firebase Storage] Archivo PDF subido exitosamente a Storage bytesTransferred:', snapshot.metadata?.size || pdfBlob.size);

    console.log('[Firebase Storage] Paso 3: Obteniendo URL pública de descarga...');
    const downloadUrl = await getDownloadURL(snapshot.ref);
    console.log('[Firebase Storage] Paso 4: URL de descarga obtenida con éxito:', downloadUrl);

    // Save URL back to Firestore document
    try {
      console.log('[Firebase Storage] Paso 5: Guardando enlace del PDF en el documento de Firestore...');
      const docRef = doc(db, COLLECTION_NAME, patientId);
      await setDoc(
        docRef,
        {
          pdfUrl: downloadUrl,
          pdfUploadedAt: new Date().toISOString(),
        },
        { merge: true }
      );
      console.log('[Firebase Storage] Enlace de PDF guardado en Firestore correctamente.');
    } catch (firestoreErr) {
      console.warn('[Firebase Storage Notice] No se pudo guardar pdfUrl en Firestore, pero la URL está lista:', firestoreErr);
    }

    return downloadUrl;
  } catch (error: any) {
    console.error('[Firebase Storage Error] Error al subir el PDF a Storage:', error);
    throw new Error(error?.message || 'Error al subir el PDF a Firebase Storage');
  }
}

/**
 * Loads all patient questionnaires for the doctor's administrative panel
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

    // Also check if current browser has active filled draft that can be previewed
    const step1 = getCachedStepData<PatientBasicInfo>('vela_step1_data');
    if (step1 && step1.fullName && questionnaires.length === 0) {
      const draftDoc: FirestoreQuestionnaireDocument = {
        id: 'draft-local-patient',
        patientId: 'draft-local-patient',
        patientName: step1.fullName,
        patientDocument: step1.documentNumber || '',
        status: (localStorage.getItem('vela_current_step') === '11') ? 'completado' : 'en progreso',
        currentStep: parseInt(localStorage.getItem('vela_current_step') || '1', 10),
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        banderas_revisar: [],
        identificacion: step1,
        motivo_objetivos: getCachedStepData<PatientMotivationInfo>('vela_step2_data'),
        relacion_peso: getCachedStepData<PatientWeightHistoryInfo>('vela_step3_data'),
        mapa_salud: getCachedStepData<PatientHealthMapInfo>('vela_step4_data'),
        revision_sistemas: getCachedStepData<PatientBodySymptomsInfo>('vela_step5_data'),
        entrevista_dietetica: getCachedStepData<PatientNutritionInfo>('vela_step6_data'),
        actividad_fisica: getCachedStepData<PatientPhysicalActivityInfo>('vela_step7_data'),
        paraclinicos: getCachedStepData<PatientLabExamsInfo>('vela_step9_data'),
        inbody: getCachedStepData<PatientInBodyInfo>('vela_step10_inbody_data'),
      };
      questionnaires.push(draftDoc);
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

/**
 * Subscribes to real-time updates for doctor dashboard
 */
export function subscribeToQuestionnaires(
  callback: (list: FirestoreQuestionnaireDocument[]) => void
): () => void {
  const q = query(collection(db, COLLECTION_NAME), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const questionnaires: FirestoreQuestionnaireDocument[] = [];
      snapshot.forEach((docSnap) => {
        questionnaires.push({
          id: docSnap.id,
          ...(docSnap.data() as Omit<FirestoreQuestionnaireDocument, 'id'>),
        });
      });
      callback(questionnaires);
    },
    (error) => {
      console.warn('Firestore subscription notice (loading via getAllQuestionnaires):', error);
      // Fallback to fetch
      getAllQuestionnaires().then(callback);
    }
  );
}

