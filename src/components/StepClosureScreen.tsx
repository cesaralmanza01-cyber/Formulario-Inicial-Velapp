import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  HeartHandshake,
  CalendarCheck,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Clock,
  UserCheck,
  ExternalLink,
  MessageCircle,
  Save,
  Send,
  Lock,
  FileCheck2,
  Activity,
  Scale,
  Stethoscope,
  ChevronRight,
  RotateCcw,
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
} from '../types';

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
  const [isSaved, setIsSaved] = useState<boolean>(() => {
    return localStorage.getItem('vela_patient_has_saved') === 'true';
  });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const patientFullName = basicInfo?.fullName?.trim() || '';
  const patientFirstName = patientFullName ? patientFullName.split(' ')[0] : '¡Hola!';
  const whatsappNumber = '+573011417555';
  const cleanNumber = '573011417555';

  const defaultMessage = `Hola equipo Vela, soy ${patientFullName || 'paciente de Vela'}. Ya completé y guardé mi Cuestionario Inicial en la plataforma. Me gustaría coordinar la fecha y hora de mi cita médica con la Dra. Lorena Castro.`;
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;

  const handleSaveClick = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await onSaveQuestionnaire();
      setIsSaved(true);
      localStorage.setItem('vela_patient_has_saved', 'true');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      console.error('Error saving questionnaire:', err);
      setSaveError('Hubo un inconveniente al guardar. Por favor intenta de nuevo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Modules summary checklist
  const modules = [
    {
      id: 1,
      title: 'Datos de Identificación',
      desc: basicInfo?.fullName ? `${basicInfo.fullName} • ${basicInfo.documentType || 'CC'} ${basicInfo.documentNumber || ''}` : 'Datos básicos',
      done: !!basicInfo?.fullName,
      icon: UserCheck,
    },
    {
      id: 2,
      title: 'Motivo y Metas',
      desc: motivationInfo?.consultationReason ? `Motivo: "${motivationInfo.consultationReason.slice(0, 45)}..."` : 'Motivo registrado',
      done: !!motivationInfo?.consultationReason,
      icon: HeartHandshake,
    },
    {
      id: 3,
      title: 'Historial y Relación con el Peso',
      desc: weightInfo?.currentWeightKg ? `Peso actual: ${weightInfo.currentWeightKg} kg • Talla: ${weightInfo.heightCm || '—'} cm` : 'Historial registrado',
      done: !!weightInfo?.currentWeightKg || !!weightInfo?.lowestWeightEver,
      icon: Scale,
    },
    {
      id: 4,
      title: 'Mapa de Salud y Antecedentes',
      desc: healthMapInfo?.medicalHistory ? 'Antecedentes patológicos y gineco-obstétricos' : 'Antecedentes registrados',
      done: true,
      icon: Stethoscope,
    },
    {
      id: 5,
      title: 'Revisión por Sistemas y Síntomas',
      desc: 'Energía, digestivo, músculos, estrés y descanso',
      done: true,
      icon: Activity,
    },
    {
      id: 6,
      title: 'Hábitos y Patrón de Alimentación',
      desc: nutritionInfo?.favoriteFoods ? 'Rutina de comidas y preferencias alimentarias' : 'Entrevista nutricional',
      done: true,
      icon: Sparkles,
    },
    {
      id: 7,
      title: 'Movimiento y Actividad Física',
      desc: activityInfo?.dailyActivityType || 'Actividad física diaria y ejercicio estructurado',
      done: true,
      icon: Activity,
    },
    {
      id: 9,
      title: 'Exámenes de Laboratorio',
      desc: labInfo?.files && labInfo.files.length > 0 ? `${labInfo.files.length} archivo(s) de laboratorio adjuntos` : 'Paraclínicos (o sin exámenes recientes)',
      done: true,
      icon: FileCheck2,
    },
    {
      id: 10,
      title: 'Reporte InBody / Bioimpedancia',
      desc: inBodyInfo?.files && inBodyInfo.files.length > 0 ? 'Reporte InBody adjuntado con métricas' : 'Composición corporal registrada',
      done: true,
      icon: Activity,
    },
  ];

  return (
    <div className="space-y-8">
      <AnimatePresence mode="wait">
        {/* ========================================================================= */}
        {/* FASE 1: PASO INTERMEDIO - GUARDAR Y ENVIAR CUESTIONARIO MÉDICO           */}
        {/* ========================================================================= */}
        {!isSaved ? (
          <motion.div
            key="stage-intermediate-save"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FAF0E6] text-[#A2622D] text-xs font-semibold self-start border border-[#A2622D]/30">
                <Clock size={14} className="text-[#A2622D]" />
                <span>Paso 11 de 11 • Paso previo: Guardar y enviar cuestionario</span>
              </div>

              <div className="space-y-1.5">
                <h1
                  className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {patientFirstName !== '¡Hola!'
                    ? `${patientFirstName}, estás a un paso de completar tu registro`
                    : 'Estás a un paso de completar tu registro'}
                </h1>
                <p className="text-xs sm:text-sm text-[#5C6E68] max-w-2xl leading-relaxed">
                  Has respondido todas las secciones del cuestionario inicial. Haz clic en el botón <strong>"Guardar y Enviar Cuestionario"</strong> para transmitir de forma segura tus datos a la Dra. Lorena Castro y habilitar el agendamiento de tu cita.
                </p>
              </div>
            </div>

            {/* Completed Modules Card */}
            <div className="bg-white/90 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/50 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-[#2E3A36]">
                      Resumen de tus 9 secciones completadas
                    </h2>
                    <p className="text-[11px] text-[#5C6E68]">Toda tu información está lista para ser enviada</p>
                  </div>
                </div>

                <button
                  type="button"
                  id="btn-preview-summary-stage1"
                  onClick={onViewSummary}
                  className="text-xs text-[#5B887E] hover:text-[#477369] font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ver detalle completo</span>
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
                      <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0 mt-0.5">
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
                <ShieldCheck className="w-4 h-4 text-[#5B887E] shrink-0" />
                <p className="text-[11px]">
                  Al guardar, tus respuestas se transfieren de manera encriptada y confidencial al panel médico exclusivo de <strong>Vela</strong>.
                </p>
              </div>
            </div>

            {saveError && (
              <div className="p-3.5 rounded-2xl bg-[#FFF8F6] border border-[#F2A488] text-xs text-[#C66A4D]">
                {saveError}
              </div>
            )}

            {/* Main SAVE Button Action Box */}
            <div className="bg-linear-to-br from-[#FDFBF7] to-[#EBF3F0] rounded-3xl p-6 sm:p-8 border-2 border-[#5B887E]/40 shadow-md text-center space-y-4">
              <div className="max-w-md mx-auto space-y-1.5">
                <h3
                  className="text-lg sm:text-xl text-[#2E3A36] font-semibold"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Guardar respuestas y continuar al agendamiento
                </h3>
                <p className="text-xs text-[#5C6E68] leading-relaxed">
                  Haz clic a continuación para registrar formalmente tu historia en el sistema médico. En el siguiente paso podrás agendar tu cita por WhatsApp.
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  id="btn-save-questionnaire"
                  onClick={handleSaveClick}
                  disabled={isSaving}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#5B887E] hover:bg-[#477369] text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Guardando y enviando al panel médico...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>Guardar y Enviar Cuestionario</span>
                      <ChevronRight className="w-4 h-4 opacity-80" />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onViewSummary}
                  className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-white border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#FAF6F0] font-medium text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-[#5B887E]" />
                  <span>Revisar respuestas antes de enviar</span>
                </button>
              </div>
            </div>

            {/* Back button */}
            <div className="pt-2 flex items-center justify-between text-xs text-[#5C6E68]">
              <button
                type="button"
                onClick={onBack}
                className="px-4 py-2 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#5B887E]" />
                <span>Volver a corregir sección anterior</span>
              </button>

              <div className="flex items-center gap-2">
                <VelaIcon size={14} />
                <span className="hidden sm:inline">Vela • Dra. Lorena Castro</span>
              </div>
            </div>
          </motion.div>
        ) : (
          /* ========================================================================= */
          /* FASE 2: PASO FINAL - CUESTIONARIO GUARDADO Y AGENDAR POR WHATSAPP          */
          /* ========================================================================= */
          <motion.div
            key="stage-final-whatsapp"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="space-y-8"
          >
            {/* Top Success Banner */}
            <div className="space-y-4 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E5F7ED] text-[#1E7E48] text-xs font-semibold self-start border border-[#1E7E48]/20 shadow-2xs">
                <CheckCircle2 size={15} className="text-[#1E7E48]" />
                <span>✓ Cuestionario guardado exitosamente en el panel médico</span>
              </div>

              <div className="space-y-2">
                <h1
                  className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {patientFirstName !== '¡Hola!'
                    ? `¡Listo, ${patientFirstName}! Tus datos ya están con la Dra. Lorena`
                    : '¡Listo! Tus datos ya están en el panel médico'}
                </h1>
                <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
                  Tu historia clínica inicial y tus exámenes adjuntos quedaron registrados de forma segura y están listos para la revisión de la Dra. Lorena Castro. Ahora, el paso final es agendar tu consulta.
                </p>
              </div>
            </div>

            {/* Gratitude & Value Card */}
            <div className="bg-white/90 rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/50 shadow-sm space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0 shadow-2xs">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-base sm:text-lg font-semibold text-[#2E3A36]">
                    ¿Por qué es tan valioso lo que acabas de guardar?
                  </h2>
                  <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
                    Al haber completado este cuestionario antes de tu cita, la Dra. Lorena podrá analizar previamente tus antecedentes, hábitos y composición corporal. Así, la consulta se enfocará directamente en escucharte y construir tu plan integral sin pérdidas de tiempo.
                  </p>
                </div>
              </div>

              {/* 3 Value Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#2E3A36]">Atención 100% personalizada</p>
                  <p className="text-[11px] text-[#5C6E68] leading-relaxed">
                    Adaptamos cada recomendación a tus hábitos reales, horarios y preferencias.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#2E3A36]">Consultas enfocadas y sin prisas</p>
                  <p className="text-[11px] text-[#5C6E68] leading-relaxed">
                    Dedicamos el tiempo a escucharte, resolver dudas y definir tu tratamiento médico.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
                  <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-[#2E3A36]">Exámenes aprovechados</p>
                  <p className="text-[11px] text-[#5C6E68] leading-relaxed">
                    Revisamos tus laboratorios e InBody previos para evitar solicitudes repetitivas.
                  </p>
                </div>
              </div>
            </div>

            {/* Primary WhatsApp Scheduling CTA Card */}
            <div className="bg-linear-to-br from-[#FDFBF7] to-[#F3F8F5] rounded-3xl p-6 sm:p-8 border-2 border-[#5B887E]/30 shadow-md space-y-6 text-center sm:text-left relative overflow-hidden">
              <div className="relative z-10 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F7ED] text-[#1E7E48] text-xs font-bold uppercase tracking-wider">
                      <CalendarCheck className="w-3.5 h-3.5" />
                      <span>Paso final disponible</span>
                    </span>
                    <h2
                      className="text-xl sm:text-2xl text-[#2E3A36] font-semibold pt-1"
                      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                      Agendar tu consulta médica por WhatsApp
                    </h2>
                  </div>
                </div>

                <p className="text-xs sm:text-sm text-[#5C6E68] max-w-xl leading-relaxed">
                  Escríbenos directamente a la línea institucional de WhatsApp de <strong>Vela</strong> para coordinar la fecha, hora y modalidad que mejor se adapte a tu agenda.
                </p>

                {/* Action WhatsApp Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                  <a
                    id="btn-whatsapp-agendar"
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-7 py-4 rounded-2xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-3 group cursor-pointer"
                  >
                    {/* WhatsApp Icon SVG */}
                    <svg
                      className="w-5 h-5 fill-current text-white shrink-0 group-hover:scale-110 transition-transform"
                      viewBox="0 0 24 24"
                    >
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                    </svg>
                    <span>Agendar cita por WhatsApp</span>
                    <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100" />
                  </a>

                  <button
                    type="button"
                    id="btn-view-summary-modal-saved"
                    onClick={onViewSummary}
                    className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-white border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                  >
                    <FileText className="w-4 h-4 text-[#5B887E]" />
                    <span>Ver resumen de mis respuestas</span>
                  </button>
                </div>

                {/* Contact note */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-3 text-xs text-[#5C6E68]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#2E3A36]">
                    <MessageCircle className="w-4 h-4 text-[#5B887E]" />
                    <span>Línea directa: {whatsappNumber}</span>
                  </span>
                  <span className="hidden sm:inline text-[#AEC9C0]">•</span>
                  <span>Respuesta en horario hábil</span>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsSaved(false)}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-[#AEC9C0] text-[#5C6E68] hover:text-[#2E3A36] hover:bg-[#EBF3F0] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#5B887E]" />
                <span>Ver pantalla de confirmación o volver a editar</span>
              </button>

              <div className="flex items-center gap-2 text-xs text-[#5C6E68]">
                <VelaIcon size={14} />
                <span>Vela — Manejo médico e integral del sobrepeso y la obesidad</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
