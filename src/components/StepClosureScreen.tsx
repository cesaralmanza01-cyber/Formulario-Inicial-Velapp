import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  CalendarCheck,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Clock,
  UserCheck,
  HeartHandshake,
  Download,
  Share2,
  Loader2,
  Scale,
  Activity,
  FileCheck2,
  Stethoscope,
  ExternalLink,
  MessageCircle,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { VelaIcon } from './VelaIcon';
import {
  PatientBasicInfo,
  PatientMotivationInfo,
  PatientWeightHistoryInfo,
  PatientHealthMapInfo,
  PatientBodySymptomsInfo,
  PatientNutritionInfo,
  PatientPhysicalActivityInfo,
  PatientLabExamsInfo,
  PatientInBodyInfo,
  FirestoreQuestionnaireDocument,
} from '../types';
import {
  generatePatientQuestionnairePdfBlob,
  downloadPatientRecordPdf,
} from '../utils/pdfGenerator';
import { uploadPatientPdfToStorage } from '../services/questionnaireService';

interface StepClosureScreenProps {
  basicInfo?: PatientBasicInfo | null;
  motivationInfo?: PatientMotivationInfo | null;
  weightInfo?: PatientWeightHistoryInfo | null;
  healthMapInfo?: PatientHealthMapInfo | null;
  symptomsInfo?: PatientBodySymptomsInfo | null;
  nutritionInfo?: PatientNutritionInfo | null;
  activityInfo?: PatientPhysicalActivityInfo | null;
  labInfo?: PatientLabExamsInfo | null;
  inBodyInfo?: PatientInBodyInfo | null;
  onBack: () => void;
  onViewSummary: () => void;
  onSaveQuestionnaire: () => Promise<void>;
}

export const StepClosureScreen: React.FC<StepClosureScreenProps> = ({
  basicInfo,
  motivationInfo,
  weightInfo,
  healthMapInfo,
  symptomsInfo,
  nutritionInfo,
  activityInfo,
  labInfo,
  inBodyInfo,
  onBack,
  onViewSummary,
  onSaveQuestionnaire,
}) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(true);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState<boolean>(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [publicPdfUrl, setPublicPdfUrl] = useState<string>('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [directWaLink, setDirectWaLink] = useState<string | null>(null);

  const patientFullName = basicInfo?.fullName?.trim() || 'Paciente';
  const patientFirstName = patientFullName !== 'Paciente' ? patientFullName.split(' ')[0] : '¡Hola!';
  const whatsappNumber = '+57 301 141 7555';
  const cleanPhone = '573011417555';

  // Construct complete patient document object for PDF and persistence
  const buildPatientDocument = (): FirestoreQuestionnaireDocument => {
    return {
      patientId: basicInfo?.documentNumber || 'paciente-vela',
      patientName: patientFullName,
      patientDocument: basicInfo?.documentNumber || '',
      status: 'completado',
      isSavedByPatient: true,
      currentStep: 11,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      banderas_revisar: [],
      identificacion: basicInfo || null,
      motivo_objetivos: motivationInfo || null,
      relacion_peso: weightInfo || null,
      mapa_salud: healthMapInfo || null,
      revision_sistemas: symptomsInfo || null,
      entrevista_dietetica: nutritionInfo || null,
      actividad_fisica: activityInfo || null,
      paraclinicos: labInfo || null,
      inbody: inBodyInfo || null,
    };
  };

  // Automatic PDF generation and initial background sync on arrival
  useEffect(() => {
    let isMounted = true;

    async function initPdfFlow() {
      console.log('[Flujo Inicial] Paso 1: Iniciando compilación de PDF en pantalla de cierre...');
      try {
        setIsGeneratingPdf(true);
        setErrorMessage(null);
        const patientDoc = buildPatientDocument();

        // 1. Generate in-memory PDF Blob
        console.log('[Flujo Inicial] Paso 2: Construyendo documento jsPDF...');
        const blob = await generatePatientQuestionnairePdfBlob(patientDoc);
        if (isMounted) {
          setPdfBlob(blob);
          console.log('[Flujo Inicial] Paso 3: Blob listo en memoria (tamaño:', blob.size, 'bytes)');
        }

        // 2. Save questionnaire to Firestore as backup
        try {
          console.log('[Flujo Inicial] Paso 4: Guardando respaldo de respuestas en Firestore...');
          await onSaveQuestionnaire();
          console.log('[Flujo Inicial] Paso 5: Respuestas guardadas en Firestore exitosamente.');
        } catch (e) {
          console.warn('[Flujo Inicial Notice] Respaldo Firestore (aviso):', e);
        }

        // 3. Pre-upload PDF to Firebase Storage in background for WhatsApp link
        try {
          console.log('[Flujo Inicial] Paso 6: Subiendo PDF a Firebase Storage para generar enlace público...');
          const downloadUrl = await uploadPatientPdfToStorage(
            patientDoc.patientId,
            blob,
            patientDoc.patientName
          );
          if (isMounted && downloadUrl) {
            setPublicPdfUrl(downloadUrl);
            console.log('[Flujo Inicial] Paso 7: Enlace de PDF público listo:', downloadUrl);
          }
        } catch (storageErr: any) {
          console.warn('[Flujo Inicial Notice] Subida previa a Storage (se reintentará al enviar):', storageErr);
        }
      } catch (err: any) {
        console.error('[Flujo Inicial Error] Error al generar PDF inicial:', err);
        if (isMounted) {
          setErrorMessage(`No se pudo generar el PDF automáticamente: ${err?.message || 'Error desconocido'}. Puedes reintentar.`);
        }
      } finally {
        if (isMounted) {
          setIsGeneratingPdf(false);
        }
      }
    }

    initPdfFlow();

    return () => {
      isMounted = false;
    };
  }, []);

  // Handler for "Descargar mi PDF"
  const handleDownloadPdf = async () => {
    console.log('[Descarga PDF] Iniciando descarga manual de PDF por la paciente...');
    setIsDownloadingPdf(true);
    setErrorMessage(null);
    try {
      const patientDoc = buildPatientDocument();
      await downloadPatientRecordPdf(patientDoc);
      console.log('[Descarga PDF] Descarga completada exitosamente.');
      setStatusMessage('¡Tu PDF se ha descargado correctamente en tu dispositivo!');
      setTimeout(() => setStatusMessage(null), 6000);
    } catch (err: any) {
      console.error('[Descarga PDF Error] Error al descargar PDF:', err);
      // Fallback using stored Blob
      if (pdfBlob) {
        try {
          console.log('[Descarga PDF] Intentando fallback con Blob generado...');
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Cuestionario_Inicial_Vela_${patientFullName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          setStatusMessage('¡Tu PDF se ha descargado correctamente!');
          setTimeout(() => setStatusMessage(null), 6000);
        } catch (blobErr: any) {
          setErrorMessage(`No se pudo descargar el archivo: ${blobErr?.message || err?.message}`);
        }
      } else {
        setErrorMessage(`Error al descargar el PDF: ${err?.message || 'Por favor reintenta en unos momentos'}.`);
      }
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Handler for "Enviar y agendar por WhatsApp"
  const handleSendAndScheduleWhatsApp = async () => {
    console.log('[WhatsApp Flow] ========================================');
    console.log('[WhatsApp Flow] Paso 1: Usuario hizo clic en "Enviar y agendar por WhatsApp"');
    setIsSharingWhatsApp(true);
    setErrorMessage(null);
    setDirectWaLink(null);

    const fileName = `Cuestionario_Inicial_Vela_${patientFullName.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    let currentBlob = pdfBlob;

    try {
      // 1. Ensure PDF Blob is generated (await generation if not ready)
      if (!currentBlob) {
        console.log('[WhatsApp Flow] Paso 2: Generando PDF Blob en tiempo real...');
        const patientDoc = buildPatientDocument();
        currentBlob = await generatePatientQuestionnairePdfBlob(patientDoc);
        setPdfBlob(currentBlob);
        console.log('[WhatsApp Flow] Paso 2 completado: Blob generado exitosamente.');
      }

      // 2. Ensure PDF is uploaded to Firebase Storage and get public URL
      let pdfUrlToUse = publicPdfUrl;
      if (!pdfUrlToUse) {
        console.log('[WhatsApp Flow] Paso 3: Subiendo PDF a Firebase Storage para obtener URL de descarga...');
        try {
          const patientDoc = buildPatientDocument();
          const uploadedUrl = await uploadPatientPdfToStorage(
            patientDoc.patientId,
            currentBlob,
            patientDoc.patientName
          );
          if (uploadedUrl) {
            pdfUrlToUse = uploadedUrl;
            setPublicPdfUrl(uploadedUrl);
            console.log('[WhatsApp Flow] Paso 4: URL de PDF obtenida de Storage:', uploadedUrl);
          }
        } catch (uploadErr: any) {
          console.warn('[WhatsApp Flow Notice] Error al subir a Storage:', uploadErr);
          setErrorMessage('Aviso: No se pudo subir el PDF a la nube temporalmente, pero continuaremos abriendo WhatsApp para tu agendamiento.');
        }
      } else {
        console.log('[WhatsApp Flow] Paso 4: Reutilizando URL de PDF previamente subida:', pdfUrlToUse);
      }

      // 3. Try Web Share API on mobile devices if supported
      let didShareFile = false;
      try {
        const file = new File([currentBlob], fileName, { type: 'application/pdf' });
        const shareData = {
          title: 'Cuestionario Inicial Vela',
          text: `Hola Dra. Lorena / equipo Vela, soy ${patientFullName}. Adjunto mi Cuestionario Médico Inicial diligenciado. Quiero agendar mi primera cita.${pdfUrlToUse ? ` Enlace de respaldo: ${pdfUrlToUse}` : ''}`,
          files: [file],
        };

        if (
          navigator.canShare &&
          navigator.canShare(shareData) &&
          navigator.share
        ) {
          console.log('[WhatsApp Flow] Intentando compartir archivo mediante Web Share API...');
          await navigator.share(shareData);
          console.log('[WhatsApp Flow] Archivo compartido mediante Web Share API exitosamente.');
          didShareFile = true;
          setIsSharingWhatsApp(false);
          return;
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          console.log('[WhatsApp Flow] El usuario canceló el selector de compartir.');
          setIsSharingWhatsApp(false);
          return;
        }
        console.warn('[WhatsApp Flow Notice] Web Share no disponible o descartado, procediendo con enlace directo wa.me:', shareErr);
      }

      // 4. Construct WhatsApp Message URL
      console.log('[WhatsApp Flow] Paso 5: Construyendo mensaje y enlace de WhatsApp...');
      let message = `Hola Dra. Lorena y equipo Vela, soy ${patientFullName}. Ya completé mi Cuestionario Inicial`;
      if (pdfUrlToUse) {
        message += `. Puedes ver mi información y PDF médico aquí: ${pdfUrlToUse}`;
      } else {
        message += ` con mi información y antecedentes de salud`;
      }
      message += `. Me gustaría agendar mi primera consulta. ¡Gracias!`;

      const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      console.log('[WhatsApp Flow] Paso 6: Abriendo WhatsApp con enlace:', waLink);

      setDirectWaLink(waLink);

      // Open WhatsApp in new tab
      const newTab = window.open(waLink, '_blank', 'noopener,noreferrer');
      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        console.warn('[WhatsApp Flow] La ventana emergente pudo haber sido bloqueada por el navegador.');
        setStatusMessage('Si WhatsApp no se abrió automáticamente, haz clic en el botón de acceso directo abajo.');
      } else {
        setStatusMessage('¡Conectando con WhatsApp de Vela!');
        setTimeout(() => setStatusMessage(null), 6000);
      }
    } catch (flowErr: any) {
      console.error('[WhatsApp Flow Error] Error en el flujo de WhatsApp:', flowErr);
      setErrorMessage(`Ocurrió un error al preparar el agendamiento: ${flowErr?.message || 'Error inesperado'}.`);
    } finally {
      setIsSharingWhatsApp(false);
      console.log('[WhatsApp Flow] ========================================');
    }
  };

  // Modules summary checklist
  const modules = [
    {
      id: 1,
      title: '1. Identificación y Contacto',
      desc: basicInfo?.fullName ? `${basicInfo.fullName} • ${basicInfo.documentType || 'CC'} ${basicInfo.documentNumber || ''}` : 'Datos básicos registrados',
      icon: UserCheck,
    },
    {
      id: 2,
      title: '2. Motivo y Objetivos',
      desc: motivationInfo?.consultationReason ? `Motivo: "${motivationInfo.consultationReason.slice(0, 45)}..."` : 'Metas y expectativas registradas',
      icon: HeartHandshake,
    },
    {
      id: 3,
      title: '3. Relación con el Peso',
      desc: weightInfo?.currentWeightKg ? `Peso actual: ${weightInfo.currentWeightKg} kg • Talla: ${weightInfo.heightCm || '—'} cm` : 'Historial de peso registrado',
      icon: Scale,
    },
    {
      id: 4,
      title: '4. Mapa de Salud y Antecedentes',
      desc: healthMapInfo?.pathologicalHistory ? 'Antecedentes patológicos y gineco-obstétricos' : 'Antecedentes médicos completos',
      icon: Stethoscope,
    },
    {
      id: 5,
      title: '5. Revisión por Sistemas',
      desc: 'Patrón de energía, digestivo, músculos, estrés y descanso',
      icon: Activity,
    },
    {
      id: 6,
      title: '6. Entrevista Dietética',
      desc: nutritionInfo?.favoriteFoods ? 'Rutina de comidas y preferencias' : 'Hábitos alimentarios registrados',
      icon: Sparkles,
    },
    {
      id: 7,
      title: '7. Actividad Física',
      desc: activityInfo?.dailyActivityType || 'Movimiento diario y ejercicio estructurado',
      icon: Activity,
    },
    {
      id: 8,
      title: '8. InBody / Bioimpedancia',
      desc: inBodyInfo?.files && inBodyInfo.files.length > 0 ? `${inBodyInfo.files.length} archivo(s) InBody adjuntos` : 'Composición corporal registrada',
      icon: Activity,
    },
    {
      id: 9,
      title: '9. Paraclínicos y Laboratorios',
      desc: labInfo?.files && labInfo.files.length > 0 ? `${labInfo.files.length} archivo(s) de laboratorio adjuntos` : 'Exámenes paraclínicos registrados',
      icon: FileCheck2,
    },
  ];

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header with Title and Subtitle */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F0] text-[#6E9E93] text-xs font-semibold self-start border border-[#6E9E93]/20 shadow-2xs">
          <VelaIcon size={14} />
          <span>Paso final • Registro y Agendamiento</span>
        </div>

        <div className="space-y-1.5">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            ¡Ya casi terminamos!
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            Envíanos tu información y agenda tu primera cita con la Dra. Lorena Castro.
          </p>
        </div>
      </div>

      {/* Main Action Hub Card */}
      <div className="bg-linear-to-br from-[#FAF6F0] to-[#F2F8F5] rounded-3xl p-6 sm:p-8 border-2 border-[#6E9E93]/40 shadow-sm space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#6E9E93] text-white flex items-center justify-center shrink-0 shadow-xs">
            {isGeneratingPdf ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1">
            <h2
              className="text-lg sm:text-xl font-semibold text-[#2E3A36]"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              {isGeneratingPdf
                ? 'Preparando tu PDF médico...'
                : patientFirstName !== '¡Hola!'
                ? `${patientFirstName}, tu PDF médico está listo`
                : 'Tu PDF médico está listo'}
            </h2>
            <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
              {isGeneratingPdf
                ? 'Estamos compilando todas tus respuestas, antecedentes y exámenes en un documento PDF clínico con la identidad de Vela.'
                : 'Hemos compilado todas tus respuestas, antecedentes y exámenes en un documento PDF clínico listo para tu consulta.'}
            </p>
          </div>
        </div>

        {/* Loading Indicator Banner */}
        {isGeneratingPdf && (
          <div className="p-3.5 rounded-2xl bg-[#EBF3F0] border border-[#6E9E93]/30 text-xs sm:text-sm text-[#5B887E] flex items-center gap-3">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#6E9E93]" />
            <span>Generando documento PDF y verificando almacenamiento...</span>
          </div>
        )}

        {/* Status notification banner */}
        <AnimatePresence>
          {statusMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="p-3.5 rounded-2xl bg-[#E5F7ED] border border-[#1E7E48]/25 text-[#1E7E48] text-xs sm:text-sm font-medium flex items-center gap-2.5 shadow-2xs"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#1E7E48]" />
              <span>{statusMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-[#FDEEE9] border border-[#F2A488] text-xs sm:text-sm text-[#C66A4D] flex items-start gap-2.5 shadow-2xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">Información del proceso</p>
              <p>{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Fallback Direct Link Button if popups blocked */}
        {directWaLink && (
          <div className="p-3.5 rounded-2xl bg-[#EAF1F8] border border-[#8FAFD1]/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#2E3A36]">
            <span>Si WhatsApp no abrió automáticamente:</span>
            <a
              href={directWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[#6E9E93] hover:bg-[#5B887E] text-white font-semibold rounded-xl inline-flex items-center gap-1.5 transition-colors shrink-0"
            >
              <span>Abrir WhatsApp directamente</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
          {/* Action Button 1: Enviar y agendar por WhatsApp (Coral #F2A488) */}
          <button
            type="button"
            id="btn-whatsapp-send-schedule"
            onClick={handleSendAndScheduleWhatsApp}
            disabled={isSharingWhatsApp}
            className="flex-1 px-6 py-4 rounded-2xl bg-[#F2A488] hover:bg-[#E28D70] active:scale-[0.99] text-[#2E3A36] font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
          >
            {isSharingWhatsApp ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-[#2E3A36]" />
                <span>Preparando y conectando con WhatsApp...</span>
              </>
            ) : (
              <>
                {/* WhatsApp Logo */}
                <svg className="w-5 h-5 fill-[#2E3A36] shrink-0" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Enviar y agendar por WhatsApp</span>
              </>
            )}
          </button>

          {/* Action Button 2: Descargar mi PDF (Salvia #6E9E93 / Borde) */}
          <button
            type="button"
            id="btn-download-my-pdf"
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            className="sm:w-auto px-6 py-4 rounded-2xl bg-white border-2 border-[#6E9E93] text-[#2E3A36] hover:bg-[#EBF3F0] font-semibold text-sm sm:text-base shadow-2xs hover:shadow-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            {isDownloadingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#6E9E93]" />
            ) : (
              <Download className="w-4 h-4 text-[#6E9E93]" />
            )}
            <span>{isDownloadingPdf ? 'Generando descarga...' : 'Descargar mi PDF'}</span>
          </button>
        </div>

        {/* WhatsApp Line Note */}
        <div className="pt-1 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#5C6E68] border-t border-[#E8E2D8] pt-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#6E9E93]" />
            <span>Línea institucional: <strong className="text-[#2E3A36]">{whatsappNumber}</strong></span>
          </div>
          <span className="text-[11px] text-[#8E9E99]">Respaldo seguro guardado en Firestore</span>
        </div>
      </div>

      {/* Summary of 9 Sections Card */}
      <div className="bg-white/90 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/50 shadow-xs space-y-5">
        <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-[#2E3A36]">
              Resumen de tu información registrada
            </h2>
            <p className="text-[11px] text-[#5C6E68]">
              Todas las secciones se encuentran organizadas y listas en tu PDF
            </p>
          </div>

          <button
            type="button"
            id="btn-preview-summary-closure"
            onClick={onViewSummary}
            className="text-xs text-[#6E9E93] hover:text-[#5B887E] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver respuestas</span>
          </button>
        </div>

        {/* Grid of Sections */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {modules.map((mod) => {
            const Icon = mod.icon;
            return (
              <div
                key={mod.id}
                className="p-3 rounded-2xl bg-[#FAF6F0]/80 border border-[#E8E2D8] flex items-start gap-3 text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#6E9E93] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs font-semibold text-[#2E3A36] truncate">{mod.title}</p>
                    <span className="text-[10px] text-[#1E7E48] font-bold shrink-0">✓ Listo</span>
                  </div>
                  <p className="text-[11px] text-[#5C6E68] truncate mt-0.5">{mod.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Notice & Security */}
        <div className="p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/40 flex items-center gap-2.5 text-xs text-[#5C6E68]">
          <ShieldCheck className="w-4 h-4 text-[#6E9E93] shrink-0" />
          <p className="text-[11px]">
            Tus datos de salud y archivos adjuntos quedan protegidos bajo estricto secreto médico y confidencialidad clínica.
          </p>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#AEC9C0] text-[#5C6E68] hover:text-[#2E3A36] hover:bg-[#EBF3F0] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#6E9E93]" />
          <span>Volver al paso anterior</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#5C6E68]">
          <VelaIcon size={14} />
          <span>Vela • Dra. Lorena Castro</span>
        </div>
      </div>
    </div>
  );
};
