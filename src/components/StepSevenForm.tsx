import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  Footprints,
  Dumbbell,
  Flame,
  Clock,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  HelpCircle,
  HeartHandshake,
  Smile,
  ShieldCheck,
} from 'lucide-react';
import {
  PatientPhysicalActivityInfo,
  StepSevenErrors,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepSevenFormProps {
  initialData?: PatientPhysicalActivityInfo;
  onBack: () => void;
  onContinue: (data: PatientPhysicalActivityInfo) => void;
}

const DAILY_ACTIVITY_OPTIONS = [
  {
    val: 'Sentada la mayor parte del día',
    label: 'Sentada la mayor parte del día',
    desc: 'Trabajo de oficina, computadora, conducción o estudio prolongado',
  },
  {
    val: 'Sentada, pero me paro con frecuencia',
    label: 'Sentada, pero me paro con frecuencia',
    desc: 'Pausas activas, diligencias intermitentes en la casa o trabajo',
  },
  {
    val: 'De pie la mayor parte del día',
    label: 'De pie la mayor parte del día',
    desc: 'Comercio, docencia, atención a pacientes, cocina, etc.',
  },
  {
    val: 'Con desplazamientos y movimiento constante',
    label: 'Desplazamientos y movimiento continuo',
    desc: 'Caminar mucho entre áreas, visitas en terreno, tareas activas',
  },
  {
    val: 'Trabajo físico intenso',
    label: 'Trabajo físico intenso',
    desc: 'Cargar peso, esfuerzo muscular continuo o labores pesadas',
  },
];

const STAIRS_OPTIONS = [
  'Nunca o casi nunca',
  'A veces',
  'Frecuentemente',
  'Es parte de mi rutina diaria',
];

const WALKS_TRANSPORT_OPTIONS = [
  'Casi nunca',
  'Pocas veces por semana',
  'Varias veces por semana',
  'Casi a diario',
];

const SITTING_HOURS_OPTIONS = [
  'Menos de 4 horas',
  'Entre 4 y 8 horas',
  'Entre 8 y 12 horas',
  'Más de 12 horas',
];

const EXERCISE_TYPE_OPTIONS = [
  'Cardio (caminar rápido, trotar, bicicleta)',
  'Pesas o entrenamiento de fuerza',
  'Yoga o pilates',
  'Deportes',
  'Baile',
  'Otro',
];

const WEEKLY_FREQ_OPTIONS = [
  '1 día',
  '2 días',
  '3 días',
  '4 días',
  '5 días o más',
];

const SESSION_DURATION_OPTIONS = [
  'Menos de 30 min',
  '30-45 min',
  '45-60 min',
  'Más de 60 min',
];

const INTENSITY_OPTIONS = [
  {
    val: 'Leve (puedo hablar sin esfuerzo)',
    label: 'Leve',
    desc: 'Puedo mantener una conversación continua sin quedarme sin aire',
  },
  {
    val: 'Moderada (me cuesta un poco hablar)',
    label: 'Moderada',
    desc: 'Puedo hablar en frases cortas, noto el corazón acelerado y calor',
  },
  {
    val: 'Intensa (me cuesta mucho hablar)',
    label: 'Intensa',
    desc: 'Solo puedo decir una o dos palabras seguidas, respiración agitada',
  },
];

const MOTIVATION_LABELS: Record<number, string> = {
  1: '1 • Nada motivada',
  2: '2 • Poco motivada',
  3: '3 • Moderada / Con dudas',
  4: '4 • Bastante motivada',
  5: '5 • Muy motivada y lista',
};

export const StepSevenForm: React.FC<StepSevenFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientPhysicalActivityInfo>(() => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('vela_step7_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing step 7 draft', e);
      }
    }
    return {
      dailyActivityType: '',
      takesStairsFrequency: '',
      walksForTransport: '',
      dailyStepsApprox: '',
      dailySittingHours: '',
      doesStructuredExercise: '',
      exerciseTypes: [],
      exerciseTypesOther: '',
      exerciseWeeklyFrequency: '',
      exerciseSessionDuration: '',
      exerciseIntensity: '',
      motivationStructuredExercise: 3,
      motivationDailyMovement: 4,
      movementBarriersOrConcerns: '',
    };
  });

  const [errors, setErrors] = useState<StepSevenErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem('vela_step7_data', JSON.stringify(formData));
  }, [formData]);

  const validate = (): boolean => {
    const errs: StepSevenErrors = {};

    // 1. Daily activity type
    if (!formData.dailyActivityType) {
      errs.dailyActivityType = 'Selecciona cómo describirías tu actividad principal.';
    }

    // 2. Stairs frequency
    if (!formData.takesStairsFrequency) {
      errs.takesStairsFrequency = 'Selecciona con qué frecuencia usas escaleras.';
    }

    // 3. Walks for transport
    if (!formData.walksForTransport) {
      errs.walksForTransport = 'Selecciona si caminas como medio de transporte.';
    }

    // 5. Sitting hours
    if (!formData.dailySittingHours) {
      errs.dailySittingHours = 'Indica cuánto tiempo pasas sentada en un día típico.';
    }

    // 6. Structured exercise
    if (!formData.doesStructuredExercise) {
      errs.doesStructuredExercise = 'Indica si realizas ejercicio estructurado actualmente.';
    } else if (formData.doesStructuredExercise === 'Sí') {
      // 7. Exercise types
      if (!formData.exerciseTypes || formData.exerciseTypes.length === 0) {
        errs.exerciseTypes = 'Selecciona al menos un tipo de ejercicio que realizas.';
      } else if (
        formData.exerciseTypes.includes('Otro') &&
        (!formData.exerciseTypesOther || !formData.exerciseTypesOther.trim())
      ) {
        errs.exerciseTypesOther = 'Por favor especifica qué otro ejercicio haces.';
      }

      // 8. Weekly frequency
      if (!formData.exerciseWeeklyFrequency) {
        errs.exerciseWeeklyFrequency = 'Selecciona con qué frecuencia semanal entrenas.';
      }

      // 9. Session duration
      if (!formData.exerciseSessionDuration) {
        errs.exerciseSessionDuration = 'Selecciona la duración aproximada de cada sesión.';
      }

      // 10. Exercise intensity
      if (!formData.exerciseIntensity) {
        errs.exerciseIntensity = 'Selecciona la intensidad con la que entrenas.';
      }
    }

    // 11 & 12. Motivations
    if (!formData.motivationStructuredExercise) {
      errs.motivationStructuredExercise = 'Por favor selecciona tu nivel de motivación.';
    }
    if (!formData.motivationDailyMovement) {
      errs.motivationDailyMovement = 'Por favor selecciona tu nivel de motivación.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleToggleExerciseType = (type: string) => {
    setFormData((prev) => {
      const current = prev.exerciseTypes || [];
      const isSelected = current.includes(type);
      const next = isSelected
        ? current.filter((item) => item !== type)
        : [...current, type];

      return {
        ...prev,
        exerciseTypes: next,
      };
    });

    if (attemptedSubmit) {
      setErrors((prev) => ({ ...prev, exerciseTypes: undefined }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    if (validate()) {
      onContinue(formData);
    } else {
      const firstError = document.querySelector('[data-error="true"]');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header section */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start">
          <VelaIcon size={14} />
          <span>Paso 7 de 7 • Movimiento, ejercicio y estilo de vida activo</span>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            ¿Cómo te mueves en tu día a día?
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            No se trata solo del gimnasio — todo tu movimiento cuenta: tus pasos, pausas activas, escaleras y cómo fluye tu energía a lo largo del día.
          </p>
        </div>
      </div>

      {/* SUB-SECCIÓN 1: TU MOVIMIENTO DIARIO (NEAT - Movimiento no estructurado) */}
      <div
        id="section-movimiento-diario"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center font-bold text-sm">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Tu movimiento diario
            </h2>
            <p className="text-xs text-[#5C6E68]">
              Estimación del movimiento no estructurado, traslados y posturas de tu rutina
            </p>
          </div>
        </div>

        {/* 1. Actividad principal */}
        <div
          data-error={!!errors.dailyActivityType}
          className="space-y-2.5"
        >
          <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
            <span>
              1. ¿Cómo describirías tu trabajo o actividad principal del día en términos de movimiento? <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>

          <div className="space-y-2">
            {DAILY_ACTIVITY_OPTIONS.map((opt) => {
              const isSelected = formData.dailyActivityType === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  id={`btn-daily-activity-${opt.val.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, dailyActivityType: opt.val as any }));
                    if (attemptedSubmit) setErrors((prev) => ({ ...prev, dailyActivityType: undefined }));
                  }}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] ring-2 ring-[#6E9E93]/20 font-semibold shadow-xs'
                      : 'bg-[#FAF6F0]/60 text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                  }`}
                >
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm block">{opt.label}</span>
                    <span className="text-[11px] text-[#5C6E68] font-normal block mt-0.5">{opt.desc}</span>
                  </div>
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
          {errors.dailyActivityType && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5 pt-0.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.dailyActivityType}
            </p>
          )}
        </div>

        {/* 2 & 3. Grid: Escaleras y Caminar como transporte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
          {/* 2. Subir escaleras */}
          <div
            data-error={!!errors.takesStairsFrequency}
            className="space-y-2"
          >
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              2. ¿Subes escaleras con frecuencia (en vez de usar ascensor)? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {STAIRS_OPTIONS.map((opt) => {
                const isSelected = formData.takesStairsFrequency === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, takesStairsFrequency: opt as any }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, takesStairsFrequency: undefined }));
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold'
                        : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#5B887E]" />}
                  </button>
                );
              })}
            </div>
            {errors.takesStairsFrequency && (
              <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.takesStairsFrequency}
              </p>
            )}
          </div>

          {/* 3. Caminar como transporte */}
          <div
            data-error={!!errors.walksForTransport}
            className="space-y-2"
          >
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              3. ¿Caminas como medio de transporte (ir al trabajo, mandados)? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {WALKS_TRANSPORT_OPTIONS.map((opt) => {
                const isSelected = formData.walksForTransport === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, walksForTransport: opt as any }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, walksForTransport: undefined }));
                    }}
                    className={`p-2.5 rounded-xl border text-xs text-left transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold'
                        : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className="w-3 h-3 text-[#5B887E]" />}
                  </button>
                );
              })}
            </div>
            {errors.walksForTransport && (
              <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.walksForTransport}
              </p>
            )}
          </div>
        </div>

        {/* 4 & 5. Grid: Pasos diarios (opcional) & Tiempo sentada (obligatorio) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 border-t border-[#FAF6F0]">
          {/* 4. Pasos aproximados */}
          <div className="space-y-2">
            <label
              htmlFor="dailyStepsApprox-input"
              className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
            >
              <span>4. ¿Sabes aproximadamente cuántos pasos das al día?</span>
              <span className="text-[11px] text-[#8E9E99] font-normal">(opcional)</span>
            </label>
            <p className="text-xs text-[#5C6E68]">
              Si usas reloj inteligente o el celular para contarlos. Si no lo sabes, puedes dejarlo en blanco.
            </p>
            <div className="relative">
              <input
                type="number"
                id="dailyStepsApprox-input"
                min="0"
                max="50000"
                step="500"
                value={formData.dailyStepsApprox || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, dailyStepsApprox: e.target.value }))}
                placeholder="Ej. 6500"
                className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#8E9E99] font-medium pointer-events-none">
                pasos / día
              </span>
            </div>
          </div>

          {/* 5. Tiempo sentada */}
          <div
            data-error={!!errors.dailySittingHours}
            className="space-y-2"
          >
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              5. ¿Cuánto tiempo pasas sentada en un día típico? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {SITTING_HOURS_OPTIONS.map((opt) => {
                const isSelected = formData.dailySittingHours === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, dailySittingHours: opt as any }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, dailySittingHours: undefined }));
                    }}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/20 shadow-xs'
                        : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white text-xs'
                    }`}
                  >
                    <span className="text-xs font-medium">{opt}</span>
                  </button>
                );
              })}
            </div>
            {errors.dailySittingHours && (
              <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1 pt-0.5">
                <AlertCircle className="w-3 h-3" />
                {errors.dailySittingHours}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* SUB-SECCIÓN 2: EJERCICIO ESTRUCTURADO */}
      <div
        id="section-ejercicio-estructurado"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#FDEEE9] text-[#C66A4D] flex items-center justify-center font-bold text-sm">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Ejercicio estructurado
            </h2>
            <p className="text-xs text-[#5C6E68]">Rutinas programadas, clases dirigidas, gimnasio o deportes</p>
          </div>
        </div>

        {/* 6. ¿Haces ejercicio actualmente? */}
        <div
          data-error={!!errors.doesStructuredExercise}
          className="space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              6. ¿Haces ejercicio estructurado actualmente (una rutina, clase, deporte, etc.)? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <div className="flex gap-2 self-start sm:self-auto">
              {(['No', 'Sí'] as const).map((val) => {
                const isSelected = formData.doesStructuredExercise === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-structured-exercise-${val.toLowerCase()}`}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        doesStructuredExercise: val,
                        exerciseTypes: val === 'No' ? [] : prev.exerciseTypes,
                        exerciseTypesOther: val === 'No' ? '' : prev.exerciseTypesOther,
                        exerciseWeeklyFrequency: val === 'No' ? '' : prev.exerciseWeeklyFrequency,
                        exerciseSessionDuration: val === 'No' ? '' : prev.exerciseSessionDuration,
                        exerciseIntensity: val === 'No' ? '' : prev.exerciseIntensity,
                      }));
                      if (attemptedSubmit) {
                        setErrors((prev) => ({
                          ...prev,
                          doesStructuredExercise: undefined,
                          exerciseTypes: undefined,
                          exerciseTypesOther: undefined,
                          exerciseWeeklyFrequency: undefined,
                          exerciseSessionDuration: undefined,
                          exerciseIntensity: undefined,
                        }));
                      }
                    }}
                    className={`px-6 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all cursor-pointer ${
                      isSelected
                        ? val === 'Sí'
                          ? 'bg-[#5B887E] text-white border-[#5B887E] shadow-2xs font-semibold'
                          : 'bg-[#5C6E68] text-white border-[#5C6E68] shadow-2xs font-semibold'
                        : 'bg-[#FAF6F0] text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                    }`}
                  >
                    {val}
                  </button>
                );
              })}
            </div>
          </div>
          {errors.doesStructuredExercise && (
            <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.doesStructuredExercise}
            </p>
          )}
        </div>

        {/* Conditional fields if does structured exercise is "Sí" */}
        {formData.doesStructuredExercise === 'Sí' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 space-y-6 border-t border-[#E8E2D8]/70"
          >
            {/* 7. Tipo de ejercicio */}
            <div
              data-error={!!errors.exerciseTypes || !!errors.exerciseTypesOther}
              className="space-y-3"
            >
              <label className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
                <span>
                  7. ¿Qué tipo de ejercicio haces? <strong className="text-[#C66A4D]">*</strong>
                </span>
                <span className="text-[11px] font-normal text-[#8E9E99]">Selecciona todos los que apliquen</span>
              </label>

              <div className="flex flex-wrap gap-2.5">
                {EXERCISE_TYPE_OPTIONS.map((type) => {
                  const isSelected = formData.exerciseTypes?.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      id={`chip-exercise-${type.slice(0, 10).toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => handleToggleExerciseType(type)}
                      className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all duration-150 flex items-center gap-2.5 cursor-pointer border ${
                        isSelected
                          ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold shadow-xs ring-2 ring-[#F2A488]/30'
                          : 'bg-[#FAF6F0]/70 text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-[#F2A488] border-[#F2A488] text-white' : 'border-[#C8C2B7] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                      <span>{type}</span>
                    </button>
                  );
                })}
              </div>

              {/* Conditional input if "Otro" is checked */}
              {formData.exerciseTypes?.includes('Otro') && (
                <div className="pt-1 space-y-1">
                  <label htmlFor="exerciseTypesOther-input" className="text-xs font-semibold text-[#C66A4D]">
                    Especifica qué otro tipo de ejercicio haces: <strong className="text-[#C66A4D]">*</strong>
                  </label>
                  <input
                    type="text"
                    id="exerciseTypesOther-input"
                    value={formData.exerciseTypesOther || ''}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, exerciseTypesOther: e.target.value }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, exerciseTypesOther: undefined }));
                    }}
                    placeholder="Ejemplo: Natación, Crossfit, escalada, tenis..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#F2A488] text-[#2E3A36] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#F2A488]/40"
                  />
                  {errors.exerciseTypesOther && (
                    <p className="text-xs text-[#C66A4D] flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.exerciseTypesOther}
                    </p>
                  )}
                </div>
              )}

              {errors.exerciseTypes && (
                <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.exerciseTypes}
                </p>
              )}
            </div>

            {/* 8 & 9. Grid: Frecuencia semanal & Duración */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
              {/* 8. Frecuencia */}
              <div
                data-error={!!errors.exerciseWeeklyFrequency}
                className="space-y-2"
              >
                <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
                  8. ¿Con qué frecuencia por semana? <strong className="text-[#C66A4D]">*</strong>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {WEEKLY_FREQ_OPTIONS.map((freq) => {
                    const isSelected = formData.exerciseWeeklyFrequency === freq;
                    return (
                      <button
                        key={freq}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, exerciseWeeklyFrequency: freq as any }));
                          if (attemptedSubmit) setErrors((prev) => ({ ...prev, exerciseWeeklyFrequency: undefined }));
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/20'
                            : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                        }`}
                      >
                        {freq}
                      </button>
                    );
                  })}
                </div>
                {errors.exerciseWeeklyFrequency && (
                  <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.exerciseWeeklyFrequency}
                  </p>
                )}
              </div>

              {/* 9. Duración de sesión */}
              <div
                data-error={!!errors.exerciseSessionDuration}
                className="space-y-2"
              >
                <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
                  9. ¿Cuánto dura cada sesión aproximadamente? <strong className="text-[#C66A4D]">*</strong>
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {SESSION_DURATION_OPTIONS.map((dur) => {
                    const isSelected = formData.exerciseSessionDuration === dur;
                    return (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, exerciseSessionDuration: dur as any }));
                          if (attemptedSubmit) setErrors((prev) => ({ ...prev, exerciseSessionDuration: undefined }));
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer text-xs ${
                          isSelected
                            ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/20'
                            : 'bg-[#FAF6F0]/60 text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                        }`}
                      >
                        {dur}
                      </button>
                    );
                  })}
                </div>
                {errors.exerciseSessionDuration && (
                  <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1 pt-0.5">
                    <AlertCircle className="w-3 h-3" />
                    {errors.exerciseSessionDuration}
                  </p>
                )}
              </div>
            </div>

            {/* 10. Intensidad */}
            <div
              data-error={!!errors.exerciseIntensity}
              className="space-y-2.5 pt-2"
            >
              <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
                10. ¿Cómo describirías la intensidad con la que entrenas? <strong className="text-[#C66A4D]">*</strong>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {INTENSITY_OPTIONS.map((opt) => {
                  const isSelected = formData.exerciseIntensity === opt.val;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({ ...prev, exerciseIntensity: opt.val as any }));
                        if (attemptedSubmit) setErrors((prev) => ({ ...prev, exerciseIntensity: undefined }));
                      }}
                      className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#EBF3F0] border-[#5B887E] ring-2 ring-[#5B887E]/20 shadow-xs'
                          : 'bg-[#FAF6F0]/60 border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? 'text-[#477369]' : 'text-[#2E3A36]'}`}>
                          {opt.label}
                        </span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-[11px] text-[#5C6E68] mt-1 line-clamp-2">{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
              {errors.exerciseIntensity && (
                <p className="text-xs text-[#C66A4D] font-medium flex items-center gap-1 pt-0.5">
                  <AlertCircle className="w-3 h-3" />
                  {errors.exerciseIntensity}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* SUB-SECCIÓN 3: TU MOTIVACIÓN */}
      <div
        id="section-motivacion"
        className="bg-white/80 rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/40 shadow-2xs space-y-6"
      >
        <div className="flex items-center gap-2.5 pb-2 border-b border-[#FAF6F0]">
          <div className="w-8 h-8 rounded-xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center font-bold text-sm">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h2
              className="text-lg text-[#2E3A36] font-medium"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Tu motivación
            </h2>
            <p className="text-xs text-[#5C6E68]">Tu disposición actual, expectativas y posibles barreras</p>
          </div>
        </div>

        {/* 11. Motivación para ejercicio estructurado (Escala 1 a 5 con control visual interactivo) */}
        <div
          data-error={!!errors.motivationStructuredExercise}
          className="space-y-3 bg-[#FAF6F0]/80 p-4 sm:p-5 rounded-2xl border border-[#E8E2D8]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              11. ¿Qué tan motivada te sientes hoy para empezar o retomar una rutina de ejercicio estructurado? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <span className="text-xs font-semibold text-[#5B887E] bg-[#EBF3F0] px-3 py-1 rounded-full border border-[#6E9E93]/30 self-start sm:self-auto">
              {MOTIVATION_LABELS[formData.motivationStructuredExercise || 3]}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = (formData.motivationStructuredExercise || 3) === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-motivation-structured-${val}`}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, motivationStructuredExercise: val }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, motivationStructuredExercise: undefined }));
                    }}
                    className={`py-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#5B887E] text-white border-[#5B887E] shadow-xs font-bold scale-[1.02]'
                        : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#6E9E93] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{val}</span>
                    <span className="text-[10px] hidden sm:block font-normal opacity-90">
                      {val === 1 ? 'Nada' : val === 3 ? 'Media' : val === 5 ? 'Total' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-[#5C6E68] font-medium px-1">
              <span>1 = Nada motivada</span>
              <span className="hidden sm:inline">3 = Intermedia</span>
              <span>5 = Muy motivada</span>
            </div>
          </div>
        </div>

        {/* 12. Motivación para movimiento cotidiano (Escala 1 a 5) */}
        <div
          data-error={!!errors.motivationDailyMovement}
          className="space-y-3 bg-[#FAF6F0]/80 p-4 sm:p-5 rounded-2xl border border-[#E8E2D8]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
              12. ¿Qué tan motivada te sientes para incluir más movimiento en tu día a día (caminar más, escaleras, pararte más)? <strong className="text-[#C66A4D]">*</strong>
            </label>
            <span className="text-xs font-semibold text-[#C66A4D] bg-[#FDEEE9] px-3 py-1 rounded-full border border-[#F2A488]/40 self-start sm:self-auto">
              {MOTIVATION_LABELS[formData.motivationDailyMovement || 4]}
            </span>
          </div>

          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((val) => {
                const isSelected = (formData.motivationDailyMovement || 4) === val;
                return (
                  <button
                    key={val}
                    type="button"
                    id={`btn-motivation-daily-${val}`}
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, motivationDailyMovement: val }));
                      if (attemptedSubmit) setErrors((prev) => ({ ...prev, motivationDailyMovement: undefined }));
                    }}
                    className={`py-3 rounded-2xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#F2A488] text-white border-[#F2A488] shadow-xs font-bold scale-[1.02]'
                        : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#F2A488] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <span className="text-base sm:text-lg">{val}</span>
                    <span className="text-[10px] hidden sm:block font-normal opacity-90">
                      {val === 1 ? 'Nada' : val === 3 ? 'Media' : val === 5 ? 'Total' : ''}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-between text-[11px] text-[#5C6E68] font-medium px-1">
              <span>1 = Nada motivada</span>
              <span className="hidden sm:inline">3 = Intermedia</span>
              <span>5 = Muy motivada</span>
            </div>
          </div>
        </div>

        {/* 13. Barreras o preocupaciones (opcional) */}
        <div className="space-y-2 pt-1">
          <label
            htmlFor="movementBarriersOrConcerns-input"
            className="text-xs sm:text-sm font-semibold text-[#2E3A36] flex items-center justify-between"
          >
            <span>13. ¿Hay algo que te frene, te dé pereza o te preocupe sobre moverte más?</span>
            <span className="text-[11px] text-[#8E9E99] font-normal">(opcional)</span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Por ejemplo dolores articulares, falta de tiempo, miedo a lesionarte, cansancio al final del día o experiencias previas difíciles.
          </p>
          <textarea
            id="movementBarriersOrConcerns-input"
            rows={3}
            value={formData.movementBarriersOrConcerns || ''}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, movementBarriersOrConcerns: e.target.value }))
            }
            placeholder="Escribe aquí libremente sobre lo que sientes que te dificulta ser más activa..."
            className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y hover:border-[#AEC9C0]"
          />
        </div>
      </div>

      {/* Submission Validation Banner if errors exist */}
      {attemptedSubmit && Object.keys(errors).length > 0 && (
        <div className="p-4 rounded-2xl bg-[#FDEEE9] border border-[#F2A488] text-[#C66A4D] flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C66A4D]" />
          <div>
            <p className="font-semibold">Por favor completa los campos obligatorios</p>
            <p className="mt-0.5 text-xs text-[#C66A4D]/90">
              Revisa los campos marcados con asterisco (*) antes de continuar al resumen de tu cuestionario.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Back Button */}
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 text-[#5B887E]" />
          <span>Atrás</span>
        </button>

        {/* Continue Button */}
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 order-1 sm:order-2 bg-[#6E9E93] hover:bg-[#5B887E] text-white cursor-pointer hover:shadow-md"
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
