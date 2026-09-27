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
  Tv,
  Car,
  Home,
  DollarSign,
} from 'lucide-react';
import {
  PatientBodySymptomsInfo,
  BodyCategoryState,
  DigestiveHabitsInfo,
  MoodSleepHabitsInfo,
  PHQ2Option,
  PHQ2_OPTIONS,
  calculatePHQ2Score,
  SleepQuality,
  SLEEP_QUALITY_OPTIONS,
  SleepAssessmentInfo,
  StopApneaScreening,
  calculateStopScore,
  StressSourceOption,
  STRESS_SOURCES_LIST,
  ScreenTimeOption,
  SCREEN_TIME_OPTIONS,
  WhoCooksOption,
  WHO_COOKS_OPTIONS,
  FoodSecurityWorryOption,
  FOOD_SECURITY_OPTIONS,
  CommuteTimeOption,
  COMMUTE_TIME_OPTIONS,
  normalizeYesNo,
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
        stressSources: [],
        stressSourcesOther: '',
        screenTimeHours: '',
        whoCooksAtHome: '',
        whoCooksAtHomeOther: '',
        foodSecurityWorry: '',
        dailyCommuteTime: '',
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
        phq2: {
          littleInterest: '',
          feelingDown: '',
          totalScore: 0,
        },
        sleepAssessment: {
          usualSleepHours: '',
          sleepQuality: '',
          nightOrRotatingShift: '',
          stopScreening: {
            snoringLoudly: '',
            tiredDuringDay: '',
            observedApnea: '',
            highBloodPressure: '',
            score: 0,
          },
        },
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

    // Check chips
    const chipsReviewed = cat.hasNoSymptoms || (Boolean(cat.selectedChips && cat.selectedChips.length > 0));
    if (!chipsReviewed) return false;

    // For Category 7 (moodSleepMind), PHQ-2, Sleep Assessment (7 questions), Stress, Screens, and Routine are mandatory
    if (key === 'moodSleepMind') {
      const phq2 = formData.moodSleepHabits?.phq2;
      if (!phq2 || !phq2.littleInterest || !phq2.feelingDown) {
        return false;
      }

      const sa = formData.moodSleepHabits?.sleepAssessment;
      if (
        !sa ||
        !sa.usualSleepHours ||
        sa.usualSleepHours.trim() === '' ||
        !sa.sleepQuality ||
        normalizeYesNo(sa.nightOrRotatingShift) === '' ||
        normalizeYesNo(sa.stopScreening?.snoringLoudly) === '' ||
        normalizeYesNo(sa.stopScreening?.tiredDuringDay) === '' ||
        normalizeYesNo(sa.stopScreening?.observedApnea) === '' ||
        normalizeYesNo(sa.stopScreening?.highBloodPressure) === ''
      ) {
        return false;
      }

      const msh = formData.moodSleepHabits;
      if (!msh) return false;
      if (msh.stressLevel === undefined || msh.stressLevel === null) return false;
      if (msh.stressSources?.includes('Otro') && !msh.stressSourcesOther?.trim()) return false;
      if (!msh.screenTimeHours) return false;
      if (!msh.whoCooksAtHome) return false;
      if (msh.whoCooksAtHome === 'Otro' && !msh.whoCooksAtHomeOther?.trim()) return false;
      if (!msh.foodSecurityWorry) return false;
      if (!msh.dailyCommuteTime) return false;
    }

    return true;
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

  // Update PHQ-2 Screening Responses
  const handleUpdatePHQ2 = (field: 'littleInterest' | 'feelingDown', value: PHQ2Option) => {
    setFormData((prev) => {
      const currentHabits = prev.moodSleepHabits || {
        stressLevel: 5,
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      };
      const currentPhq2 = currentHabits.phq2 || { littleInterest: '', feelingDown: '', totalScore: 0 };
      const nextLittleInterest = field === 'littleInterest' ? value : (currentPhq2.littleInterest || '');
      const nextFeelingDown = field === 'feelingDown' ? value : (currentPhq2.feelingDown || '');
      const nextScore = calculatePHQ2Score(nextLittleInterest, nextFeelingDown);

      return {
        ...prev,
        moodSleepHabits: {
          ...currentHabits,
          phq2: {
            littleInterest: nextLittleInterest,
            feelingDown: nextFeelingDown,
            totalScore: nextScore,
          },
        },
      };
    });
  };

  // Update Sleep Assessment (questions 1, 2, 3)
  const handleUpdateSleepAssessment = (field: keyof SleepAssessmentInfo, value: any) => {
    setFormData((prev) => {
      const currentHabits = prev.moodSleepHabits || {
        stressLevel: 5,
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      };
      const currentSleep = currentHabits.sleepAssessment || {
        usualSleepHours: '',
        sleepQuality: '',
        nightOrRotatingShift: '',
        stopScreening: {
          snoringLoudly: '',
          tiredDuringDay: '',
          observedApnea: '',
          highBloodPressure: '',
          score: 0,
        },
      };

      return {
        ...prev,
        moodSleepHabits: {
          ...currentHabits,
          sleepAssessment: {
            ...currentSleep,
            [field]: value,
          },
        },
      };
    });
  };

  // Update STOP Apnea Screening (questions 4 to 7)
  const handleUpdateStopScreening = (field: keyof StopApneaScreening, value: 'Sí' | 'No') => {
    setFormData((prev) => {
      const currentHabits = prev.moodSleepHabits || {
        stressLevel: 5,
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      };
      const currentSleep = currentHabits.sleepAssessment || {
        usualSleepHours: '',
        sleepQuality: '',
        nightOrRotatingShift: '',
        stopScreening: {
          snoringLoudly: '',
          tiredDuringDay: '',
          observedApnea: '',
          highBloodPressure: '',
          score: 0,
        },
      };
      const currentStop = currentSleep.stopScreening || {
        snoringLoudly: '',
        tiredDuringDay: '',
        observedApnea: '',
        highBloodPressure: '',
        score: 0,
      };

      const nextStop = {
        ...currentStop,
        [field]: value,
      };
      nextStop.score = calculateStopScore(nextStop);

      return {
        ...prev,
        moodSleepHabits: {
          ...currentHabits,
          sleepAssessment: {
            ...currentSleep,
            stopScreening: nextStop,
          },
        },
      };
    });
  };

  // Toggle Stress Sources (multiple select)
  const handleToggleStressSource = (source: string) => {
    setFormData((prev) => {
      const currentHabits = prev.moodSleepHabits || {
        stressLevel: 5,
        stressSources: [],
        bedtime: '23:00',
        wakeTime: '07:00',
        calculatedSleepHours: 8,
        dailyRoutineDescription: '',
      };
      const currentSources = currentHabits.stressSources || [];
      const isSelected = currentSources.includes(source);
      const nextSources = isSelected
        ? currentSources.filter((s) => s !== source)
        : [...currentSources, source];

      return {
        ...prev,
        moodSleepHabits: {
          ...currentHabits,
          stressSources: nextSources,
        },
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
            <span>Paso 6 de 11 • ¿Cómo se siente tu cuerpo? • Revisión por sistemas</span>
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

                      {/* SPECIAL SUB-SECTION: MOOD, PHQ-2, STRESS SCALE, SLEEP SCHEDULE & DAILY LIFE ROUTINE */}
                      {category.key === 'moodSleepMind' && (
                        <div className="pt-4 border-t border-[#E8E2D8]/70 space-y-6">
                          {/* 0. PHQ-2 SCREENING BLOCK */}
                          <div
                            id="phq2-screening-container"
                            className={`space-y-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              attemptedSubmit &&
                              (!formData.moodSleepHabits?.phq2?.littleInterest ||
                                !formData.moodSleepHabits?.phq2?.feelingDown)
                                ? 'bg-[#FDEEE9]/60 border-[#F2A488] ring-2 ring-[#F2A488]/30 shadow-xs'
                                : 'bg-white border-[#D9D3C8] shadow-2xs'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#5B887E] uppercase tracking-wider">
                                  <Smile className="w-3.5 h-3.5" />
                                  <span>Tamizaje de bienestar emocional (PHQ-2)</span>
                                </div>
                                <span className="text-[11px] font-semibold text-[#C66A4D] bg-[#FDEEE9] px-2.5 py-0.5 rounded-full border border-[#F2A488]/40">
                                  Obligatorio
                                </span>
                              </div>
                              <p className="text-xs sm:text-sm font-medium text-[#2E3A36] pt-1">
                                En las últimas 2 semanas, ¿con qué frecuencia has tenido...
                              </p>
                            </div>

                            {/* Item 1: Poco interés o placer en hacer las cosas */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span>1) Poco interés o placer en hacer las cosas:</span>
                                {attemptedSubmit && !formData.moodSleepHabits?.phq2?.littleInterest && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {PHQ2_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.phq2?.littleInterest === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`phq2-q1-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdatePHQ2('littleInterest', opt)}
                                      className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold shadow-xs ring-2 ring-[#F2A488]/30'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'bg-[#F2A488] border-[#F2A488] text-white'
                                            : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Item 2: Sensación de tristeza, desánimo o desesperanza */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span>2) Sensación de tristeza, desánimo o desesperanza:</span>
                                {attemptedSubmit && !formData.moodSleepHabits?.phq2?.feelingDown && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>

                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {PHQ2_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.phq2?.feelingDown === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`phq2-q2-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdatePHQ2('feelingDown', opt)}
                                      className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-2 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold shadow-xs ring-2 ring-[#F2A488]/30'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected
                                            ? 'bg-[#F2A488] border-[#F2A488] text-white'
                                            : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* 1. STRESS SCALE & SOURCES (Obligatorio) */}
                          <div className="space-y-4 bg-[#FAF6F0]/80 p-4 sm:p-5 rounded-2xl border border-[#E8E2D8]">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1.5">
                                <Flame className="w-4 h-4 text-[#C66A4D]" />
                                <span>¿Qué tan estresado(a) te has sentido el último mes? (1 al 10):</span>
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

                            {/* Fuentes principales de estrés */}
                            <div className="pt-3 border-t border-[#E8E2D8]/70 space-y-2">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                                <span>¿Cuáles son tus principales fuentes de estrés?</span>
                                <span className="text-[11px] font-normal text-[#8E9E99]">(selección múltiple)</span>
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {STRESS_SOURCES_LIST.map((source) => {
                                  const isSelected = formData.moodSleepHabits?.stressSources?.includes(source);
                                  return (
                                    <button
                                      key={source}
                                      type="button"
                                      id={`stress-source-${source.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleToggleStressSource(source)}
                                      className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer border ${
                                        isSelected
                                          ? 'bg-[#FDEEE9] text-[#C66A4D] border-[#F2A488] font-semibold ring-1 ring-[#F2A488]/40 shadow-xs'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected ? 'bg-[#F2A488] border-[#F2A488] text-white' : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                      </div>
                                      <span>{source}</span>
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Si seleccionó Otro */}
                              {formData.moodSleepHabits?.stressSources?.includes('Otro') && (
                                <div className="pt-2">
                                  <input
                                    type="text"
                                    id="stress-sources-other"
                                    value={formData.moodSleepHabits?.stressSourcesOther || ''}
                                    onChange={(e) => handleUpdateMoodHabits('stressSourcesOther', e.target.value)}
                                    placeholder="¿Cuáles otras fuentes de estrés?"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs focus:ring-2 focus:ring-[#6E9E93]/40"
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. SLEEP ASSESSMENT & APNEA SCREENING BLOCK (Obligatorio) */}
                          <div
                            id="sleep-assessment-container"
                            className={`space-y-5 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              attemptedSubmit &&
                              (!formData.moodSleepHabits?.sleepAssessment?.usualSleepHours ||
                                !formData.moodSleepHabits?.sleepAssessment?.sleepQuality ||
                                !formData.moodSleepHabits?.sleepAssessment?.nightOrRotatingShift ||
                                !formData.moodSleepHabits?.sleepAssessment?.stopScreening?.snoringLoudly ||
                                !formData.moodSleepHabits?.sleepAssessment?.stopScreening?.tiredDuringDay ||
                                !formData.moodSleepHabits?.sleepAssessment?.stopScreening?.observedApnea ||
                                !formData.moodSleepHabits?.sleepAssessment?.stopScreening?.highBloodPressure)
                                ? 'bg-[#FDEEE9]/60 border-[#F2A488] ring-2 ring-[#F2A488]/30 shadow-xs'
                                : 'bg-white border-[#D9D3C8] shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D8]/70 pb-3">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[#5B887E] uppercase tracking-wider">
                                <Moon className="w-4 h-4 text-[#5B887E]" />
                                <span>Bloque de Sueño y Descanso</span>
                              </div>
                              <span className="text-[11px] font-semibold text-[#C66A4D] bg-[#FDEEE9] px-2.5 py-0.5 rounded-full border border-[#F2A488]/40">
                                Obligatorio
                              </span>
                            </div>

                            {/* Pregunta 1: Horas de sueño en una noche habitual */}
                            <div className="space-y-2">
                              <label
                                htmlFor="usual-sleep-hours-input"
                                className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2"
                              >
                                <span>1) ¿Cuántas horas duermes en una noche habitual?</span>
                                {attemptedSubmit && !formData.moodSleepHabits?.sleepAssessment?.usualSleepHours && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Requerido
                                  </span>
                                )}
                              </label>
                              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                                <div className="relative w-full sm:w-44">
                                  <input
                                    type="number"
                                    id="usual-sleep-hours-input"
                                    min="1"
                                    max="24"
                                    step="0.5"
                                    value={formData.moodSleepHabits?.sleepAssessment?.usualSleepHours || ''}
                                    onChange={(e) => handleUpdateSleepAssessment('usualSleepHours', e.target.value)}
                                    placeholder="ej. 7"
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                                  />
                                  <span className="absolute right-3 top-2.5 text-xs text-[#8E9E99] pointer-events-none">
                                    horas
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  {['5', '6', '7', '8', '9'].map((h) => (
                                    <button
                                      key={h}
                                      type="button"
                                      onClick={() => handleUpdateSleepAssessment('usualSleepHours', h)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                                        formData.moodSleepHabits?.sleepAssessment?.usualSleepHours === h
                                          ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                          : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                      }`}
                                    >
                                      {h} hrs
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            {/* Pregunta 2: Calidad del sueño */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span>2) ¿Cómo calificarías la calidad de tu sueño?</span>
                                {attemptedSubmit && !formData.moodSleepHabits?.sleepAssessment?.sleepQuality && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {SLEEP_QUALITY_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.sleepAssessment?.sleepQuality === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`sleep-quality-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdateSleepAssessment('sleepQuality', opt)}
                                      className={`px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1.5 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#EBF3F0] text-[#346A60] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/30 shadow-xs'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Pregunta 3: Turnos nocturnos o rotativos */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between sm:justify-start gap-2">
                                  <span>3) ¿Trabajas en turnos nocturnos o rotativos?</span>
                                  {attemptedSubmit && !formData.moodSleepHabits?.sleepAssessment?.nightOrRotatingShift && (
                                    <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1 sm:hidden">
                                      <AlertCircle className="w-3 h-3" /> Requerido
                                    </span>
                                  )}
                                </label>
                                <div className="flex items-center gap-2">
                                  {['Sí', 'No'].map((val) => {
                                    const isSelected = normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.nightOrRotatingShift) === val;
                                    return (
                                      <button
                                        key={val}
                                        type="button"
                                        id={`night-shift-${val.toLowerCase()}`}
                                        onClick={() => handleUpdateSleepAssessment('nightOrRotatingShift', val)}
                                        className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                          isSelected
                                            ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                            : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                        }`}
                                      >
                                        {val}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* TAMIZAJE DE APNEA / DESCANSO NOCTURNO (Preguntas 4 a 7) */}
                            <div className="pt-3 border-t border-[#E8E2D8] space-y-3.5 bg-[#FAF6F0]/60 p-3.5 sm:p-4 rounded-xl">
                              <div className="space-y-0.5">
                                <span className="text-xs font-semibold text-[#5B887E]">
                                  Evaluación de descanso nocturno y respiración
                                </span>
                                <p className="text-[11px] text-[#5C6E68]">
                                  Responde con sinceridad cada una de las siguientes preguntas:
                                </p>
                              </div>

                              {/* Pregunta 4: Ronquido fuerte */}
                              <div className="space-y-1.5 pt-1">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="text-xs text-[#2E3A36] leading-relaxed pr-2">
                                    <span className="font-semibold">4)</span> ¿Roncas fuerte (tan fuerte que se escucha a través de una puerta cerrada o que tu pareja te ha despertado por eso)?
                                  </label>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {['Sí', 'No'].map((val) => {
                                      const isSelected = normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.snoringLoudly) === val;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          id={`stop-snoring-${val.toLowerCase()}`}
                                          onClick={() => handleUpdateStopScreening('snoringLoudly', val as 'Sí' | 'No')}
                                          className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                              : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                          }`}
                                        >
                                          {val}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {attemptedSubmit && normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.snoringLoudly) === '' && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </div>

                              {/* Pregunta 5: Cansancio o fatiga diurna */}
                              <div className="space-y-1.5 pt-2 border-t border-[#E8E2D8]/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="text-xs text-[#2E3A36] leading-relaxed pr-2">
                                    <span className="font-semibold">5)</span> ¿Te sientes cansado(a), fatigado(a) o con sueño durante el día con frecuencia?
                                  </label>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {['Sí', 'No'].map((val) => {
                                      const isSelected = normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.tiredDuringDay) === val;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          id={`stop-tired-${val.toLowerCase()}`}
                                          onClick={() => handleUpdateStopScreening('tiredDuringDay', val as 'Sí' | 'No')}
                                          className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                              : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                          }`}
                                        >
                                          {val}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {attemptedSubmit && normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.tiredDuringDay) === '' && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </div>

                              {/* Pregunta 6: Apnea o ahogo observado */}
                              <div className="space-y-1.5 pt-2 border-t border-[#E8E2D8]/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="text-xs text-[#2E3A36] leading-relaxed pr-2">
                                    <span className="font-semibold">6)</span> ¿Alguien te ha visto dejar de respirar o ahogarte mientras duermes?
                                  </label>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {['Sí', 'No'].map((val) => {
                                      const isSelected = normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.observedApnea) === val;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          id={`stop-apnea-${val.toLowerCase()}`}
                                          onClick={() => handleUpdateStopScreening('observedApnea', val as 'Sí' | 'No')}
                                          className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                              : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                          }`}
                                        >
                                          {val}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {attemptedSubmit && normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.observedApnea) === '' && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </div>

                              {/* Pregunta 7: Hipertensión arterial */}
                              <div className="space-y-1.5 pt-2 border-t border-[#E8E2D8]/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <label className="text-xs text-[#2E3A36] leading-relaxed pr-2">
                                    <span className="font-semibold">7)</span> ¿Tienes o te están tratando la presión arterial alta?
                                  </label>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {['Sí', 'No'].map((val) => {
                                      const isSelected = normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.highBloodPressure) === val;
                                      return (
                                        <button
                                          key={val}
                                          type="button"
                                          id={`stop-htn-${val.toLowerCase()}`}
                                          onClick={() => handleUpdateStopScreening('highBloodPressure', val as 'Sí' | 'No')}
                                          className={`px-4 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                                            isSelected
                                              ? 'bg-[#5B887E] text-white border-[#5B887E]'
                                              : 'bg-white text-[#5C6E68] border-[#D9D3C8] hover:border-[#6E9E93]'
                                          }`}
                                        >
                                          {val}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                {attemptedSubmit && normalizeYesNo(formData.moodSleepHabits?.sleepAssessment?.stopScreening?.highBloodPressure) === '' && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Horarios habituales adicionales (opcionales para enriquecer cálculo) */}
                            <div className="pt-2 border-t border-[#E8E2D8]/60 space-y-2">
                              <span className="text-[11px] font-semibold text-[#5C6E68]">
                                Horarios aproximados de acostarse y levantarse (opcional):
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label htmlFor="bedtime-input" className="text-[11px] text-[#5C6E68] flex items-center gap-1">
                                    <Moon className="w-3 h-3 text-[#5C6E68]" /> ¿A qué hora te acuestas?
                                  </label>
                                  <input
                                    type="time"
                                    id="bedtime-input"
                                    value={formData.moodSleepHabits?.bedtime || '23:00'}
                                    onChange={(e) => handleUpdateMoodHabits('bedtime', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label htmlFor="wakeTime-input" className="text-[11px] text-[#5C6E68] flex items-center gap-1">
                                    <Sun className="w-3 h-3 text-[#C66A4D]" /> ¿A qué hora te levantas?
                                  </label>
                                  <input
                                    type="time"
                                    id="wakeTime-input"
                                    value={formData.moodSleepHabits?.wakeTime || '07:00'}
                                    onChange={(e) => handleUpdateMoodHabits('wakeTime', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* 3. SCREEN TIME / PANTALLAS FUERA DEL TRABAJO (Obligatorio) */}
                          <div
                            id="screen-time-container"
                            className={`space-y-3 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              attemptedSubmit && !formData.moodSleepHabits?.screenTimeHours
                                ? 'bg-[#FDEEE9]/60 border-[#F2A488] ring-2 ring-[#F2A488]/30 shadow-xs'
                                : 'bg-white border-[#D9D3C8] shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center gap-2">
                                <Tv className="w-4 h-4 text-[#5B887E]" />
                                <span>¿Cuántas horas al día pasas frente a pantallas fuera del trabajo (celular, TV, computador)?</span>
                              </label>
                              <span className="text-[11px] font-semibold text-[#C66A4D] bg-[#FDEEE9] px-2 py-0.5 rounded-full border border-[#F2A488]/40 shrink-0">
                                Obligatorio
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                              {SCREEN_TIME_OPTIONS.map((opt) => {
                                const isSelected = formData.moodSleepHabits?.screenTimeHours === opt;
                                return (
                                  <button
                                    key={opt}
                                    type="button"
                                    id={`screen-time-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                    onClick={() => handleUpdateMoodHabits('screenTimeHours', opt)}
                                    className={`px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1.5 cursor-pointer border text-left ${
                                      isSelected
                                        ? 'bg-[#EBF3F0] text-[#346A60] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/30 shadow-xs'
                                        : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                    }`}
                                  >
                                    <span>{opt} horas</span>
                                    <div
                                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                        isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                                      }`}
                                    >
                                      {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                            {attemptedSubmit && !formData.moodSleepHabits?.screenTimeHours && (
                              <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Selección requerida
                              </span>
                            )}
                          </div>

                          {/* 4. ENTORNO, HOGAR Y DESPLAZAMIENTOS (Obligatorio) */}
                          <div
                            id="environment-routine-container"
                            className={`space-y-4 p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                              attemptedSubmit &&
                              (!formData.moodSleepHabits?.whoCooksAtHome ||
                                (formData.moodSleepHabits?.whoCooksAtHome === 'Otro' &&
                                  !formData.moodSleepHabits?.whoCooksAtHomeOther?.trim()) ||
                                !formData.moodSleepHabits?.foodSecurityWorry ||
                                !formData.moodSleepHabits?.dailyCommuteTime)
                                ? 'bg-[#FDEEE9]/60 border-[#F2A488] ring-2 ring-[#F2A488]/30 shadow-xs'
                                : 'bg-white border-[#D9D3C8] shadow-2xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-[#E8E2D8]/70 pb-2.5">
                              <div className="flex items-center gap-2 text-xs font-semibold text-[#5B887E] uppercase tracking-wider">
                                <Home className="w-4 h-4 text-[#5B887E]" />
                                <span>Entorno y Rutina del Hogar</span>
                              </div>
                              <span className="text-[11px] font-semibold text-[#C66A4D] bg-[#FDEEE9] px-2.5 py-0.5 rounded-full border border-[#F2A488]/40">
                                Obligatorio
                              </span>
                            </div>

                            {/* ¿Quién cocina habitualmente en tu casa? */}
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span>¿Quién cocina habitualmente en tu casa?</span>
                                {attemptedSubmit && !formData.moodSleepHabits?.whoCooksAtHome && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {WHO_COOKS_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.whoCooksAtHome === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`who-cooks-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdateMoodHabits('whoCooksAtHome', opt)}
                                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1.5 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#EBF3F0] text-[#346A60] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/30 shadow-xs'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                              {formData.moodSleepHabits?.whoCooksAtHome === 'Otro' && (
                                <div className="pt-1">
                                  <input
                                    type="text"
                                    id="who-cooks-other"
                                    value={formData.moodSleepHabits?.whoCooksAtHomeOther || ''}
                                    onChange={(e) => handleUpdateMoodHabits('whoCooksAtHomeOther', e.target.value)}
                                    placeholder="¿Quién cocina habitualmente?"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs focus:ring-2 focus:ring-[#6E9E93]/40"
                                  />
                                </div>
                              )}
                            </div>

                            {/* Preocupación por alcance de dinero para comida */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <DollarSign className="w-3.5 h-3.5 text-[#5B887E]" />
                                  En el último año, ¿te ha preocupado que no alcance el dinero para la comida?
                                </span>
                                {attemptedSubmit && !formData.moodSleepHabits?.foodSecurityWorry && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>
                              <div className="grid grid-cols-3 gap-2">
                                {FOOD_SECURITY_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.foodSecurityWorry === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`food-security-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdateMoodHabits('foodSecurityWorry', opt)}
                                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1.5 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#EBF3F0] text-[#346A60] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/30 shadow-xs'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Tiempo en desplazamientos */}
                            <div className="space-y-2 pt-2 border-t border-[#E8E2D8]/60">
                              <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5">
                                  <Car className="w-3.5 h-3.5 text-[#5B887E]" />
                                  ¿Cuánto tiempo gastas al día en desplazamientos?
                                </span>
                                {attemptedSubmit && !formData.moodSleepHabits?.dailyCommuteTime && (
                                  <span className="text-[10px] text-[#C66A4D] font-medium flex items-center gap-1">
                                    <AlertCircle className="w-3 h-3" /> Selección requerida
                                  </span>
                                )}
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {COMMUTE_TIME_OPTIONS.map((opt) => {
                                  const isSelected = formData.moodSleepHabits?.dailyCommuteTime === opt;
                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      id={`commute-time-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                                      onClick={() => handleUpdateMoodHabits('dailyCommuteTime', opt)}
                                      className={`px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center justify-between gap-1.5 cursor-pointer border text-left ${
                                        isSelected
                                          ? 'bg-[#EBF3F0] text-[#346A60] border-[#6E9E93] font-semibold ring-2 ring-[#6E9E93]/30 shadow-xs'
                                          : 'bg-white text-[#2E3A36] border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                                      }`}
                                    >
                                      <span>{opt}</span>
                                      <div
                                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                                          isSelected ? 'bg-[#5B887E] border-[#5B887E] text-white' : 'border-[#C8C2B7] bg-white'
                                        }`}
                                      >
                                        {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* 5. DAILY LIFE ROUTINE DESCRIPTION */}
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
            <p className="font-semibold">Faltan secciones por completar</p>
            <p className="mt-0.5 text-xs text-[#C66A4D]/90">
              Por favor revisa cada categoría pendiente seleccionando los síntomas o marcando <strong>"Nada de esto"</strong>, y responde las preguntas de bienestar emocional (PHQ-2), sueño, estrés, pantallas y entorno en la sección 7.
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
