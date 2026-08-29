import React from 'react';
import { motion } from 'motion/react';
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
}) => {
  const patientName = basicInfo?.fullName?.trim() ? basicInfo.fullName.split(' ')[0] : '¡Hola!';
  const whatsappNumber = '+573011417555';
  const cleanNumber = '573011417555';

  const defaultMessage = `Hola equipo Vela, soy ${basicInfo?.fullName || 'paciente de Vela'}. Acabo de completar mi Cuestionario Inicial y me gustaría agendar mi cita médica.`;
  const whatsappUrl = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(defaultMessage)}`;

  // Completed modules count
  const completedModules = [
    { label: 'Identidad y datos generales', done: !!basicInfo?.fullName },
    { label: 'Motivo y objetivos de salud', done: !!motivationInfo?.consultationReason },
    { label: 'Historial y relación con el peso', done: !!weightInfo?.lowestWeightEver || !!weightInfo?.weightFluctuationCount },
    { label: 'Mapa de antecedentes médicos', done: !!healthMapInfo?.medicalHistory },
    { label: 'Revisión corporal y síntomas', done: !!symptomsInfo?.energyPattern },
    { label: 'Patrón de alimentación y hábitos', done: !!nutritionInfo?.mealRoutinePattern },
    { label: 'Movimiento y actividad física', done: !!activityInfo?.dailyActivityType },
    { label: 'Exámenes de laboratorio', done: !!labInfo?.hasRecentLabs },
    { label: 'Registro InBody / Composición', done: !!inBodyInfo?.hasInBodyReport },
  ];

  const totalCompleted = completedModules.filter((m) => m.done).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="space-y-8"
    >
      {/* Top Banner / Badge */}
      <div className="space-y-4 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start border border-[#AEC9C0]/40">
          <CheckCircle2 size={15} className="text-[#5B887E]" />
          <span>Cuestionario completado con éxito • Paso 11 de 11</span>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {patientName !== '¡Hola!' ? `${patientName}, gracias por tu tiempo y confianza` : 'Gracias por tu tiempo y confianza'}
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            Sabemos que responder estas preguntas requiere dedicación. Tu información nos permite encuadrar adecuadamente tu contexto para brindarte una atención médica mucho más humana, profunda y personalizada.
          </p>
        </div>
      </div>

      {/* Main Gratitude & Context Value Card */}
      <div className="bg-white/90 rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/50 shadow-sm space-y-6">
        {/* Empathy message */}
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center shrink-0 shadow-2xs">
            <HeartHandshake className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-semibold text-[#2E3A36]">
              ¿Por qué es tan valioso lo que acabas de responder?
            </h2>
            <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
              En la medicina tradicional, los primeros 30 minutos de una consulta suelen perderse llenando formularios genéricos. En <strong>Vela</strong>, la Dra. Lorena analiza tus respuestas antes de entrar a tu cita para:
            </p>
          </div>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
          <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#2E3A36]">Atención 100% personalizada</p>
            <p className="text-[11px] text-[#5C6E68] leading-relaxed">
              Adaptamos cada recomendación a tus hábitos reales, horarios de trabajo y preferencias.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#2E3A36]">Consultas enfocadas y sin prisas</p>
            <p className="text-[11px] text-[#5C6E68] leading-relaxed">
              Dedicamos el tiempo a escucharte, resolver dudas y trazar tu plan médico conjunto.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] space-y-1.5">
            <div className="w-7 h-7 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-[#2E3A36]">Evitamos exámenes repetitivos</p>
            <p className="text-[11px] text-[#5C6E68] leading-relaxed">
              Aprovechamos tus paraclínicos e InBody recientes para ordenar solo lo estrictamente necesario.
            </p>
          </div>
        </div>

        {/* Automatic Data Saved Reassurance Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#EBF3F0] border border-[#5B887E]/30 text-[#2E3A36] space-y-2">
          <div className="flex items-center gap-2.5 text-[#5B887E] font-semibold text-xs sm:text-sm">
            <CheckCircle2 className="w-4 h-4 text-[#5B887E] shrink-0" />
            <span>Tus datos ya quedaron guardados automáticamente en la memoria del sistema</span>
          </div>
          <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
            <strong>No necesitas dar clic en guardar, enviar ni preocuparte por cerrar la ventana.</strong> Cada una de tus respuestas y archivos adjuntos ya quedaron registrados de manera segura y están listos para la revisión de tu médica. Puedes pasar con total tranquilidad a agendar tu cita a continuación.
          </p>
        </div>

        {/* Security & Privacy Reassurance */}
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/40 text-xs text-[#2E3A36]">
          <ShieldCheck className="w-4 h-4 text-[#5B887E] shrink-0" />
          <span className="text-[11px] sm:text-xs">
            Toda tu información está resguardada bajo estricta confidencialidad médica y lista para ser revisada por tu médica tratante.
          </span>
        </div>
      </div>

      {/* Primary WhatsApp Scheduling CTA Card */}
      <div className="bg-linear-to-br from-[#FDFBF7] to-[#F3F8F5] rounded-3xl p-6 sm:p-8 border-2 border-[#5B887E]/30 shadow-md space-y-6 text-center sm:text-left relative overflow-hidden">
        <div className="relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#E5F7ED] text-[#1E7E48] text-xs font-bold uppercase tracking-wider">
                <CalendarCheck className="w-3.5 h-3.5" />
                <span>Siguiente paso disponible</span>
              </span>
              <h2
                className="text-xl sm:text-2xl text-[#2E3A36] font-semibold pt-1"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                ¡Ya completaste el cuestionario! Ahora puedes agendar tu cita
              </h2>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-[#5C6E68] max-w-xl leading-relaxed">
            Escríbenos directamente a nuestra línea de WhatsApp institucional de <strong>Vela</strong> para coordinar la fecha, hora y modalidad que mejor se adapte a tu agenda.
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
              id="btn-view-summary-modal"
              onClick={onViewSummary}
              className="w-full sm:w-auto px-5 py-4 rounded-2xl bg-white border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
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

      {/* Navigation & Summary preview button footer */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-[#5B887E]" />
          <span>Volver a revisar datos anteriores</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-[#5C6E68]">
          <VelaIcon size={14} />
          <span>Vela — Manejo médico e integral del sobrepeso y la obesidad</span>
        </div>
      </div>
    </motion.div>
  );
};
