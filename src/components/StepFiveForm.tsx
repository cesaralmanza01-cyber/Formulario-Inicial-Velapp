import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Heart,
  Wind,
  Utensils,
  Sparkles,
  Zap,
  Smile,
  ChevronDown,
  ChevronUp,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Clock,
  Moon,
  Sun,
  Flame,
  MessageSquare,
  HelpCircle,
} from 'lucide-react';
import {
  PatientBodySymptomsInfo,
  BodyCategoryState,
  DigestiveHabitsInfo,
  MoodSleepHabitsInfo,
} from '../types';
import { VelaIcon } from './VelaIcon';

interface StepFiveFormProps {
  initialData?: PatientBodySymptomsInfo;
  onBack: () => void;
  onContinue: (data: PatientBodySymptomsInfo) => void;
}

interface CategoryDefinition {
  key: keyof Omit<PatientBodySymptomsInfo, 'additionalNotes' | 'digestiveHabits' | 'moodSleepHabits'>;
  number: number;
  title: string;
  subtitle: string;
  icon: React.ElementType;
  chips: string[];
}

const CATEGORIES: CategoryDefinition[] = [
  {
    key: 'general',
    number: 1,
    title: 'General',
    subtitle: 'Sensación global de energía, peso y temperatura corporal',
    icon: Zap,
    chips: [
      'Cambios recientes de peso',
      'Fatiga o cansancio inusual',
      'No toleras bien el frío o el calor',
    ],
  },
  {
    key: 'cardiovascular',
    number: 2,
    title: 'Cardiovascular',
    subtitle: 'Ritmo cardíaco, circulación y tensión arterial',
    icon: Heart,
    chips: [
      'Falta de aire',
      'Palpitaciones (sientes el corazón acelerado)',
      'Hinchazón en piernas o pies',
      'Presión arterial alta conocida',
    ],
  },
  {
    key: 'respiratory',
    number: 3,
    title: 'Respiratorio',
    subtitle: 'Calidad de respiración diurna y durante el descanso',
    icon: Wind,
    chips: [
      'Ronquido fuerte',
      'Pausas de respiración al dormir (te lo han dicho)',
      'Falta de aire al hacer esfuerzo',
    ],
  },
  {
    key: 'digestive',
    number: 4,
    title: 'Digestivo y hábito intestinal',
    subtitle: 'Digestión, síntomas gastrointestinales y características de tus deposiciones',
    icon: Utensils,
    chips: [
      'Reflujo o acidez',
      'Estreñimiento',
      'Dolor o distensión abdominal frecuente',
      'Gases o sensación de pesadez',
      'Diagnóstico conocido de hígado graso',
    ],
  },
  {
    key: 'skinHairHormones',
    number: 5,
    title: 'Piel, cabello y hormonas',
    subtitle: 'Manifestaciones cutáneas, capilares, fuerza muscular y eje hormonal',
    icon: Sparkles,
    chips: [
      'Cambios en la piel o el cabello',
      'Manchas oscuras en cuello o axilas',
      'Vello excesivo en zonas no habituales',
      'Moretones que aparecen fácilmente',
      'Debilidad muscular, sobre todo en piernas o brazos (cuesta subir escaleras o levantarte de una silla)',
    ],
  },
  {
    key: 'musclesJoints',
    number: 6,
    title: 'Músculos y articulaciones',
    subtitle: 'Confort físico, movilidad y articulaciones',
    icon: Activity,
    chips: [
      'Dolor articular',
      'Dificultad para moverte con libertad',
    ],
  },
  {
    key: 'moodSleepMind',
    number: 7,
    title: 'Ánimo, estrés, sueño y tu día cotidiano',
    subtitle: 'Nivel de estrés, horarios de descanso y cómo es un día habitual en tu vida',
    icon: Smile,
    chips: [
      'Cambios en el ánimo o desgana',
      'Ansiedad o inquietud',
      'Dificultad para conciliar o mantener el sueño',
      'Dolores de cabeza frecuentes',
    ],
  },
];

const createEmptyCategoryState = (): BodyCategoryState => ({
  hasNoSymptoms: false,
  selectedChips: [],
  skipped: false,
});

/**
 * Calculates sleep hours given bedtime ("HH:mm") and waketime ("HH:mm")
 */
function calculateHoursOfSleep(bedtime?: string, wakeTime?: string): number | undefined {
  if (!bedtime || !wakeTime) return undefined;
  const [bedH, bedM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);

  if (isNaN(bedH) || isNaN(bedM) || isNaN(wakeH) || isNaN(wakeM)) return undefined;

  let bedMinutes = bedH * 60 + bedM;
  let wakeMinutes = wakeH * 60 + wakeM;

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60; // Next day
  }

  const diffMinutes = wakeMinutes - bedMinutes;
  const hours = Math.round((diffMinutes / 60) * 10) / 10;
  return hours;
}

export const StepFiveForm: React.FC<StepFiveFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientBodySymptomsInfo>(() => {
    if (initialData) return initialData;
    const saved = localStorage.getItem('vela_step5_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing step 5 draft', e);
      }
    }
    return {
      general: createEmptyCategoryState(),
      cardiovascular: createEmptyCategoryState(),
      respiratory: createEmptyCategoryState(),
      digestive: createEmptyCategoryState(),
      digestiveHabits: {
        stoolConsistency: '',
        dailyBowelMovementCount: '',
        takesLaxatives: '',
        laxativeDetails: '',
        hasDifficultyDefecating: '',
      },
      skinHairHormones: createEmptyCategoryState(),
      musclesJoints: createEmptyCategoryState(),
      moodSleepMind: createEmptyCategoryState(),
      moodSleepHabits: {
        stressLevel: 5,
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      },
      additionalNotes: '',
    };
  });

  // Calculate sleep hours dynamically
  const calculatedSleep = calculateHoursOfSleep(
    formData.moodSleepHabits?.bedtime,
    formData.moodSleepHabits?.wakeTime
  );

  // Accordion open/collapse states: all open by default so patient can quickly scan and tap
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    general: true,
    cardiovascular: true,
    respiratory: true,
    digestive: true,
    skinHairHormones: true,
    musclesJoints: true,
    moodSleepMind: true,
  });

  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Auto-save draft
  useEffect(() => {
    localStorage.setItem('vela_step5_data', JSON.stringify(formData));
  }, [formData]);

  const toggleAccordion = (key: string) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const isCategoryReviewed = (
    key: keyof Omit<PatientBodySymptomsInfo, 'additionalNotes' | 'digestiveHabits' | 'moodSleepHabits'>
  ): boolean => {
    const cat = formData[key];
    if (!cat) return false;
    if (cat.skipped) return true;
    if (cat.hasNoSymptoms) return true;
    return cat.selectedChips && cat.selectedChips.length > 0;
  };

  const totalCategories = CATEGORIES.length; // 7 categories
  const reviewedCategoriesCount = CATEGORIES.reduce((count, cat) => {
    return isCategoryReviewed(cat.key) ? count + 1 : count;
  }, 0);

  const isAllReviewed = CATEGORIES.every((cat) => isCategoryReviewed(cat.key));

  // Toggle "Nada de esto"
  const handleSelectNone = (
    key: keyof Omit<PatientBodySymptomsInfo, 'additionalNotes' | 'digestiveHabits' | 'moodSleepHabits'>
  ) => {
    setFormData((prev) => {
      const currentCat = prev[key] || createEmptyCategoryState();
      const isCurrentlyNone = currentCat.hasNoSymptoms;

      return {
        ...prev,
        [key]: {
          hasNoSymptoms: !isCurrentlyNone,
          selectedChips: [],
          skipped: false,
        },
      };
    });
  };

  // Toggle individual symptom chip
  const handleToggleChip = (
    key: keyof Omit<PatientBodySymptomsInfo, 'additionalNotes' | 'digestiveHabits' | 'moodSleepHabits'>,
    chip: string
  ) => {
    setFormData((prev) => {
      const currentCat = prev[key] || createEmptyCategoryState();
      const isSelected = currentCat.selectedChips.includes(chip);

      const nextChips = isSelected
        ? currentCat.selectedChips.filter((c) => c !== chip)
        : [...currentCat.selectedChips, chip];

      return {
        ...prev,
        [key]: {
          hasNoSymptoms: false, // Automatically deactivates "Nada de esto"
          selectedChips: nextChips,
          skipped: false,
        },
      };
    });
  };

  // Update Digestive Habits
  const handleUpdateDigestiveHabits = (field: keyof DigestiveHabitsInfo, value: string) => {
    setFormData((prev) => ({
      ...prev,
      digestiveHabits: {
        ...(prev.digestiveHabits || {}),
        [field]: value,
      },
    }));
  };

  // Update Mood / Sleep / Stress Habits
  const handleUpdateMoodHabits = (field: keyof MoodSleepHabitsInfo, value: any) => {
    setFormData((prev) => {
      const currentHabits = prev.moodSleepHabits || {
        stressLevel: 5,
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      };

      const updated = {
        ...currentHabits,
        [field]: value,
      };

      if (field === 'bedtime' || field === 'wakeTime') {
        const nextBed = field === 'bedtime' ? value : updated.bedtime;
        const nextWake = field === 'wakeTime' ? value : updated.wakeTime;
        updated.calculatedSleepHours = calculateHoursOfSleep(nextBed, nextWake);
      }

      return {
        ...prev,
        moodSleepHabits: updated,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Find the first unreviewed category
    const pendingCat = CATEGORIES.find((cat) => !isCategoryReviewed(cat.key));

    if (pendingCat) {
      // Ensure the unreviewed accordion is open
      setOpenAccordions((prev) => ({ ...prev, [pendingCat.key]: true }));

      // Scroll smoothly to it
      const targetElement = categoryRefs.current[pendingCat.key];
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    onContinue(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header section */}
      <div className="space-y-4 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold self-start">
            <VelaIcon size={14} />
            <span>Paso 5 de 7 • Revisión por sistemas y estilo de vida</span>
          </div>

          {/* Progress pill: e.g. "3 de 7 revisadas" */}
          <div
            id="categories-progress-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium self-start sm:self-auto transition-all ${
              isAllReviewed
                ? 'bg-[#EBF3F0] text-[#477369] border border-[#6E9E93]/40'
                : 'bg-white text-[#5C6E68] border border-[#D9D3C8] shadow-2xs'
            }`}
          >
            {isAllReviewed ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-[#5B887E]" />
                <span className="font-semibold text-[#2E3A36]">
                  {reviewedCategoriesCount} de {totalCategories} revisadas
                </span>
                <span className="text-[#5B887E]">• Listo</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-[#F2A488] animate-pulse" />
                <span>
                  <strong className="text-[#2E3A36]">{reviewedCategoriesCount}</strong> de{' '}
                  {totalCategories} revisadas
                </span>
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <h1
            className="text-2xl sm:text-3xl lg:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            ¿Cómo se ha sentido tu cuerpo últimamente?
          </h1>
          <p className="text-sm sm:text-base text-[#5C6E68] max-w-2xl leading-relaxed">
            Revisa cada sección tocando lo que te haya pasado en los últimos meses, tus hábitos digestivos, tu nivel de estrés y descanso.
          </p>
        </div>

        {/* Progress bar visual indicator */}
        <div className="w-full bg-[#E8E2D8]/80 h-1.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-[#AEC9C0] to-[#6E9E93] rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${totalCategories > 0 ? Math.round((reviewedCategoriesCount / totalCategories) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Accordion Categories Container */}
      <div className="space-y-4">
        {CATEGORIES.map((category) => {
          const isReviewed = isCategoryReviewed(category.key);
          const isOpen = openAccordions[category.key] ?? true;
          const catState = formData[category.key];
          const isNone = catState.hasNoSymptoms;
          const selectedCount = catState.selectedChips?.length || 0;
          const isPending = attemptedSubmit && !isReviewed;

          const Icon = category.icon;

          return (
            <div
              key={category.key}
              ref={(el) => {
                categoryRefs.current[category.key] = el;
              }}
              id={`category-accordion-${category.key}`}
              className={`rounded-3xl border transition-all duration-200 overflow-hidden ${
                isPending
                  ? 'border-[#F2A488] bg-white ring-2 ring-[#F2A488]/30 shadow-sm'
                  : isReviewed
                  ? 'border-[#AEC9C0]/40 bg-white/80 shadow-2xs hover:border-[#AEC9C0]'
                  : 'border-[#D9D3C8] bg-white/60 hover:bg-white/80'
              }`}
            >
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleAccordion(category.key)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left gap-3 transition-colors hover:bg-[#FAF6F0]/40"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                      isReviewed
                        ? isNone
                          ? 'bg-[#EBF3F0] text-[#5B887E]'
                          : 'bg-[#FDEEE9] text-[#C66A4D]'
                        : isPending
                        ? 'bg-[#FDEEE9] text-[#C66A4D]'
                        : 'bg-[#FAF6F0] text-[#5C6E68] border border-[#E8E2D8]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className="text-base sm:text-lg text-[#2E3A36] font-normal"
                        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                      >
                        {category.number}. {category.title}
                      </h2>

                      {/* Status indicator badges */}
                      {isNone && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#EBF3F0] text-[#477369] border border-[#6E9E93]/40 font-medium inline-flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Nada de esto
                        </span>
                      )}

                      {selectedCount > 0 && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FDEEE9] text-[#C66A4D] border border-[#F2A488]/60 font-semibold inline-flex items-center gap-1">
                          {selectedCount} {selectedCount === 1 ? 'síntoma' : 'síntomas'}
                        </span>
                      )}

                      {isPending && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-[#FDEEE9] text-[#C66A4D] font-medium inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Pendiente de revisar
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-[#5C6E68] mt-0.5 line-clamp-1">
                      {category.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="p-1 rounded-lg text-[#5C6E68] bg-[#FAF6F0] border border-[#E8E2D8]">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </span>
                </div>
              </button>

              {/* Accordion Body */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pb-6 pt-1 space-y-6 border-t border-[#FAF6F0]">
                      {/* Chips Area for General Symptoms */}
                      <div className="space-y-2">
                        <span className="text-xs font-semibold text-[#2E3A36]">
                          {category.key === 'digestive'
                            ? 'Sensaciones o síntomas digestivos:'
                            : category.key === 'moodSleepMind'
                            ? 'Sensaciones de ánimo o mente:'
                            : 'Sensaciones o síntomas:'}
                        </span>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                          {/* Special "Nada de esto" Chip */}
                          <button
                            type="button"
                            id={`chip-${category.key}-none`}
                            onClick={() => handleSelectNone(category.key)}
                            className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all duration-150 flex items-center gap-2 cursor-pointer border ${
                              isNone
                                ? 'bg-[#EBF3F0] text-[#477369] border-[#6E9E93] font-semibold shadow-xs ring-2 ring-[#6E9E93]/20'
                                : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]/60'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                                isNone
                                  ? 'bg-[#5B887E] border-[#5B887E] text-white'
                                  : 'border-[#AEC9C0] bg-white'
                              }`}
                            >
                              {isNone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <span>Nada de esto</span>
                          </button>

                          {/* Individual Symptom Chips */}
                          {category.chips.map((chipText, idx) => {
                            const isSelected = catState.selectedChips?.includes(chipText);

                            return (
                              <button
                                key={idx}
                                type="button"
                                id={`chip-${category.key}-${idx}`}
                                onClick={() => handleToggleChip(category.key, chipText)}
                                className={`px-4 py-2.5 rounded-2xl text-xs sm:text-sm transition-all duration-150 flex items-center gap-2.5 cursor-pointer text-left border ${
                                  isSelected
                                    ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold shadow-xs ring-2 ring-[#F2A488]/30'
                                    : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]/60'
                                }`}
                              >
                                <div
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-[#F2A488] border-[#F2A488] text-white'
                                      : 'border-[#C8C2B7] bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                </div>
                                <span className="leading-snug">{chipText}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* SPECIAL SUB-SECTION: DIGESTIVE HABITS (Constipation, Stool type, Frequency, Laxatives, Difficulty) */}
                      {category.key === 'digestive' && (
                        <div className="pt-4 border-t border-[#E8E2D8]/70 space-y-5">
                          <div className="flex items-center gap-2 text-xs font-semibold text-[#5B887E] uppercase tracking-wider">
                            <Utensils className="w-3.5 h-3.5" />
                            <span>Hábito intestinal y características de tus deposiciones</span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Stool Consistency */}
                            <div className="space-y-2 md:col-span-2">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                                <span>¿Cómo suele ser la consistencia de tus deposiciones (heces)?</span>
                                <span className="text-[11px] font-normal text-[#8E9E99]">Escala de Bristol</span>
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {[
                                  {
                                    val: 'Duras / Secas / En bolitas',
                                    label: 'Duras o en bolitas',
                                    desc: 'Cuestan salir, secas o fragmentadas',
                                  },
                                  {
                                    val: 'Normales / Formadas',
                                    label: 'Normales y formadas',
                                    desc: 'Suaves, forma alargada continua',
                                  },
                                  {
                                    val: 'Blandas / Pastosas',
                                    label: 'Blandas o pastosas',
                                    desc: 'Consistencia muy suave o poco formada',
                                  },
                                  {
                                    val: 'Líquidas / Acuosas',
                                    label: 'Líquidas o acuosas',
                                    desc: 'Frecuente diarrea o sin consistencia',
                                  },
                                  {
                                    val: 'Variables (alterna duras y blandas)',
                                    label: 'Variables',
                                    desc: 'Alternas temporadas duras y blandas',
                                  },
                                ].map((opt) => {
                                  const isSelected = formData.digestiveHabits?.stoolConsistency === opt.val;
                                  return (
                                    <button
                                      key={opt.val}
                                      type="button"
                                      onClick={() => handleUpdateDigestiveHabits('stoolConsistency', opt.val)}
                                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                                        isSelected
                                          ? 'bg-[#EBF3F0] border-[#5B887E] ring-2 ring-[#5B887E]/20 shadow-xs'
                                          : 'bg-white border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]/60'
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
                            </div>

                            {/* Frequency per day / week */}
                            <div className="space-y-1.5">
                              <label htmlFor="bowelCount-select" className="text-xs font-semibold text-[#2E3A36]">
                                ¿Con qué frecuencia vas a defecar (hacer del cuerpo)?
                              </label>
                              <select
                                id="bowelCount-select"
                                value={formData.digestiveHabits?.dailyBowelMovementCount || ''}
                                onChange={(e) => handleUpdateDigestiveHabits('dailyBowelMovementCount', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                              >
                                <option value="">Selecciona una opción...</option>
                                <option value="3 o más veces al día">3 o más veces al día</option>
                                <option value="1 a 2 veces al día">1 a 2 veces al día (habitual)</option>
                                <option value="Día por medio (3-4 veces por semana)">Día por medio (3-4 veces por semana)</option>
                                <option value="1 a 2 veces por semana">1 a 2 veces por semana (poco frecuente)</option>
                                <option value="Menos de 1 vez por semana">Menos de 1 vez por semana</option>
                              </select>
                            </div>

                            {/* Difficulty / Straining */}
                            <div className="space-y-1.5">
                              <label htmlFor="bowelDifficulty-select" className="text-xs font-semibold text-[#2E3A36]">
                                ¿Haces del cuerpo con dificultad o esfuerzo excesivo?
                              </label>
                              <select
                                id="bowelDifficulty-select"
                                value={formData.digestiveHabits?.hasDifficultyDefecating || ''}
                                onChange={(e) => handleUpdateDigestiveHabits('hasDifficultyDefecating', e.target.value)}
                                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                              >
                                <option value="">Selecciona una opción...</option>
                                <option value="No, sin esfuerzo">No, sin esfuerzo</option>
                                <option value="A veces me cuesta">A veces me cuesta o requiere esfuerzo</option>
                                <option value="Sí, con esfuerzo o dolor frecuente">Sí, con esfuerzo o dolor frecuente</option>
                              </select>
                            </div>

                            {/* Laxatives usage */}
                            <div className="space-y-1.5 md:col-span-2 bg-[#FAF6F0]/80 p-4 rounded-2xl border border-[#E8E2D8]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-xs font-semibold text-[#2E3A36]">
                                  ¿Tomas o usas laxantes, tés digestivos purgantes o enemas?
                                </label>
                                <div className="flex gap-2">
                                  {['No', 'Ocasionalmente', 'Frecuentemente / A diario'].map((val) => (
                                    <button
                                      key={val}
                                      type="button"
                                      onClick={() => handleUpdateDigestiveHabits('takesLaxatives', val)}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                        formData.digestiveHabits?.takesLaxatives === val
                                          ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                          : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                      }`}
                                    >
                                      {val}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* If takes laxatives, ask which ones */}
                              {formData.digestiveHabits?.takesLaxatives &&
                                formData.digestiveHabits.takesLaxatives !== 'No' && (
                                  <div className="pt-2">
                                    <input
                                      type="text"
                                      value={formData.digestiveHabits.laxativeDetails || ''}
                                      onChange={(e) => handleUpdateDigestiveHabits('laxativeDetails', e.target.value)}
                                      placeholder="¿Cuáles tomas o usas? (ej. té de sen, ciruelax, polietilenglicol, magnesio...)"
                                      className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                                    />
                                  </div>
                                )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* SPECIAL SUB-SECTION: MOOD, STRESS SCALE, SLEEP SCHEDULE & DAILY LIFE ROUTINE */}
                      {category.key === 'moodSleepMind' && (
                        <div className="pt-4 border-t border-[#E8E2D8]/70 space-y-6">
                          {/* 1. STRESS SCALE (1 to 10) */}
                          <div className="space-y-3 bg-[#FAF6F0]/80 p-4 sm:p-5 rounded-2xl border border-[#E8E2D8]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-[#C66A4D]" />
                                <span>Escala de nivel de estrés cotidiano (1 al 10):</span>
                              </label>
                              <span className="text-xs font-semibold text-[#C66A4D] bg-[#FDEEE9] px-2.5 py-0.5 rounded-full border border-[#F2A488]/40 self-start sm:self-auto">
                                Nivel {formData.moodSleepHabits?.stressLevel || 5} de 10 —{' '}
                                {(formData.moodSleepHabits?.stressLevel || 5) <= 3
                                  ? 'Bajo / Tranquilo'
                                  : (formData.moodSleepHabits?.stressLevel || 5) <= 6
                                  ? 'Moderado'
                                  : (formData.moodSleepHabits?.stressLevel || 5) <= 8
                                  ? 'Alto'
                                  : 'Muy Alto / Crónico'}
                              </span>
                            </div>

                            {/* Range slider & buttons */}
                            <div className="space-y-2 pt-1">
                              <input
                                type="range"
                                min="1"
                                max="10"
                                step="1"
                                value={formData.moodSleepHabits?.stressLevel || 5}
                                onChange={(e) => handleUpdateMoodHabits('stressLevel', Number(e.target.value))}
                                className="w-full accent-[#5B887E] cursor-pointer h-2 bg-[#D9D3C8] rounded-lg"
                              />

                              <div className="flex justify-between text-[10px] sm:text-xs text-[#5C6E68] font-medium px-1">
                                <span>1 (Muy bajo)</span>
                                <span>3</span>
                                <span>5 (Moderado)</span>
                                <span>7</span>
                                <span>10 (Extremo)</span>
                              </div>
                            </div>
                          </div>

                          {/* 2. SLEEP SCHEDULE & DYNAMIC SLEEP CALCULATION */}
                          <div className="space-y-3 bg-white p-4 sm:p-5 rounded-2xl border border-[#D9D3C8] shadow-2xs">
                            <div className="flex items-center gap-2 text-xs font-semibold text-[#5B887E] uppercase tracking-wider">
                              <Moon className="w-3.5 h-3.5" />
                              <span>Horarios de sueño y descanso</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
                              {/* Bedtime */}
                              <div className="space-y-1.5">
                                <label
                                  htmlFor="bedtime-input"
                                  className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5"
                                >
                                  <Moon className="w-3.5 h-3.5 text-[#5C6E68]" />
                                  <span>¿A qué hora te vas a dormir?</span>
                                </label>
                                <input
                                  type="time"
                                  id="bedtime-input"
                                  value={formData.moodSleepHabits?.bedtime || '23:00'}
                                  onChange={(e) => handleUpdateMoodHabits('bedtime', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                                />
                              </div>

                              {/* Wake time */}
                              <div className="space-y-1.5">
                                <label
                                  htmlFor="wakeTime-input"
                                  className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5"
                                >
                                  <Sun className="w-3.5 h-3.5 text-[#C66A4D]" />
                                  <span>¿A qué hora te levantas?</span>
                                </label>
                                <input
                                  type="time"
                                  id="wakeTime-input"
                                  value={formData.moodSleepHabits?.wakeTime || '07:00'}
                                  onChange={(e) => handleUpdateMoodHabits('wakeTime', e.target.value)}
                                  className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                                />
                              </div>

                              {/* Dynamic Sleep Calculation Banner */}
                              <div className="p-3 rounded-2xl bg-[#EBF3F0] border border-[#AEC9C0]/60 flex flex-col justify-center text-center sm:text-left">
                                <span className="text-[11px] text-[#477369] font-medium flex items-center justify-center sm:justify-start gap-1">
                                  <Clock className="w-3 h-3 text-[#5B887E]" />
                                  Horas de sueño calculadas:
                                </span>
                                <div className="text-base font-semibold text-[#2E3A36] mt-0.5">
                                  {calculatedSleep !== undefined ? `${calculatedSleep} horas / noche` : 'Por calcular'}
                                </div>
                                <span className="text-[10px] text-[#5C6E68]">
                                  {calculatedSleep !== undefined && calculatedSleep < 7
                                    ? '⚠️ Menos de 7 horas (descanso corto)'
                                    : calculatedSleep !== undefined && calculatedSleep > 9
                                    ? 'Descanso prolongado (>9h)'
                                    : '✓ Rango óptimo recomendado'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* 3. DAILY LIFE ROUTINE DESCRIPTION */}
                          <div className="space-y-2 bg-[#FAF6F0]/80 p-4 sm:p-5 rounded-2xl border border-[#E8E2D8]">
                            <label
                              htmlFor="dailyRoutine-textarea"
                              className="text-xs font-semibold text-[#2E3A36] flex items-center gap-2"
                            >
                              <Activity className="w-4 h-4 text-[#5B887E]" />
                              <span>Describe brevemente cómo es un día cotidiano en tu vida:</span>
                            </label>
                            <p className="text-[11px] text-[#5C6E68] leading-relaxed">
                              Cuéntanos a grandes rasgos tus horarios típicos: cuándo trabajas, tus comidas, nivel de movimiento, tiempo libre y cómo termina tu día.
                            </p>
                            <textarea
                              id="dailyRoutine-textarea"
                              rows={3}
                              value={formData.moodSleepHabits?.dailyRoutineDescription || ''}
                              onChange={(e) => handleUpdateMoodHabits('dailyRoutineDescription', e.target.value)}
                              placeholder="Ejemplo: Me levanto a las 6:30, tomo café, trabajo sentada hasta las 5 pm, suelo almorzar rápido a la 1 pm, en la tarde hago diligencias y suelo cenar tarde..."
                              className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y hover:border-[#AEC9C0]"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Free Text Optional Field */}
      <div className="bg-white/80 p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs space-y-3">
        <label
          htmlFor="additionalNotes-input"
          className="text-sm font-semibold text-[#2E3A36] flex items-center gap-2"
        >
          <MessageSquare className="w-4 h-4 text-[#6E9E93]" />
          ¿Hay algo más sobre cómo te has sentido que quieras contarnos?{' '}
          <span className="text-xs font-normal text-[#8E9E99]">(opcional)</span>
        </label>
        <p className="text-xs text-[#5C6E68] leading-relaxed">
          Cualquier otra molestia, sensación física o inquietud que te gustaría que la doctora tenga
          en cuenta antes de tu consulta.
        </p>
        <textarea
          id="additionalNotes-input"
          rows={3}
          value={formData.additionalNotes || ''}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, additionalNotes: e.target.value }))
          }
          placeholder="Escribe aquí libremente si hay algún otro síntoma o detalle..."
          className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y hover:border-[#AEC9C0]"
        />
      </div>

      {/* Submission error reminder notice if any category is pending */}
      {attemptedSubmit && !isAllReviewed && (
        <div className="p-4 rounded-2xl bg-[#FDEEE9] border border-[#F2A488] text-[#C66A4D] flex items-start gap-3 text-xs sm:text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#C66A4D]" />
          <div>
            <p className="font-semibold">Faltan categorías por revisar</p>
            <p className="mt-0.5 text-xs text-[#C66A4D]/90">
              Por favor revisa cada categoría pendiente seleccionando los síntomas que apliquen o
              marcando el chip <strong>"Nada de esto"</strong> para continuar.
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
