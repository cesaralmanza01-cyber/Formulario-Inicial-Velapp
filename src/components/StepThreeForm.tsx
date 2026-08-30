import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Scale,
  RotateCcw,
  Pill,
  Activity,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Info,
  Check,
  HelpCircle,
} from 'lucide-react';
import {
  PatientWeightHistoryInfo,
  StepThreeErrors,
  WeightFluctuationCount,
  WeightRegainSpeed,
  PreviousMethodOption,
  ExerciseInAttempts,
  WeightTrajectoryMilestone,
} from '../types';
import { VelaIcon } from './VelaIcon';
import { WeightTrajectoryTimeline } from './WeightTrajectoryTimeline';

interface StepThreeFormProps {
  initialData?: PatientWeightHistoryInfo;
  onBack: () => void;
  onContinue: (data: PatientWeightHistoryInfo) => void;
}

const FLUCTUATION_OPTIONS: WeightFluctuationCount[] = [
  '1 vez',
  '2-3 veces',
  '4-5 veces',
  'más de 5 veces',
  'no sabría decir',
];

const REGAIN_SPEED_OPTIONS: WeightRegainSpeed[] = [
  'en menos de 3 meses',
  'entre 3 y 6 meses',
  'entre 6 meses y 1 año',
  'más de 1 año',
  'no lo he recuperado',
];

const PREVIOUS_METHODS_OPTIONS: PreviousMethodOption[] = [
  'Por mi cuenta',
  'Con acompañamiento de un profesional o coach',
  'Con apps o programas online',
  'Con grupos de apoyo',
];

const EXERCISE_OPTIONS: ExerciseInAttempts[] = ['Sí', 'No', 'A veces'];

export const StepThreeForm: React.FC<StepThreeFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientWeightHistoryInfo>(() => {
    const saved = localStorage.getItem('vela_step3_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return (
      initialData || {
        currentWeightKg: '',
        heightCm: '',
        lowestWeightSince18Kg: '',
        highestWeightSince18Kg: '',
        weightTrajectoryMilestones: [],
        hasPreviousAttempts: '',
        fluctuationCount: '',
        regainSpeed: '',
        previousMethods: [],
        includedExercise: '',
        restrictiveDiets: '',
        restrictiveDietsDetails: '',
        usedWeightMedications: '',
        weightMedicationsNames: '',
        weightMedicationsExperience: '',
        weightMedicationsAdverseEffects: '',
        hadBariatricSurgery: '',
        bariatricSurgeryTimeAgo: '',
        hadAestheticSurgery: '',
        aestheticSurgeryDetails: '',
        aestheticSurgeryTimeAgo: '',
      }
    );
  });

  const [errors, setErrors] = useState<StepThreeErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [autoSavedTime, setAutoSavedTime] = useState<string>('');

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem('vela_step3_data', JSON.stringify(formData));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setAutoSavedTime(timeStr);
  }, [formData]);

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  const validateField = (
    field: keyof PatientWeightHistoryInfo,
    currentForm: PatientWeightHistoryInfo = formData
  ): string => {
    switch (field) {
      // Sub-sección 1: Tu peso y talla
      case 'currentWeightKg': {
        const val = currentForm.currentWeightKg.trim();
        if (!val) return 'Por favor ingresa tu peso actual en kg.';
        const num = parseFloat(val);
        if (isNaN(num) || num < 25 || num > 350) {
          return 'Ingresa un peso válido en kilogramos (ej. 78.5).';
        }
        return '';
      }
      case 'heightCm': {
        const val = (currentForm.heightCm || '').trim();
        if (!val) return 'Por favor ingresa tu talla o estatura en cm.';
        const num = parseFloat(val);
        if (isNaN(num) || num < 90 || num > 250) {
          return 'Ingresa una estatura válida en cm (ej. 165).';
        }
        return '';
      }
      case 'lowestWeightSince18Kg': {
        const val = currentForm.lowestWeightSince18Kg.trim();
        if (!val) return 'Por favor indica el peso más bajo desde tus 18 años.';
        const num = parseFloat(val);
        if (isNaN(num) || num < 25 || num > 350) {
          return 'Ingresa un peso válido en kilogramos.';
        }
        return '';
      }
      case 'highestWeightSince18Kg': {
        const val = currentForm.highestWeightSince18Kg.trim();
        if (!val) return 'Por favor indica el peso más alto desde tus 18 años.';
        const num = parseFloat(val);
        if (isNaN(num) || num < 25 || num > 350) {
          return 'Ingresa un peso válido en kilogramos.';
        }
        return '';
      }

      // Sub-sección 2: Intentos previos
      case 'hasPreviousAttempts':
        if (!currentForm.hasPreviousAttempts) {
          return 'Por favor responde si has realizado intentos previos.';
        }
        return '';

      case 'fluctuationCount':
        if (currentForm.hasPreviousAttempts === 'Sí' && !currentForm.fluctuationCount) {
          return 'Por favor selecciona una opción.';
        }
        return '';

      case 'regainSpeed':
        if (currentForm.hasPreviousAttempts === 'Sí' && !currentForm.regainSpeed) {
          return 'Por favor selecciona qué tan rápido sueles recuperar el peso.';
        }
        return '';

      case 'previousMethods':
        if (
          currentForm.hasPreviousAttempts === 'Sí' &&
          (!currentForm.previousMethods || currentForm.previousMethods.length === 0)
        ) {
          return 'Por favor selecciona al menos una opción.';
        }
        return '';

      case 'includedExercise':
        if (currentForm.hasPreviousAttempts === 'Sí' && !currentForm.includedExercise) {
          return 'Por favor indícanos si incluiste ejercicio.';
        }
        return '';

      case 'restrictiveDiets':
        if (currentForm.hasPreviousAttempts === 'Sí' && !currentForm.restrictiveDiets) {
          return 'Por favor responde si has realizado dietas muy restrictivas.';
        }
        return '';

      // Sub-sección 3: Medicamentos para el peso
      case 'usedWeightMedications':
        if (!currentForm.usedWeightMedications) {
          return 'Por favor responde si has usado medicamentos para el peso.';
        }
        return '';

      case 'weightMedicationsNames':
        if (
          currentForm.usedWeightMedications === 'Sí' &&
          !currentForm.weightMedicationsNames?.trim()
        ) {
          return 'Por favor indica qué medicamentos o inyectables utilizaste.';
        }
        return '';

      case 'weightMedicationsExperience':
        if (
          currentForm.usedWeightMedications === 'Sí' &&
          !currentForm.weightMedicationsExperience?.trim()
        ) {
          return 'Cuéntanos brevemente cómo te fue con ellos.';
        }
        return '';

      case 'weightMedicationsAdverseEffects':
        if (
          currentForm.usedWeightMedications === 'Sí' &&
          !currentForm.weightMedicationsAdverseEffects?.trim()
        ) {
          return 'Indícanos si tuviste algún síntoma o reacción (o si no experimentaste ninguna).';
        }
        return '';

      // Sub-sección 4: Cirugía bariátrica
      case 'hadBariatricSurgery':
        if (!currentForm.hadBariatricSurgery) {
          return 'Por favor responde si te has realizado alguna cirugía bariátrica.';
        }
        return '';

      case 'bariatricSurgeryTimeAgo':
        if (
          currentForm.hadBariatricSurgery === 'Sí' &&
          !currentForm.bariatricSurgeryTimeAgo?.trim()
        ) {
          return 'Por favor indícanos hace cuánto tiempo fue la cirugía.';
        }
        return '';

      // Sub-sección 5: Cirugías estéticas
      case 'hadAestheticSurgery':
        if (!currentForm.hadAestheticSurgery) {
          return 'Por favor responde si te has realizado cirugías estéticas para moldear o mejorar tu peso.';
        }
        return '';

      case 'aestheticSurgeryDetails':
        if (
          currentForm.hadAestheticSurgery === 'Sí' &&
          !currentForm.aestheticSurgeryDetails?.trim()
        ) {
          return 'Por favor indícanos qué procedimiento(s) te realizaste.';
        }
        return '';

      case 'aestheticSurgeryTimeAgo':
        if (
          currentForm.hadAestheticSurgery === 'Sí' &&
          !currentForm.aestheticSurgeryTimeAgo?.trim()
        ) {
          return 'Por favor indícanos hace cuánto tiempo fue la cirugía estética.';
        }
        return '';

      default:
        return '';
    }
  };

  const handleBlur = (field: keyof PatientWeightHistoryInfo) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const handleChange = (
    field: keyof PatientWeightHistoryInfo,
    value: unknown
  ) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    if (touched[field]) {
      const errorMsg = validateField(field, updated);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const togglePreviousMethod = (method: PreviousMethodOption) => {
    const currentList = formData.previousMethods || [];
    const exists = currentList.includes(method);
    const updatedList = exists
      ? currentList.filter((m) => m !== method)
      : [...currentList, method];

    handleChange('previousMethods', updatedList);
    setTouched((prev) => ({ ...prev, previousMethods: true }));
  };

  // Evaluate form completeness
  const isFormComplete = (() => {
    // 1. Pesos y talla obligatorios
    if (
      !formData.currentWeightKg.trim() ||
      !formData.heightCm?.trim() ||
      !formData.lowestWeightSince18Kg.trim() ||
      !formData.highestWeightSince18Kg.trim()
    ) {
      return false;
    }

    // 2. Intentos previos
    if (!formData.hasPreviousAttempts) return false;
    if (formData.hasPreviousAttempts === 'Sí') {
      if (
        !formData.fluctuationCount ||
        !formData.regainSpeed ||
        !formData.previousMethods ||
        formData.previousMethods.length === 0 ||
        !formData.includedExercise ||
        !formData.restrictiveDiets
      ) {
        return false;
      }
    }

    // 3. Medicamentos
    if (!formData.usedWeightMedications) return false;
    if (formData.usedWeightMedications === 'Sí') {
      if (
        !formData.weightMedicationsNames?.trim() ||
        !formData.weightMedicationsExperience?.trim() ||
        !formData.weightMedicationsAdverseEffects?.trim()
      ) {
        return false;
      }
    }

    // 4. Cirugía bariátrica
    if (!formData.hadBariatricSurgery) return false;
    if (formData.hadBariatricSurgery === 'Sí') {
      if (!formData.bariatricSurgeryTimeAgo?.trim()) {
        return false;
      }
    }

    // 5. Cirugía estética
    if (!formData.hadAestheticSurgery) return false;
    if (formData.hadAestheticSurgery === 'Sí') {
      if (
        !formData.aestheticSurgeryDetails?.trim() ||
        !formData.aestheticSurgeryTimeAgo?.trim()
      ) {
        return false;
      }
    }

    return true;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all pertinent fields as touched
    const touchedFields: Record<string, boolean> = {
      currentWeightKg: true,
      heightCm: true,
      lowestWeightSince18Kg: true,
      highestWeightSince18Kg: true,
      hasPreviousAttempts: true,
      usedWeightMedications: true,
      hadBariatricSurgery: true,
      hadAestheticSurgery: true,
    };

    if (formData.hasPreviousAttempts === 'Sí') {
      touchedFields.fluctuationCount = true;
      touchedFields.regainSpeed = true;
      touchedFields.previousMethods = true;
      touchedFields.includedExercise = true;
      touchedFields.restrictiveDiets = true;
    }

    if (formData.usedWeightMedications === 'Sí') {
      touchedFields.weightMedicationsNames = true;
      touchedFields.weightMedicationsExperience = true;
      touchedFields.weightMedicationsAdverseEffects = true;
    }

    if (formData.hadBariatricSurgery === 'Sí') {
      touchedFields.bariatricSurgeryTimeAgo = true;
    }

    if (formData.hadAestheticSurgery === 'Sí') {
      touchedFields.aestheticSurgeryDetails = true;
      touchedFields.aestheticSurgeryTimeAgo = true;
    }

    setTouched(touchedFields);

    const newErrors: StepThreeErrors = {
      currentWeightKg: validateField('currentWeightKg', formData),
      heightCm: validateField('heightCm', formData),
      lowestWeightSince18Kg: validateField('lowestWeightSince18Kg', formData),
      highestWeightSince18Kg: validateField('highestWeightSince18Kg', formData),
      hasPreviousAttempts: validateField('hasPreviousAttempts', formData),
      fluctuationCount: validateField('fluctuationCount', formData),
      regainSpeed: validateField('regainSpeed', formData),
      previousMethods: validateField('previousMethods', formData),
      includedExercise: validateField('includedExercise', formData),
      restrictiveDiets: validateField('restrictiveDiets', formData),
      usedWeightMedications: validateField('usedWeightMedications', formData),
      weightMedicationsNames: validateField('weightMedicationsNames', formData),
      weightMedicationsExperience: validateField('weightMedicationsExperience', formData),
      weightMedicationsAdverseEffects: validateField(
        'weightMedicationsAdverseEffects',
        formData
      ),
      hadBariatricSurgery: validateField('hadBariatricSurgery', formData),
      bariatricSurgeryTimeAgo: validateField('bariatricSurgeryTimeAgo', formData),
      hadAestheticSurgery: validateField('hadAestheticSurgery', formData),
      aestheticSurgeryDetails: validateField('aestheticSurgeryDetails', formData),
      aestheticSurgeryTimeAgo: validateField('aestheticSurgeryTimeAgo', formData),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => Boolean(err));
    if (hasAnyError) {
      const firstErrorKey = Object.keys(newErrors).find((k) =>
        Boolean(newErrors[k as keyof StepThreeErrors])
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
            3
          </span>
          <span className="text-xs uppercase tracking-widest font-semibold text-[#5B887E]">
            Historial & Trayectoria
          </span>
        </div>

        <h1
          id="screen-title"
          className="text-3xl sm:text-4xl text-[#2E3A36] font-normal leading-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Tu relación con el peso
        </h1>

        <p className="text-base sm:text-lg text-[#5C6E68] font-normal leading-relaxed">
          Cuéntanos cómo ha sido este camino hasta ahora.
        </p>

        {/* Doctor warmth card */}
        <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-[#EAF1F8]/80 border border-[#8FAFD1]/30 flex items-start gap-3.5 shadow-2xs">
          <div className="p-2 rounded-xl bg-white/80 text-[#8FAFD1] shrink-0 mt-0.5 shadow-2xs">
            <VelaIcon size={22} />
          </div>
          <div className="text-xs sm:text-sm text-[#2E3A36]/90 leading-relaxed space-y-1">
            <p className="font-semibold text-[#3D5A80]">
              El peso no es una cuestión de fuerza de voluntad
            </p>
            <p className="text-[#5C6E68]">
              El cuerpo tiene mecanismos biológicos que regulan y defienden su peso.
              Comprender tus antecedentes nos ayuda a diseñar un enfoque médico seguro, respetuoso y
              sostenible.
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 1: "Tu peso y talla"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#6E9E93]" />
              <h2
                className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Tu peso y talla
              </h2>
            </div>
            <p className="text-xs text-[#5C6E68] mt-1">
              Valores aproximados de peso y estatura que nos orientan sobre el rango de tu cuerpo.
            </p>
          </div>

          {/* Dynamic BMI calculator pill if both values are valid */}
          {(() => {
            const w = parseFloat(formData.currentWeightKg);
            const h = parseFloat(formData.heightCm || '');
            if (!isNaN(w) && !isNaN(h) && w > 25 && h > 90) {
              const hM = h / 100;
              const bmi = (w / (hM * hM)).toFixed(1);
              return (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#EBF3F0] border border-[#6E9E93]/30 text-[#2E3A36] text-xs self-start sm:self-auto shadow-2xs">
                  <span className="text-[#5B887E] font-semibold">IMC calculado:</span>
                  <span className="font-bold text-[#2E3A36]">{bmi} kg/m²</span>
                </div>
              );
            }
            return null;
          })()}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-start">
          {/* 1. Peso actual */}
          <div id="field-currentWeightKg" className="flex flex-col space-y-2">
            <div className="min-h-[42px] flex flex-col justify-end">
              <label
                htmlFor="currentWeightKg-input"
                className="text-sm font-semibold text-[#2E3A36] block leading-tight"
              >
                Peso actual <span className="text-[#F2A488] font-bold">*</span>
              </label>
              <span className="text-xs text-[#8E9E99] leading-normal mt-0.5">
                En este momento
              </span>
            </div>
            <div className="relative">
              <input
                id="currentWeightKg-input"
                type="number"
                step="0.1"
                min="25"
                max="350"
                value={formData.currentWeightKg}
                onChange={(e) => handleChange('currentWeightKg', e.target.value)}
                onBlur={() => handleBlur('currentWeightKg')}
                placeholder="Ej. 72"
                className={`w-full pl-4 pr-11 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.currentWeightKg && errors.currentWeightKg
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E9E99] pointer-events-none select-none">
                kg
              </span>
            </div>
            {touched.currentWeightKg && errors.currentWeightKg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.currentWeightKg}
              </motion.p>
            )}
          </div>

          {/* 2. Talla / Estatura */}
          <div id="field-heightCm" className="flex flex-col space-y-2">
            <div className="min-h-[42px] flex flex-col justify-end">
              <label
                htmlFor="heightCm-input"
                className="text-sm font-semibold text-[#2E3A36] block leading-tight"
              >
                Talla / Estatura <span className="text-[#F2A488] font-bold">*</span>
              </label>
              <span className="text-xs text-[#8E9E99] leading-normal mt-0.5">
                En centímetros
              </span>
            </div>
            <div className="relative">
              <input
                id="heightCm-input"
                type="number"
                step="1"
                min="90"
                max="250"
                value={formData.heightCm || ''}
                onChange={(e) => handleChange('heightCm', e.target.value)}
                onBlur={() => handleBlur('heightCm')}
                placeholder="Ej. 165"
                className={`w-full pl-4 pr-11 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.heightCm && errors.heightCm
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E9E99] pointer-events-none select-none">
                cm
              </span>
            </div>
            {touched.heightCm && errors.heightCm && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.heightCm}
              </motion.p>
            )}
          </div>

          {/* 3. Peso más bajo desde los 18 años */}
          <div id="field-lowestWeightSince18Kg" className="flex flex-col space-y-2">
            <div className="min-h-[42px] flex flex-col justify-end">
              <label
                htmlFor="lowestWeightSince18Kg-input"
                className="text-sm font-semibold text-[#2E3A36] block leading-tight"
              >
                Peso más bajo <span className="text-[#F2A488] font-bold">*</span>
              </label>
              <span className="text-xs text-[#8E9E99] leading-normal mt-0.5">
                Desde los 18 años
              </span>
            </div>
            <div className="relative">
              <input
                id="lowestWeightSince18Kg-input"
                type="number"
                step="0.1"
                min="25"
                max="350"
                value={formData.lowestWeightSince18Kg}
                onChange={(e) =>
                  handleChange('lowestWeightSince18Kg', e.target.value)
                }
                onBlur={() => handleBlur('lowestWeightSince18Kg')}
                placeholder="Ej. 52"
                className={`w-full pl-4 pr-11 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.lowestWeightSince18Kg && errors.lowestWeightSince18Kg
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E9E99] pointer-events-none select-none">
                kg
              </span>
            </div>
            {touched.lowestWeightSince18Kg && errors.lowestWeightSince18Kg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.lowestWeightSince18Kg}
              </motion.p>
            )}
          </div>

          {/* 4. Peso más alto desde los 18 años */}
          <div id="field-highestWeightSince18Kg" className="flex flex-col space-y-2">
            <div className="min-h-[42px] flex flex-col justify-end">
              <label
                htmlFor="highestWeightSince18Kg-input"
                className="text-sm font-semibold text-[#2E3A36] block leading-tight"
              >
                Peso más alto <span className="text-[#F2A488] font-bold">*</span>
              </label>
              <span className="text-xs text-[#8E9E99] leading-normal mt-0.5">
                Desde los 18 años
              </span>
            </div>
            <div className="relative">
              <input
                id="highestWeightSince18Kg-input"
                type="number"
                step="0.1"
                min="25"
                max="350"
                value={formData.highestWeightSince18Kg}
                onChange={(e) =>
                  handleChange('highestWeightSince18Kg', e.target.value)
                }
                onBlur={() => handleBlur('highestWeightSince18Kg')}
                placeholder="Ej. 83.8"
                className={`w-full pl-4 pr-11 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                  touched.highestWeightSince18Kg && errors.highestWeightSince18Kg
                    ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                    : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                }`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E9E99] pointer-events-none select-none">
                kg
              </span>
            </div>
            {touched.highestWeightSince18Kg && errors.highestWeightSince18Kg && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.highestWeightSince18Kg}
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 1.5: "Línea de tiempo y trayectoria de peso" (Momentos clave)
         ========================================================================= */}
      <WeightTrajectoryTimeline
        milestones={formData.weightTrajectoryMilestones || []}
        onChange={(milestones) => handleChange('weightTrajectoryMilestones', milestones)}
      />

      {/* =========================================================================
          SUB-SECCIÓN 2: "Intentos previos para bajar de peso"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Intentos previos para bajar de peso
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Cada intento previo nos ayuda a entender qué estrategias han funcionado y cuáles han sido difíciles.
          </p>
        </div>

        {/* 4. ¿Has hecho intentos previos? (Sí/No) */}
        <div id="field-hasPreviousAttempts" className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span>
              ¿Has hecho intentos previos para bajar de peso?{' '}
              <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(['Sí', 'No'] as const).map((opt) => {
              const isSelected = formData.hasPreviousAttempts === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  id={`attempts-${opt.toLowerCase()}`}
                  onClick={() => {
                    handleChange('hasPreviousAttempts', opt);
                    handleBlur('hasPreviousAttempts');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {touched.hasPreviousAttempts && errors.hasPreviousAttempts && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hasPreviousAttempts}
            </motion.p>
          )}
        </div>

        {/* Campos condicionales si hasPreviousAttempts === 'Sí' */}
        <AnimatePresence>
          {formData.hasPreviousAttempts === 'Sí' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 pt-4 border-t border-[#E8E2D8]/80 overflow-hidden"
            >
              {/* 5. En promedio, ¿cuántas veces has bajado y vuelto a subir de peso? */}
              <div id="field-fluctuationCount" className="space-y-3">
                <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
                  <span>
                    En promedio, ¿cuántas veces has bajado y vuelto a subir de peso?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {FLUCTUATION_OPTIONS.map((opt) => {
                    const isSelected = formData.fluctuationCount === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`fluctuation-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          handleChange('fluctuationCount', opt);
                          handleBlur('fluctuationCount');
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                            : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <span className="truncate">{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                            isSelected
                              ? 'bg-[#6E9E93] text-white'
                              : 'border border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.fluctuationCount && errors.fluctuationCount && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.fluctuationCount}
                  </motion.p>
                )}
              </div>

              {/* 6. ¿Qué tan rápido sueles recuperar el peso que pierdes? */}
              <div id="field-regainSpeed" className="space-y-3">
                <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
                  <span>
                    ¿Qué tan rápido sueles recuperar el peso que pierdes?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {REGAIN_SPEED_OPTIONS.map((opt) => {
                    const isSelected = formData.regainSpeed === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`regain-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          handleChange('regainSpeed', opt);
                          handleBlur('regainSpeed');
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                            : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                            isSelected
                              ? 'bg-[#6E9E93] text-white'
                              : 'border border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.regainSpeed && errors.regainSpeed && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.regainSpeed}
                  </motion.p>
                )}
              </div>

              {/* 7. ¿Cómo has intentado bajar de peso antes? (Selección múltiple) */}
              <div id="field-previousMethods" className="space-y-3">
                <label className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-sm font-semibold text-[#2E3A36]">
                  <span>
                    ¿Cómo has intentado bajar de peso antes?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                  <span className="text-xs font-normal text-[#8E9E99]">
                    Selecciona todas las que apliquen
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PREVIOUS_METHODS_OPTIONS.map((opt) => {
                    const isSelected = formData.previousMethods?.includes(opt);
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`method-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => togglePreviousMethod(opt)}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                            : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <span className="pr-2">{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                            isSelected
                              ? 'bg-[#6E9E93] text-white'
                              : 'border border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.previousMethods && errors.previousMethods && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.previousMethods}
                  </motion.p>
                )}
              </div>

              {/* 8. ¿Incluiste ejercicio en esos intentos? */}
              <div id="field-includedExercise" className="space-y-3">
                <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
                  <span>
                    ¿Incluiste ejercicio en esos intentos?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>

                <div className="grid grid-cols-3 gap-2.5 max-w-md">
                  {EXERCISE_OPTIONS.map((opt) => {
                    const isSelected = formData.includedExercise === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`exercise-${opt.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => {
                          handleChange('includedExercise', opt);
                          handleBlur('includedExercise');
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                            : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                            isSelected
                              ? 'bg-[#6E9E93] text-white'
                              : 'border border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {touched.includedExercise && errors.includedExercise && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.includedExercise}
                  </motion.p>
                )}
              </div>

              {/* 9. ¿Has hecho dietas muy restrictivas? */}
              <div id="field-restrictiveDiets" className="space-y-3">
                <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
                  <span>
                    ¿Has hecho dietas muy restrictivas (muy bajas en calorías o que eliminan grupos completos de alimentos)?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>

                <div className="grid grid-cols-2 gap-3 max-w-sm">
                  {(['Sí', 'No'] as const).map((opt) => {
                    const isSelected = formData.restrictiveDiets === opt;
                    return (
                      <button
                        type="button"
                        key={opt}
                        id={`restrictive-${opt.toLowerCase()}`}
                        onClick={() => {
                          handleChange('restrictiveDiets', opt);
                          handleBlur('restrictiveDiets');
                        }}
                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          isSelected
                            ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                            : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                        }`}
                      >
                        <span>{opt}</span>
                        <div
                          className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                            isSelected
                              ? 'bg-[#6E9E93] text-white'
                              : 'border border-[#C8C2B7]'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Campo opcional: cuéntanos cuáles si Sí */}
                <AnimatePresence>
                  {formData.restrictiveDiets === 'Sí' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2 overflow-hidden"
                    >
                      <div className="space-y-1.5">
                        <label
                          htmlFor="restrictiveDietsDetails-input"
                          className="text-xs font-semibold text-[#5C6E68] flex items-center gap-1"
                        >
                          <span>Cuéntanos cuáles</span>
                          <span className="text-[#8E9E99] font-normal">(opcional)</span>
                        </label>
                        <input
                          id="restrictiveDietsDetails-input"
                          type="text"
                          value={formData.restrictiveDietsDetails || ''}
                          onChange={(e) =>
                            handleChange('restrictiveDietsDetails', e.target.value)
                          }
                          placeholder="Ej. Keto estricta, ayunos prolongados, dieta de la piña, batidos sustitutos..."
                          className="w-full px-4 py-3 rounded-xl bg-white border border-[#AEC9C0] text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {touched.restrictiveDiets && errors.restrictiveDiets && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.restrictiveDiets}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 3: "Medicamentos para el peso"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Pill className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Medicamentos para el peso
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Información médica sobre fármacos previos para comprender tu respuesta metabólica y farmacológica.
          </p>
        </div>

        {/* 10. ¿Has usado medicamentos para bajar de peso? (Sí/No) */}
        <div id="field-usedWeightMedications" className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span>
              ¿Has usado medicamentos para bajar de peso (incluyendo inyectables como Ozempic, Saxenda, Wegovy, Mounjaro u otros)?{' '}
              <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(['Sí', 'No'] as const).map((opt) => {
              const isSelected = formData.usedWeightMedications === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  id={`meds-${opt.toLowerCase()}`}
                  onClick={() => {
                    handleChange('usedWeightMedications', opt);
                    handleBlur('usedWeightMedications');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {touched.usedWeightMedications && errors.usedWeightMedications && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.usedWeightMedications}
            </motion.p>
          )}
        </div>

        {/* Campos condicionales si usedWeightMedications === 'Sí' */}
        <AnimatePresence>
          {formData.usedWeightMedications === 'Sí' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-6 pt-4 border-t border-[#E8E2D8]/80 overflow-hidden"
            >
              {/* 11. ¿Cuáles? */}
              <div id="field-weightMedicationsNames" className="space-y-2">
                <label
                  htmlFor="weightMedicationsNames-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Cuáles medicamentos o inyectables?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <input
                  id="weightMedicationsNames-input"
                  type="text"
                  value={formData.weightMedicationsNames || ''}
                  onChange={(e) =>
                    handleChange('weightMedicationsNames', e.target.value)
                  }
                  onBlur={() => handleBlur('weightMedicationsNames')}
                  placeholder="Ej. Saxenda (liraglutida), Ozempic, Fentermina, Orlistat..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.weightMedicationsNames && errors.weightMedicationsNames
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.weightMedicationsNames && errors.weightMedicationsNames && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.weightMedicationsNames}
                  </motion.p>
                )}
              </div>

              {/* 12. ¿Cómo te fue con ellos? */}
              <div id="field-weightMedicationsExperience" className="space-y-2">
                <label
                  htmlFor="weightMedicationsExperience-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Cómo te fue con ellos?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <textarea
                  id="weightMedicationsExperience-input"
                  rows={3}
                  value={formData.weightMedicationsExperience || ''}
                  onChange={(e) =>
                    handleChange('weightMedicationsExperience', e.target.value)
                  }
                  onBlur={() => handleBlur('weightMedicationsExperience')}
                  placeholder="Cuéntanos si te ayudaron a controlar el apetito, cuánto peso bajaste, por cuánto tiempo los usaste o por qué los suspendiste..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.weightMedicationsExperience &&
                    errors.weightMedicationsExperience
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.weightMedicationsExperience &&
                  errors.weightMedicationsExperience && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.weightMedicationsExperience}
                    </motion.p>
                  )}
              </div>

              {/* 13. ¿Tuviste alguna reacción adversa o síntoma asociado? */}
              <div id="field-weightMedicationsAdverseEffects" className="space-y-2">
                <label
                  htmlFor="weightMedicationsAdverseEffects-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Tuviste alguna reacción adversa o síntoma asociado?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <textarea
                  id="weightMedicationsAdverseEffects-input"
                  rows={3}
                  value={formData.weightMedicationsAdverseEffects || ''}
                  onChange={(e) =>
                    handleChange('weightMedicationsAdverseEffects', e.target.value)
                  }
                  onBlur={() => handleBlur('weightMedicationsAdverseEffects')}
                  placeholder="Ej. Náuseas, reflujo, taquicardia, dolor de cabeza, estreñimiento (o escribe 'Ninguna' si lo toleraste bien)..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base leading-relaxed transition-all duration-200 resize-y focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.weightMedicationsAdverseEffects &&
                    errors.weightMedicationsAdverseEffects
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.weightMedicationsAdverseEffects &&
                  errors.weightMedicationsAdverseEffects && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.weightMedicationsAdverseEffects}
                    </motion.p>
                  )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 4: "Cirugía bariátrica"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Cirugía bariátrica
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Manga gástrica, bypass gástrico, balón intragástrico u otros procedimientos.
          </p>
        </div>

        {/* 14. ¿Te has realizado alguna cirugía bariátrica? (Sí/No) */}
        <div id="field-hadBariatricSurgery" className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span>
              ¿Te has realizado alguna cirugía bariátrica?{' '}
              <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(['Sí', 'No'] as const).map((opt) => {
              const isSelected = formData.hadBariatricSurgery === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  id={`surgery-${opt.toLowerCase()}`}
                  onClick={() => {
                    handleChange('hadBariatricSurgery', opt);
                    handleBlur('hadBariatricSurgery');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {touched.hadBariatricSurgery && errors.hadBariatricSurgery && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hadBariatricSurgery}
            </motion.p>
          )}
        </div>

        {/* Campo condicional si hadBariatricSurgery === 'Sí' */}
        <AnimatePresence>
          {formData.hadBariatricSurgery === 'Sí' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 pt-4 border-t border-[#E8E2D8]/80 overflow-hidden"
            >
              {/* 15. ¿Hace cuánto tiempo? */}
              <div id="field-bariatricSurgeryTimeAgo" className="space-y-2">
                <label
                  htmlFor="bariatricSurgeryTimeAgo-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Hace cuánto tiempo y qué tipo de cirugía fue?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <input
                  id="bariatricSurgeryTimeAgo-input"
                  type="text"
                  value={formData.bariatricSurgeryTimeAgo || ''}
                  onChange={(e) =>
                    handleChange('bariatricSurgeryTimeAgo', e.target.value)
                  }
                  onBlur={() => handleBlur('bariatricSurgeryTimeAgo')}
                  placeholder="Ej. Hace 3 años, Manga gástrica / En 2019, Bypass..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.bariatricSurgeryTimeAgo && errors.bariatricSurgeryTimeAgo
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.bariatricSurgeryTimeAgo && errors.bariatricSurgeryTimeAgo && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.bariatricSurgeryTimeAgo}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 5: "Cirugías estéticas"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Cirugías estéticas
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Procedimientos corporales orientados a moldear o mejorar el peso (liposucción, abdominoplastia, lipoescultura, etc.).
          </p>
        </div>

        {/* ¿Te has realizado alguna cirugía estética? (Sí/No) */}
        <div id="field-hadAestheticSurgery" className="space-y-3">
          <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
            <span>
              ¿Te has realizado alguna cirugía estética para moldear o mejorar tu peso?{' '}
              <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(['Sí', 'No'] as const).map((opt) => {
              const isSelected = formData.hadAestheticSurgery === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  id={`aesthetic-${opt.toLowerCase()}`}
                  onClick={() => {
                    handleChange('hadAestheticSurgery', opt);
                    handleBlur('hadAestheticSurgery');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{opt}</span>
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-2 transition-all ${
                      isSelected
                        ? 'bg-[#6E9E93] text-white'
                        : 'border border-[#C8C2B7]'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>

          {touched.hadAestheticSurgery && errors.hadAestheticSurgery && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hadAestheticSurgery}
            </motion.p>
          )}
        </div>

        {/* Campos condicionales si hadAestheticSurgery === 'Sí' */}
        <AnimatePresence>
          {formData.hadAestheticSurgery === 'Sí' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-5 pt-4 border-t border-[#E8E2D8]/80 overflow-hidden"
            >
              {/* ¿Qué procedimiento(s)? */}
              <div id="field-aestheticSurgeryDetails" className="space-y-2">
                <label
                  htmlFor="aestheticSurgeryDetails-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Qué procedimiento(s) te realizaste?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <input
                  id="aestheticSurgeryDetails-input"
                  type="text"
                  value={formData.aestheticSurgeryDetails || ''}
                  onChange={(e) =>
                    handleChange('aestheticSurgeryDetails', e.target.value)
                  }
                  onBlur={() => handleBlur('aestheticSurgeryDetails')}
                  placeholder="Ej. Liposucción abdominal, abdominoplastia, marcación..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.aestheticSurgeryDetails && errors.aestheticSurgeryDetails
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.aestheticSurgeryDetails && errors.aestheticSurgeryDetails && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.aestheticSurgeryDetails}
                  </motion.p>
                )}
              </div>

              {/* ¿Hace cuánto tiempo? */}
              <div id="field-aestheticSurgeryTimeAgo" className="space-y-2">
                <label
                  htmlFor="aestheticSurgeryTimeAgo-input"
                  className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
                >
                  <span>
                    ¿Hace cuánto tiempo fue la cirugía estética?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </span>
                </label>
                <input
                  id="aestheticSurgeryTimeAgo-input"
                  type="text"
                  value={formData.aestheticSurgeryTimeAgo || ''}
                  onChange={(e) =>
                    handleChange('aestheticSurgeryTimeAgo', e.target.value)
                  }
                  onBlur={() => handleBlur('aestheticSurgeryTimeAgo')}
                  placeholder="Ej. Hace 2 años, en 2021, hace 6 meses..."
                  className={`w-full px-4 py-3.5 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-base transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                    touched.aestheticSurgeryTimeAgo && errors.aestheticSurgeryTimeAgo
                      ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                      : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                  }`}
                />
                {touched.aestheticSurgeryTimeAgo && errors.aestheticSurgeryTimeAgo && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                  >
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {errors.aestheticSurgeryTimeAgo}
                  </motion.p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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
              Completa los campos obligatorios (*) para avanzar al siguiente paso
            </p>
          )}
        </div>
      </div>
    </form>
  );
};
