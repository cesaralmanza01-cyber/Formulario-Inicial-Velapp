import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Activity,
  Users,
  Check,
  ArrowRight,
  ArrowLeft,
  Info,
  ShieldCheck,
  Stethoscope,
  Heart,
  Baby,
  Calendar,
  Sparkles,
} from 'lucide-react';
import {
  PatientHealthMapInfo,
  FamilyHistoryCondition,
  CycleRegularity,
  MenopauseStage,
  StepFourErrors,
} from '../types';

interface StepFourFormProps {
  initialData?: PatientHealthMapInfo;
  onBack: () => void;
  onContinue: (data: PatientHealthMapInfo) => void;
}

const FAMILY_CONDITIONS: { id: FamilyHistoryCondition; label: string; description: string }[] = [
  {
    id: 'Obesidad',
    label: 'Obesidad',
    description: 'Dificultad histórica o genética con el peso corporal',
  },
  {
    id: 'Enfermedades cardiovasculares',
    label: 'Enfermedades cardiovasculares',
    description: 'Hipertensión arterial, infartos, arritmias, trombosis',
  },
  {
    id: 'Diabetes',
    label: 'Diabetes',
    description: 'Diabetes tipo 1, tipo 2 o antecedentes de prediabetes',
  },
  {
    id: 'Enfermedad tiroidea',
    label: 'Enfermedad tiroidea',
    description: 'Hipotiroidismo, hipertiroidismo, tiroiditis de Hashimoto',
  },
  {
    id: 'Cáncer',
    label: 'Cáncer',
    description: 'Cualquier tipo de diagnóstico oncológico en línea directa',
  },
  {
    id: 'Enfermedad renal',
    label: 'Enfermedad renal',
    description: 'Insuficiencia renal, cálculos o afecciones crónicas del riñón',
  },
];

const NUMBER_OPTIONS = ['0', '1', '2', '3', '4', '5 o más'];

const CYCLE_REGULARITY_OPTIONS: { id: CycleRegularity; label: string; description: string }[] = [
  {
    id: 'Regulares',
    label: 'Regulares',
    description: 'Llegan aproximadamente en las mismas fechas cada 24-35 días',
  },
  {
    id: 'Irregulares',
    label: 'Irregulares',
    description: 'Varían significativamente en frecuencia o duración entre meses',
  },
  {
    id: 'No menstruo actualmente (anticonceptivo / DIU / tratamiento)',
    label: 'No menstruo por método anticonceptivo o tratamiento',
    description: 'DIU hormonal, implante, pastillas continuas u otra indicación',
  },
  {
    id: 'Ya no menstruo (menopausia / histerectomía)',
    label: 'Ya no menstruo (menopausia o histerectomía)',
    description: 'Cese permanente de la menstruación',
  },
];

const MENOPAUSE_STAGE_OPTIONS: { id: MenopauseStage; label: string; description: string }[] = [
  {
    id: 'No estoy en perimenopausia ni menopausia',
    label: 'No',
    description: 'Edad fértil / ciclos habituales sin síntomas de transición',
  },
  {
    id: 'Perimenopausia',
    label: 'Perimenopausia',
    description: 'Etapa de transición con cambios en el ciclo, sofocos iniciales o cambios de ánimo',
  },
  {
    id: 'Menopausia',
    label: 'Menopausia',
    description: 'Cese completo de la menstruación por 12 meses consecutivos o más',
  },
];

const MENOPAUSE_SYMPTOMS_OPTIONS = [
  'Bochornos / Sofocos y calor súbito',
  'Sudoraciones nocturnas',
  'Cambios de humor, irritabilidad o ansiedad',
  'Insomnio o alteraciones del sueño',
  'Resequedad vaginal o en la piel',
  'Niebla mental, fatiga o dificultad para concentrarse',
  'Aumento de peso o redistribución de grasa abdominal',
  'Dolor muscular o articular',
];

export const StepFourForm: React.FC<StepFourFormProps> = ({
  initialData,
  onBack,
  onContinue,
}) => {
  const [formData, setFormData] = useState<PatientHealthMapInfo>(() => {
    const saved = localStorage.getItem('vela_step4_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallthrough to initial
      }
    }
    return (
      initialData || {
        pathologicalHistory: '',
        pharmacologicalHistory: '',
        surgicalHistory: '',
        hospitalHistory: '',
        toxicAllergicHistory: '',
        appliesGynecoObstetric: '',
        pregnanciesCount: '0',
        vaginalDeliveriesCount: '0',
        cesareanCount: '0',
        lossesCount: '0',
        cycleRegularity: '',
        cycleDuration: '',
        menarcheAge: '',
        menopauseStage: '',
        menopauseSymptoms: [],
        menopauseSymptomsOther: '',
        hasEatingDisorderHistory: '',
        eatingDisorderDetails: '',
        familyHistory: [],
        familyHistoryNotes: '',
      }
    );
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({
    pathologicalHistory: false,
    pharmacologicalHistory: false,
    surgicalHistory: false,
    hospitalHistory: false,
    toxicAllergicHistory: false,
    appliesGynecoObstetric: false,
    pregnanciesCount: false,
    vaginalDeliveriesCount: false,
    cesareanCount: false,
    lossesCount: false,
    cycleRegularity: false,
    cycleDuration: false,
    menarcheAge: false,
    menopauseStage: false,
    hasEatingDisorderHistory: false,
    eatingDisorderDetails: false,
    familyHistory: false,
    familyHistoryNotes: false,
  });

  const [errors, setErrors] = useState<StepFourErrors>({});

  // Auto-save draft on every change
  useEffect(() => {
    localStorage.setItem('vela_step4_data', JSON.stringify(formData));
  }, [formData]);

  // Validation function
  const validateField = (
    field: keyof PatientHealthMapInfo,
    currentForm: PatientHealthMapInfo
  ): string => {
    switch (field) {
      case 'pathologicalHistory':
        if (!currentForm.pathologicalHistory.trim()) {
          return 'Por favor registra tus antecedentes de enfermedades o escribe "Ninguno conocido".';
        }
        return '';

      case 'pharmacologicalHistory':
        if (!currentForm.pharmacologicalHistory.trim()) {
          return 'Por favor registra tus medicamentos actuales o escribe "Ninguno".';
        }
        return '';

      case 'surgicalHistory':
        if (!currentForm.surgicalHistory.trim()) {
          return 'Por favor registra tus cirugías previas o escribe "Ninguna".';
        }
        return '';

      case 'hospitalHistory':
        if (!currentForm.hospitalHistory.trim()) {
          return 'Por favor registra si has tenido hospitalizaciones o escribe "Ninguna".';
        }
        return '';

      case 'toxicAllergicHistory':
        if (!currentForm.toxicAllergicHistory.trim()) {
          return 'Por favor registra alergias y hábitos de consumo o escribe "Ninguno".';
        }
        return '';

      case 'appliesGynecoObstetric':
        if (!currentForm.appliesGynecoObstetric) {
          return 'Por favor selecciona si aplica en tu caso registrar antecedentes gineco-obstétricos.';
        }
        return '';

      case 'menarcheAge':
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.menarcheAge?.trim()) {
          return 'Por favor indica a qué edad tuviste tu primer período (desarrollo).';
        }
        return '';

      case 'cycleRegularity':
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.cycleRegularity) {
          return 'Por favor selecciona cómo son tus ciclos menstruales.';
        }
        return '';

      case 'cycleDuration':
        if (
          currentForm.appliesGynecoObstetric === 'Sí' &&
          (currentForm.cycleRegularity === 'Regulares' || currentForm.cycleRegularity === 'Irregulares') &&
          !currentForm.cycleDuration?.trim()
        ) {
          return 'Por favor indícanos cuánto duran tus ciclos / días de sangrado.';
        }
        return '';

      case 'menopauseStage':
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.menopauseStage) {
          return 'Por favor indica si te encuentras en perimenopausia o menopausia.';
        }
        return '';

      case 'hasEatingDisorderHistory':
        if (!currentForm.hasEatingDisorderHistory) {
          return 'Por favor responde a esta pregunta.';
        }
        return '';

      default:
        return '';
    }
  };

  const handleChange = (
    field: keyof PatientHealthMapInfo,
    value: any
  ) => {
    const updatedForm = { ...formData, [field]: value };
    setFormData(updatedForm);

    if (touched[field]) {
      const errorMsg = validateField(field, updatedForm);
      setErrors((prev) => ({ ...prev, [field]: errorMsg }));
    }
  };

  const handleBlur = (field: keyof PatientHealthMapInfo) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const errorMsg = validateField(field, formData);
    setErrors((prev) => ({ ...prev, [field]: errorMsg }));
  };

  const toggleFamilyCondition = (condition: FamilyHistoryCondition) => {
    const current = formData.familyHistory || [];
    const exists = current.includes(condition);
    const updated = exists
      ? current.filter((c) => c !== condition)
      : [...current, condition];

    handleChange('familyHistory', updated);
  };

  const toggleMenopauseSymptom = (symptom: string) => {
    const current = formData.menopauseSymptoms || [];
    const exists = current.includes(symptom);
    const updated = exists
      ? current.filter((s) => s !== symptom)
      : [...current, symptom];

    handleChange('menopauseSymptoms', updated);
  };

  // Form validity check
  const isFormValid = (() => {
    if (!formData.pathologicalHistory.trim()) return false;
    if (!formData.pharmacologicalHistory.trim()) return false;
    if (!formData.surgicalHistory.trim()) return false;
    if (!formData.hospitalHistory.trim()) return false;
    if (!formData.toxicAllergicHistory.trim()) return false;

    // Gineco-obstétrico validation
    if (!formData.appliesGynecoObstetric) return false;
    if (formData.appliesGynecoObstetric === 'Sí') {
      if (!formData.menarcheAge?.trim()) return false;
      if (!formData.cycleRegularity) return false;
      if (
        (formData.cycleRegularity === 'Regulares' || formData.cycleRegularity === 'Irregulares') &&
        !formData.cycleDuration?.trim()
      ) {
        return false;
      }
      if (!formData.menopauseStage) return false;
    }

    // TCA
    if (!formData.hasEatingDisorderHistory) return false;

    return true;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      pathologicalHistory: true,
      pharmacologicalHistory: true,
      surgicalHistory: true,
      hospitalHistory: true,
      toxicAllergicHistory: true,
      appliesGynecoObstetric: true,
      pregnanciesCount: true,
      vaginalDeliveriesCount: true,
      cesareanCount: true,
      lossesCount: true,
      cycleRegularity: true,
      cycleDuration: true,
      menarcheAge: true,
      menopauseStage: true,
      hasEatingDisorderHistory: true,
      eatingDisorderDetails: true,
      familyHistory: true,
      familyHistoryNotes: true,
    };
    setTouched(allTouched);

    const newErrors: StepFourErrors = {
      pathologicalHistory: validateField('pathologicalHistory', formData),
      pharmacologicalHistory: validateField('pharmacologicalHistory', formData),
      surgicalHistory: validateField('surgicalHistory', formData),
      hospitalHistory: validateField('hospitalHistory', formData),
      toxicAllergicHistory: validateField('toxicAllergicHistory', formData),
      appliesGynecoObstetric: validateField('appliesGynecoObstetric', formData),
      menarcheAge: validateField('menarcheAge', formData),
      cycleRegularity: validateField('cycleRegularity', formData),
      cycleDuration: validateField('cycleDuration', formData),
      menopauseStage: validateField('menopauseStage', formData),
      hasEatingDisorderHistory: validateField('hasEatingDisorderHistory', formData),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => !!err);
    if (!hasAnyError && isFormValid) {
      onContinue(formData);
    } else {
      // Scroll smoothly to first invalid field
      const firstInvalidId = Object.keys(newErrors).find(
        (key) => !!newErrors[key as keyof StepFourErrors]
      );
      if (firstInvalidId) {
        const element = document.getElementById(`field-${firstInvalidId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header Banner & Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EBF3F0] text-[#5B887E] text-xs font-semibold tracking-wide">
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Pantalla 4 de 5</span>
        </div>

        <h1
          className="text-3xl sm:text-4xl text-[#2E3A36] font-normal tracking-tight"
          style={{ fontFamily: "'Fraunces', Georgia, serif" }}
        >
          Tu mapa de salud
        </h1>

        <p className="text-base text-[#5C6E68] leading-relaxed max-w-2xl">
          Esta información nos ayuda a entender el panorama completo antes de tu consulta.
        </p>

        {/* Empathy Medical Note Card */}
        <div className="mt-4 p-4 rounded-2xl bg-[#EAF1F8] border border-[#8FAFD1]/35 text-[#3D5A80] text-sm flex items-start gap-3 shadow-2xs">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-[#5A7C99]" />
          <p className="leading-relaxed text-xs sm:text-sm">
            Toda la información registrada aquí es <strong>estrictamente confidencial</strong> y
            forma parte de tu historial clínico protegido. Si no tienes antecedentes en algún
            campo general, puedes escribir con tranquilidad <em>"Ninguno"</em>.
          </p>
        </div>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 1: "Antecedentes generales"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Antecedentes generales
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Tu historial médico personal y tratamientos en curso.
          </p>
        </div>

        {/* 1. Antecedentes patológicos */}
        <div id="field-pathologicalHistory" className="space-y-2">
          <label
            htmlFor="pathologicalHistory-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span>
              1. Antecedentes patológicos <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Enfermedades que tengas actualmente o hayas tenido (ej. hipertensión, resistencia a la
            insulina, hipotiroidismo, reflujo, apnea del sueño, diabetes, etc.).
          </p>
          <textarea
            id="pathologicalHistory-input"
            rows={3}
            value={formData.pathologicalHistory}
            onChange={(e) => handleChange('pathologicalHistory', e.target.value)}
            onBlur={() => handleBlur('pathologicalHistory')}
            placeholder="Ej. Resistencia a la insulina diagnosticada en 2022, rinitis alérgica ocasional... (o 'Ninguno conocido')"
            className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              touched.pathologicalHistory && errors.pathologicalHistory
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.pathologicalHistory && errors.pathologicalHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.pathologicalHistory}
            </motion.p>
          )}
        </div>

        {/* 2. Antecedentes farmacológicos */}
        <div id="field-pharmacologicalHistory" className="space-y-2">
          <label
            htmlFor="pharmacologicalHistory-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span>
              2. Antecedentes farmacológicos <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Medicamentos que tomes actualmente, todos, aunque no sean para el peso (incluye
            anticonceptivos, suplementos o tratamientos continuos).
          </p>
          <textarea
            id="pharmacologicalHistory-input"
            rows={3}
            value={formData.pharmacologicalHistory}
            onChange={(e) => handleChange('pharmacologicalHistory', e.target.value)}
            onBlur={() => handleBlur('pharmacologicalHistory')}
            placeholder="Ej. Levotiroxina 50mcg en ayunas, suplemento de vitamina D... (o 'Ninguno actualmente')"
            className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              touched.pharmacologicalHistory && errors.pharmacologicalHistory
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.pharmacologicalHistory && errors.pharmacologicalHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.pharmacologicalHistory}
            </motion.p>
          )}
        </div>

        {/* 3. Antecedentes quirúrgicos */}
        <div id="field-surgicalHistory" className="space-y-2">
          <label
            htmlFor="surgicalHistory-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span>
              3. Antecedentes quirúrgicos <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Cirugías previas, distintas a la bariátrica (ej. apendicectomía, cesárea, vesícula,
            artroscopia...).
          </p>
          <textarea
            id="surgicalHistory-input"
            rows={2}
            value={formData.surgicalHistory}
            onChange={(e) => handleChange('surgicalHistory', e.target.value)}
            onBlur={() => handleBlur('surgicalHistory')}
            placeholder="Ej. Apendicectomía en 2015, vesícula en 2019... (o 'Ninguna cirugía previa')"
            className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              touched.surgicalHistory && errors.surgicalHistory
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.surgicalHistory && errors.surgicalHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.surgicalHistory}
            </motion.p>
          )}
        </div>

        {/* 4. Antecedentes hospitalarios */}
        <div id="field-hospitalHistory" className="space-y-2">
          <label
            htmlFor="hospitalHistory-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span>
              4. Antecedentes hospitalarios <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Hospitalizaciones importantes que hayas tenido a lo largo de tu vida.
          </p>
          <textarea
            id="hospitalHistory-input"
            rows={2}
            value={formData.hospitalHistory}
            onChange={(e) => handleChange('hospitalHistory', e.target.value)}
            onBlur={() => handleBlur('hospitalHistory')}
            placeholder="Ej. Hospitalización por neumonía en 2020 durante 4 días... (o 'Ninguna hospitalización')"
            className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              touched.hospitalHistory && errors.hospitalHistory
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.hospitalHistory && errors.hospitalHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hospitalHistory}
            </motion.p>
          )}
        </div>

        {/* 5. Antecedentes tóxico-alérgicos */}
        <div id="field-toxicAllergicHistory" className="space-y-2">
          <label
            htmlFor="toxicAllergicHistory-input"
            className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]"
          >
            <span>
              5. Antecedentes tóxico-alérgicos <span className="text-[#F2A488] font-bold">*</span>
            </span>
          </label>
          <p className="text-xs text-[#5C6E68]">
            Alergias (medicamentos, alimentos u otras) y consumo de tabaco, alcohol u otras
            sustancias.
          </p>
          <textarea
            id="toxicAllergicHistory-input"
            rows={2}
            value={formData.toxicAllergicHistory}
            onChange={(e) => handleChange('toxicAllergicHistory', e.target.value)}
            onBlur={() => handleBlur('toxicAllergicHistory')}
            placeholder="Ej. Alergia a la Penicilina y a los mariscos. Consumo de alcohol social ocasional, no fumo... (o 'Sin alergias ni hábitos tóxicos')"
            className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y ${
              touched.toxicAllergicHistory && errors.toxicAllergicHistory
                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          />
          {touched.toxicAllergicHistory && errors.toxicAllergicHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.toxicAllergicHistory}
            </motion.p>
          )}
        </div>

        {/* 6. Antecedentes gineco-obstétricos estructurados */}
        <div id="field-appliesGynecoObstetric" className="space-y-5 pt-3 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-[#6E9E93]" />
              <label className="text-sm font-semibold text-[#2E3A36]">
                6. Antecedentes gineco-obstétricos <span className="text-[#F2A488] font-bold">*</span>
              </label>
            </div>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              ¿Aplica a tu historia clínica antecedentes gineco-obstétricos (mujer / anatomía femenina)?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {(
              [
                { value: 'Sí', label: 'Sí, aplica (mujer)' },
                { value: 'No', label: 'No aplica (hombre)' },
              ] as const
            ).map((opt) => {
              const isSelected = formData.appliesGynecoObstetric === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    handleChange('appliesGynecoObstetric', opt.value);
                    handleBlur('appliesGynecoObstetric');
                  }}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <span>{opt.label}</span>
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

          {touched.appliesGynecoObstetric && errors.appliesGynecoObstetric && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.appliesGynecoObstetric}
            </motion.p>
          )}

          {/* CAMPOS ESTRUCTURADOS GINECO-OBSTÉTRICOS */}
          <AnimatePresence>
            {formData.appliesGynecoObstetric === 'Sí' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-6 pt-3 overflow-hidden"
              >
                {/* Cuadrícula de fórmula obstétrica (Gestaciones, Partos, Cesáreas, Pérdidas) */}
                <div className="bg-[#FAF6F0]/70 p-4 sm:p-5 rounded-2xl border border-[#D9D3C8]/80 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-2">
                    <span className="text-xs font-semibold text-[#2E3A36] uppercase tracking-wider">
                      Fórmula obstétrica (G - P - C - A)
                    </span>
                    <span className="text-[11px] text-[#8E9E99]">Selecciona la cantidad</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Gestaciones (G) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                        <span>Gestaciones (G)</span>
                      </label>
                      <p className="text-[11px] text-[#8E9E99]">Total embarazos</p>
                      <select
                        value={formData.pregnanciesCount || '0'}
                        onChange={(e) => handleChange('pregnanciesCount', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-sm text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                      >
                        {NUMBER_OPTIONS.map((num) => (
                          <option key={num} value={num}>
                            {num} {num === '1' ? 'embarazo' : 'embarazos'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Partos vaginales (P) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                        <span>Partos vaginales (P)</span>
                      </label>
                      <p className="text-[11px] text-[#8E9E99]">Partos naturales</p>
                      <select
                        value={formData.vaginalDeliveriesCount || '0'}
                        onChange={(e) => handleChange('vaginalDeliveriesCount', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-sm text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                      >
                        {NUMBER_OPTIONS.map((num) => (
                          <option key={num} value={num}>
                            {num} {num === '1' ? 'parto' : 'partos'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Cesáreas (C) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                        <span>Cesáreas (C)</span>
                      </label>
                      <p className="text-[11px] text-[#8E9E99]">Nacimientos por cesárea</p>
                      <select
                        value={formData.cesareanCount || '0'}
                        onChange={(e) => handleChange('cesareanCount', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-sm text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                      >
                        {NUMBER_OPTIONS.map((num) => (
                          <option key={num} value={num}>
                            {num} {num === '1' ? 'cesárea' : 'cesáreas'}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Pérdidas / Abortos (A) */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between">
                        <span>Pérdidas / Abortos (A)</span>
                      </label>
                      <p className="text-[11px] text-[#8E9E99]">Espontáneas o inducidas</p>
                      <select
                        value={formData.lossesCount || '0'}
                        onChange={(e) => handleChange('lossesCount', e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-sm text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                      >
                        {NUMBER_OPTIONS.map((num) => (
                          <option key={num} value={num}>
                            {num} {num === '1' ? 'pérdida' : 'pérdidas'}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fecha / edad en que se desarrolló */}
                <div id="field-menarcheAge" className="space-y-2">
                  <label
                    htmlFor="menarcheAge-input"
                    className="text-xs font-semibold text-[#2E3A36] block"
                  >
                    ¿A qué edad fue tu primera menstruación (menarquía / desarrollo)?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <div className="relative max-w-xs">
                    <input
                      id="menarcheAge-input"
                      type="text"
                      value={formData.menarcheAge || ''}
                      onChange={(e) => handleChange('menarcheAge', e.target.value)}
                      onBlur={() => handleBlur('menarcheAge')}
                      placeholder="Ej. 12"
                      className={`w-full pr-14 pl-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                        touched.menarcheAge && errors.menarcheAge
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#8E9E99] pointer-events-none select-none">
                      años
                    </span>
                  </div>
                  {touched.menarcheAge && errors.menarcheAge && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.menarcheAge}
                    </motion.p>
                  )}
                </div>

                {/* Regularidad de los ciclos */}
                <div id="field-cycleRegularity" className="space-y-2">
                  <label className="text-xs font-semibold text-[#2E3A36] block">
                    ¿Cómo son tus ciclos menstruales habitualmente?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CYCLE_REGULARITY_OPTIONS.map((opt) => {
                      const isSelected = formData.cycleRegularity === opt.id;
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => {
                            handleChange('cycleRegularity', opt.id);
                            handleBlur('cycleRegularity');
                          }}
                          className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EBF3F0] border-[#6E9E93] shadow-2xs'
                              : 'bg-[#FAF6F0]/60 border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-[#2E3A36]">{opt.label}</p>
                            <p className="text-[11px] text-[#5C6E68] leading-tight">{opt.description}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 mt-0.5 transition-all ${
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

                  {touched.cycleRegularity && errors.cycleRegularity && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.cycleRegularity}
                    </motion.p>
                  )}
                </div>

                {/* Cuánto duran los ciclos (si menstrua) */}
                {(formData.cycleRegularity === 'Regulares' ||
                  formData.cycleRegularity === 'Irregulares') && (
                  <div id="field-cycleDuration" className="space-y-2">
                    <label
                      htmlFor="cycleDuration-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿Cuánto duran tus ciclos habitualmente y cuántos días sangras?{' '}
                      <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="cycleDuration-input"
                      type="text"
                      value={formData.cycleDuration || ''}
                      onChange={(e) => handleChange('cycleDuration', e.target.value)}
                      onBlur={() => handleBlur('cycleDuration')}
                      placeholder="Ej. Ciclos cada 28-30 días, sangrado de 4-5 días con flujo moderado..."
                      className={`w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white ${
                        touched.cycleDuration && errors.cycleDuration
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.cycleDuration && errors.cycleDuration && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {errors.cycleDuration}
                      </motion.p>
                    )}
                  </div>
                )}

                {/* Perimenopausia o Menopausia */}
                <div id="field-menopauseStage" className="space-y-2">
                  <label className="text-xs font-semibold text-[#2E3A36] block">
                    ¿Te encuentras en perimenopausia o menopausia?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {MENOPAUSE_STAGE_OPTIONS.map((opt) => {
                      const isSelected = formData.menopauseStage === opt.id;
                      return (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => {
                            handleChange('menopauseStage', opt.id);
                            handleBlur('menopauseStage');
                          }}
                          className={`p-3 rounded-xl border text-left flex items-start justify-between gap-2 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EBF3F0] border-[#6E9E93] shadow-2xs'
                              : 'bg-[#FAF6F0]/60 border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                          }`}
                        >
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-[#2E3A36]">{opt.label}</p>
                            <p className="text-[11px] text-[#5C6E68] leading-tight">{opt.description}</p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 mt-0.5 transition-all ${
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

                  {touched.menopauseStage && errors.menopauseStage && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.menopauseStage}
                    </motion.p>
                  )}
                </div>

                {/* Síntomas asociados si perimenopausia / menopausia */}
                {(formData.menopauseStage === 'Perimenopausia' ||
                  formData.menopauseStage === 'Menopausia') && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 p-4 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/90"
                  >
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#6E9E93]" />
                      <label className="text-xs font-semibold text-[#2E3A36]">
                        Síntomas hormonales asociados que experimentas actualmente:
                      </label>
                    </div>
                    <p className="text-[11px] text-[#5C6E68]">
                      Marca todos los que apliquen para personalizar tu plan terapéutico y nutricional:
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {MENOPAUSE_SYMPTOMS_OPTIONS.map((symptom) => {
                        const isChecked = (formData.menopauseSymptoms || []).includes(symptom);
                        return (
                          <button
                            type="button"
                            key={symptom}
                            onClick={() => toggleMenopauseSymptom(symptom)}
                            className={`p-2.5 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-all duration-200 cursor-pointer ${
                              isChecked
                                ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] font-semibold'
                                : 'bg-white/70 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
                            }`}
                          >
                            <span>{symptom}</span>
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                isChecked
                                  ? 'bg-[#6E9E93] border-[#6E9E93] text-white'
                                  : 'border-[#C8C2B7] bg-white'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Otros síntomas asociados */}
                    <div className="pt-2">
                      <input
                        type="text"
                        value={formData.menopauseSymptomsOther || ''}
                        onChange={(e) => handleChange('menopauseSymptomsOther', e.target.value)}
                        placeholder="Otros síntomas hormonales o ginecológicos (opcional)..."
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 7. Trastorno de la conducta alimentaria (TCA) */}
        <div id="field-hasEatingDisorderHistory" className="space-y-3 pt-3 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
              <span>
                7. ¿Tienes o has tenido diagnóstico de algún trastorno de la conducta alimentaria?{' '}
                <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>
            <p className="text-xs text-[#5C6E68]">
              Esta pregunta nos permite cuidar con extrema sensibilidad tu proceso y evitar
              cualquier abordaje que pueda resultar detonante.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-sm">
            {(['Sí', 'No'] as const).map((opt) => {
              const isSelected = formData.hasEatingDisorderHistory === opt;
              return (
                <button
                  type="button"
                  key={opt}
                  onClick={() => {
                    handleChange('hasEatingDisorderHistory', opt);
                    handleBlur('hasEatingDisorderHistory');
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

          {touched.hasEatingDisorderHistory && errors.hasEatingDisorderHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hasEatingDisorderHistory}
            </motion.p>
          )}

          {/* Campo de texto opcional si Sí */}
          <AnimatePresence>
            {formData.hasEatingDisorderHistory === 'Sí' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-2 pt-2 overflow-hidden"
              >
                <label
                  htmlFor="eatingDisorderDetails-input"
                  className="text-xs font-semibold text-[#2E3A36] block"
                >
                  Cuéntanos cuál y cuándo <span className="text-[#8E9E99] font-normal">(opcional)</span>
                </label>
                <input
                  id="eatingDisorderDetails-input"
                  type="text"
                  value={formData.eatingDisorderDetails || ''}
                  onChange={(e) => handleChange('eatingDisorderDetails', e.target.value)}
                  placeholder="Ej. Anorexia nerviosa en la adolescencia (2014), atracones hace 3 años..."
                  className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white hover:border-[#AEC9C0]"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* =========================================================================
          SUB-SECCIÓN 2: "Antecedentes familiares"
         ========================================================================= */}
      <div className="space-y-6 bg-white/70 backdrop-blur-xs p-6 sm:p-8 rounded-3xl border border-[#AEC9C0]/30 shadow-xs">
        <div className="border-b border-[#E8E2D8] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#6E9E93]" />
            <h2
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Antecedentes familiares
            </h2>
          </div>
          <p className="text-xs text-[#5C6E68] mt-1">
            Factores biológicos y hereditarios en tu familia directa (padres, hermanos, abuelos).
          </p>
        </div>

        {/* Checklist selección múltiple */}
        <div id="field-familyHistory" className="space-y-3">
          <label className="text-sm font-semibold text-[#2E3A36] block">
            8. ¿Alguien en tu familia directa (padres, hermanos, abuelos) ha tenido...?
          </label>
          <p className="text-xs text-[#5C6E68]">
            Selecciona todas las condiciones que apliquen. Si no aplica ninguna, puedes dejarlas sin
            marcar.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {FAMILY_CONDITIONS.map((item) => {
              const isChecked = (formData.familyHistory || []).includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleFamilyCondition(item.id)}
                  className={`p-3.5 rounded-2xl border text-left flex items-start justify-between gap-3 transition-all duration-200 cursor-pointer ${
                    isChecked
                      ? 'bg-[#EBF3F0] border-[#6E9E93] shadow-2xs'
                      : 'bg-[#FAF6F0]/60 border-[#D9D3C8] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                  }`}
                >
                  <div className="space-y-0.5 pr-2">
                    <p
                      className={`text-sm font-semibold leading-tight ${
                        isChecked ? 'text-[#2E3A36]' : 'text-[#2E3A36]'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[11px] text-[#5C6E68] leading-normal">
                      {item.description}
                    </p>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors mt-0.5 ${
                      isChecked
                        ? 'bg-[#6E9E93] border-[#6E9E93] text-white'
                        : 'border-[#C8C2B7] bg-white'
                    }`}
                  >
                    {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notas adicionales familiares opcionales */}
        <div id="field-familyHistoryNotes" className="space-y-2 pt-2 border-t border-[#E8E2D8]/80">
          <label
            htmlFor="familyHistoryNotes-input"
            className="text-xs font-semibold text-[#2E3A36] block"
          >
            Notas adicionales sobre antecedentes familiares{' '}
            <span className="text-[#8E9E99] font-normal">(opcional)</span>
          </label>
          <textarea
            id="familyHistoryNotes-input"
            rows={2}
            value={formData.familyHistoryNotes || ''}
            onChange={(e) => handleChange('familyHistoryNotes', e.target.value)}
            placeholder="Ej. Mamá con hipotiroidismo y diabetes tipo 2 a los 55 años, abuelo paterno con hipertensión..."
            className="w-full px-4 py-3 rounded-xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white resize-y hover:border-[#AEC9C0]"
          />
        </div>
      </div>

      {/* Bottom Navigation & Actions Bar */}
      <div className="pt-2 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Botón Atrás */}
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer order-2 sm:order-1"
        >
          <ArrowLeft className="w-4 h-4 text-[#5B887E]" />
          <span>Atrás</span>
        </button>

        {/* Right: Botón Continuar */}
        <button
          type="submit"
          disabled={!isFormValid}
          className={`w-full sm:w-auto px-8 py-3.5 rounded-xl font-medium text-sm shadow-sm transition-all duration-200 flex items-center justify-center gap-2 order-1 sm:order-2 ${
            isFormValid
              ? 'bg-[#6E9E93] hover:bg-[#5B887E] text-white cursor-pointer hover:shadow-md'
              : 'bg-[#C5D6D0] text-white/80 cursor-not-allowed'
          }`}
        >
          <span>Continuar</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </form>
  );
};
