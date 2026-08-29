import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  HeartHandshake,
  Compass,
  Sparkles,
  Mountain,
  ArrowRight,
  ArrowLeft,
  Info,
  PenLine,
} from 'lucide-react';
import { PatientMotivationInfo, StepTwoErrors } from '../types';
import { VelaIcon } from './VelaIcon';

interface StepTwoFormProps {
  initialData?: PatientMotivationInfo;
  onBack: () => void;
  onContinue: (data: PatientMotivationInfo) => void;
}

export const StepTwoForm: React.FC<StepTwoFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientMotivationInfo>(() => {
    const saved = localStorage.getItem('vela_step2_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return (
      initialData || {
        consultationReason: '',
        expectedGoals: '',
        futureVision: '',
        currentObstacles: '',
      }
    );
  });

  const [errors, setErrors] = useState<StepTwoErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState<string>('');

  // Persist form state automatically to localStorage
  useEffect(() => {
    localStorage.setItem('vela_step2_data', JSON.stringify(formData));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAutoSavedTime(timeStr);
  }, [formData]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateField = (field: keyof PatientMotivationInfo, value: string): string => {
    switch (field) {
      case 'consultationReason':
        if (!value.trim()) {
          return 'Por favor compártenos brevemente el motivo que te inspiró a consultar.';
        }
        return '';
      case 'expectedGoals':
        if (!value.trim()) {
          return 'Por favor cuéntanos qué te gustaría lograr con el acompañamiento.';
        }
        return '';
      case 'currentObstacles':
        if (!value.trim()) {
          return 'Por favor compártenos qué sientes o qué situaciones te impiden en este momento lograr tus objetivos.';
        }
        return '';
      case 'futureVision':
        if (!value.trim()) {
          return 'Por favor descríbenos cómo te gustaría sentirte en ese tiempo.';
        }
        return '';
      default:
        return '';
    }
  };

  const handleBlur = (field: keyof PatientMotivationInfo) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData[field] || '');
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (field: keyof PatientMotivationInfo, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (touched[field]) {
      const errorMsg = validateField(field, value);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  // Helper count of words / characters in a peaceful format
  const getStats = (text: string = '') => {
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    return { chars, words };
  };

  const isFormComplete =
    formData.consultationReason.trim().length > 0 &&
    formData.expectedGoals.trim().length > 0 &&
    (formData.currentObstacles || '').trim().length > 0 &&
    formData.futureVision.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      consultationReason: true,
      expectedGoals: true,
      currentObstacles: true,
      futureVision: true,
    };
    setTouched(allTouched);

    const newErrors: StepTwoErrors = {
      consultationReason: validateField('consultationReason', formData.consultationReason),
      expectedGoals: validateField('expectedGoals', formData.expectedGoals),
      currentObstacles: validateField('currentObstacles', formData.currentObstacles || ''),
      futureVision: validateField('futureVision', formData.futureVision),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => Boolean(err));
    if (hasAnyError) {
      const firstErrorKey = Object.keys(newErrors).find((k) =>
        Boolean(newErrors[k as keyof StepTwoErrors])
      );
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onContinue(formData);
    }, 400);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Title & Human warm subtitle */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 text-[#5B887E]">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#EBF3F0] text-xs font-semibold">
            2
          </span>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#5B887E]">
            Motivo y Objetivos
          </span>
        </div>

        <h1
          id="screen-title"
          className="text-3xl sm:text-4xl text-[#2E3A36] font-normal leading-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          ¿Qué te trae hasta aquí?
        </h1>

        <p className="text-base sm:text-lg text-[#5C6E68] font-normal leading-relaxed">
          No hay respuestas correctas o incorrectas. Escribe con tus propias palabras.
        </p>

        {/* Doctor warmth card */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#EAF1F8]/80 border border-[#8FAFD1]/30 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-white/80 text-[#8FAFD1] shrink-0 mt-0.5 shadow-2xs">
            <VelaIcon size={22} />
          </div>
          <div className="text-xs sm:text-sm text-[#2E3A36]/90 leading-relaxed space-y-1">
            <p className="font-semibold text-[#3D5A80]">
              Escuchamos tu historia sin juicios
            </p>
            <p className="text-[#5C6E68]">
              En Vela entendemos que el peso y la salud son procesos complejos y profundamente
              personales. Tus respuestas nos ayudan a enfocar la consulta en lo que verdaderamente
              te importa a ti.
            </p>
          </div>
        </div>
      </div>

      {/* Fields Container */}
      <div className="space-y-8 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        {/* 1. ¿Por qué nos consultas en este momento de tu vida? */}
        <div id="field-consultationReason" className="space-y-2.5">
          <label
            htmlFor="consultationReason-input"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <PenLine className="w-4 h-4 text-[#6E9E93] shrink-0" />
              <span>
                ¿Por qué nos consultas en este momento de tu vida?{' '}
                <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">
              {getStats(formData.consultationReason).words > 0
                ? `${getStats(formData.consultationReason).words} palabras`
                : 'Tómate tu tiempo'}
            </span>
          </label>

          <p className="text-xs text-[#5C6E68] pl-0.5">
            Cuéntanos qué está pasando, qué te preocupa o qué te motivó a buscar ayuda ahora.
          </p>

          <div className="relative">
            <textarea
              id="consultationReason-input"
              rows={4}
              value={formData.consultationReason}
              onChange={(e) => handleChange('consultationReason', e.target.value)}
              onBlur={() => handleBlur('consultationReason')}
              placeholder="Cuéntanos qué está pasando, qué te preocupa o qué te motivó a buscar ayuda ahora..."
              className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                touched.consultationReason && errors.consultationReason
                  ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                  : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#8E9E99] px-1">
            <span>Sin límite de espacio</span>
            <span>{formData.consultationReason.length} caracteres</span>
          </div>

          {touched.consultationReason && errors.consultationReason && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.consultationReason}
            </motion.p>
          )}
        </div>

        {/* 2. ¿Qué esperas lograr trabajando con Vela? */}
        <div id="field-expectedGoals" className="space-y-2.5">
          <label
            htmlFor="expectedGoals-input"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#6E9E93] shrink-0" />
              <span>
                ¿Qué esperas lograr trabajando con Vela?{' '}
                <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">
              {getStats(formData.expectedGoals).words > 0
                ? `${getStats(formData.expectedGoals).words} palabras`
                : 'Metas personales'}
            </span>
          </label>

          <p className="text-xs text-[#5C6E68] pl-0.5">
            Puede ser algo concreto (como sentirte con más energía, mejorar un examen médico) o algo más general.
          </p>

          <div className="relative">
            <textarea
              id="expectedGoals-input"
              rows={4}
              value={formData.expectedGoals}
              onChange={(e) => handleChange('expectedGoals', e.target.value)}
              onBlur={() => handleBlur('expectedGoals')}
              placeholder="Puede ser algo concreto (como sentirte con más energía, mejorar un examen médico) o algo más general..."
              className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                touched.expectedGoals && errors.expectedGoals
                  ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                  : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#8E9E99] px-1">
            <span>Escribe con libertad</span>
            <span>{formData.expectedGoals.length} caracteres</span>
          </div>

          {touched.expectedGoals && errors.expectedGoals && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.expectedGoals}
            </motion.p>
          )}
        </div>

        {/* 3. Obstáculos: ¿Qué te impide en este momento lograr esos objetivos? */}
        <div id="field-currentObstacles" className="space-y-2.5">
          <label
            htmlFor="currentObstacles-input"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <Mountain className="w-4 h-4 text-[#6E9E93] shrink-0" />
              <span>
                ¿Qué sientes que te impide en este momento lograr esos objetivos?{' '}
                <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">
              {getStats(formData.currentObstacles).words > 0
                ? `${getStats(formData.currentObstacles).words} palabras`
                : 'Obstáculos y barreras'}
            </span>
          </label>

          <p className="text-xs text-[#5C6E68] pl-0.5">
            Cuéntanos qué dificultades u obstáculos se interponen en tu camino (por ejemplo: falta de tiempo, estrés o ansiedad, picoteo nocturno, temas hormonales, cansancio, desmotivación, hábitos, entorno social, etc.).
          </p>

          <div className="relative">
            <textarea
              id="currentObstacles-input"
              rows={4}
              value={formData.currentObstacles || ''}
              onChange={(e) => handleChange('currentObstacles', e.target.value)}
              onBlur={() => handleBlur('currentObstacles')}
              placeholder="Ej. Siento que el estrés del trabajo me genera ansiedad por comer en las tardes, o que la falta de tiempo y el cansancio me dificultan sostener hábitos constantes..."
              className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                touched.currentObstacles && errors.currentObstacles
                  ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                  : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#8E9E99] px-1">
            <span>Espacio de reflexión honesta</span>
            <span>{(formData.currentObstacles || '').length} caracteres</span>
          </div>

          {touched.currentObstacles && errors.currentObstacles && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.currentObstacles}
            </motion.p>
          )}
        </div>

        {/* 4. Si pudieras imaginar cómo te gustaría sentirte en 6 a 12 meses, ¿cómo sería? */}
        <div id="field-futureVision" className="space-y-2.5">
          <label
            htmlFor="futureVision-input"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold text-[#2E3A36]"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#6E9E93] shrink-0" />
              <span>
                Si pudieras imaginar cómo te gustaría sentirte en 6 a 12 meses, ¿cómo sería?{' '}
                <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </span>
            <span className="text-xs font-normal text-[#8E9E99]">
              {getStats(formData.futureVision).words > 0
                ? `${getStats(formData.futureVision).words} palabras`
                : 'Tu visión'}
            </span>
          </label>

          <p className="text-xs text-[#5C6E68] pl-0.5">
            Describe cómo imaginas tu día a día, tu vitalidad, tu descanso, tu relación con tu cuerpo o tu bienestar integral.
          </p>

          <div className="relative">
            <textarea
              id="futureVision-input"
              rows={4}
              value={formData.futureVision}
              onChange={(e) => handleChange('futureVision', e.target.value)}
              onBlur={() => handleBlur('futureVision')}
              placeholder="Ej. Me gustaría levantarme con más energía, sentirme ágil, tener tranquilidad con mi salud y disfrutar de mis actividades cotidianas..."
              className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                touched.futureVision && errors.futureVision
                  ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                  : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
              }`}
            />
          </div>

          <div className="flex items-center justify-between text-xs text-[#8E9E99] px-1">
            <span>Visualiza tu bienestar</span>
            <span>{formData.futureVision.length} caracteres</span>
          </div>

          {touched.futureVision && errors.futureVision && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.futureVision}
            </motion.p>
          )}
        </div>
      </div>

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Botón Atrás */}
        <button
          type="button"
          id="back-button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-[#AEC9C0] bg-white/80 hover:bg-[#FAF6F0] text-[#2E3A36] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-2xs hover:shadow-xs order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 text-[#6E9E93]" />
          <span>Atrás</span>
        </button>

        {/* Center: Autosave status indicator */}
        <div className="text-xs text-[#5C6E68] flex items-center gap-2 order-3 sm:order-2">
          <div className="w-2 h-2 rounded-full bg-[#6E9E93] animate-pulse" />
          <span>Guardado automático</span>
          {autoSavedTime && (
            <span className="text-[#8E9E99]">({autoSavedTime})</span>
          )}
        </div>

        {/* Right: Botón Continuar */}
        <div className="w-full sm:w-auto order-1 sm:order-3 flex flex-col items-center sm:items-end">
          <button
            type="submit"
            id="continue-button"
            disabled={!isFormComplete || isSubmitting}
            className={`w-full sm:w-auto min-w-[200px] px-8 py-4 rounded-2xl font-semibold text-white shadow-md flex items-center justify-center gap-2.5 transition-all duration-300 ${
              isFormComplete && !isSubmitting
                ? 'bg-[#6E9E93] hover:bg-[#5B887E] active:bg-[#4B736A] hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5'
                : 'bg-[#6E9E93]/40 text-white/80 cursor-not-allowed shadow-none'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/60 border-t-white rounded-full animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <>
                <span>Continuar</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>

          {!isFormComplete && (
            <p className="text-[11px] text-[#8E9E99] mt-2 text-center sm:text-right">
              Completa los 4 campos (*) para avanzar al siguiente paso
            </p>
          )}
        </div>
      </div>
    </form>
  );
};
