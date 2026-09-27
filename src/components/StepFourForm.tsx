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
  Plus,
  Trash2,
  AlertCircle,
  Pill,
  Clock,
  X,
  Cigarette,
  Wine,
} from 'lucide-react';
import {
  PatientHealthMapInfo,
  PatientMedicationEntry,
  FamilyHistoryCondition,
  CycleRegularity,
  MenopauseStage,
  StepFourErrors,
  OBESOGENIC_DRUGS_LIST,
  FAMILY_OBESITY_MEMBERS,
  FAMILY_OBESITY_ONSET_AGES,
  FAMILY_COMORBIDITIES_LIST,
  ObesityFamilyMemberEntry,
  PatientSex,
  SmokingStatus,
  AlcoholConsumption,
  ContraceptiveMethod,
  CONTRACEPTIVE_METHODS,
  PregnancyPlan,
  PREGNANCY_PLAN_OPTIONS,
  BoneDensitometryResult,
  BONE_DENSITOMETRY_RESULTS,
  HormoneTherapyOption,
  HORMONE_THERAPY_OPTIONS,
  normalizeYesNo,
} from '../types';

interface StepFourFormProps {
  initialData?: PatientHealthMapInfo;
  patientSex?: PatientSex;
  onBack: () => void;
  onContinue: (data: PatientHealthMapInfo) => void;
}

const SMOKING_STATUS_OPTIONS: SmokingStatus[] = [
  'Nunca he fumado',
  'Fumo actualmente',
  'Fumé pero ya lo dejé',
];

const ALCOHOL_CONSUMPTION_OPTIONS: AlcoholConsumption[] = [
  'No consumo',
  'Ocasionalmente (menos de 1 vez al mes)',
  '1 a 4 veces al mes',
  '2 a 3 veces por semana',
  '4 o más veces por semana',
];

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

const MONTHS_SPANISH = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const currentYear = new Date().getFullYear();
const MEDICATION_YEARS = Array.from({ length: currentYear - 1980 + 1 }, (_, i) =>
  (currentYear - i).toString()
).concat(['Antes de 1980']);

const COMMON_OTHER_MEDICATIONS_SUGGESTIONS = [
  'Levotiroxina (Eutirox)',
  'Losartán',
  'Metformina',
  'Atorvastatina',
  'Anticonceptivos',
  'Omeprazol',
  'Enalapril',
  'Sertralina',
  'Ácido acetilsalicílico (Aspirina)',
];

const buildPharmacologicalHistoryString = (
  selectedDrugs: string[],
  entries: PatientMedicationEntry[],
  extraNotes?: string
): string => {
  const parts: string[] = [];

  if (entries && entries.length > 0) {
    const formattedMeds = entries.map((entry) => {
      const details: string[] = [];
      if (entry.dose?.trim()) {
        details.push(`Dosis: ${entry.dose.trim()}`);
      }
      if (entry.startMonth || entry.startYear) {
        const dateStr = [entry.startMonth, entry.startYear].filter(Boolean).join(' ');
        details.push(`Inicio: ${dateStr}`);
      }
      return details.length > 0 ? `${entry.name} (${details.join(', ')})` : entry.name;
    });
    parts.push(formattedMeds.join(' | '));
  } else if (selectedDrugs && selectedDrugs.length > 0) {
    parts.push(`Fármacos de la lista: ${selectedDrugs.join(', ')}`);
  }

  if (extraNotes?.trim()) {
    parts.push(`Otros/Notas: ${extraNotes.trim()}`);
  }

  return parts.join(' | ');
};

export const StepFourForm: React.FC<StepFourFormProps> = ({
  initialData,
  patientSex,
  onBack,
  onContinue,
}) => {
  const effectiveSex: PatientSex =
    patientSex ||
    (() => {
      try {
        const s1 = localStorage.getItem('vela_step1_data');
        if (s1) {
          const parsed = JSON.parse(s1);
          return (parsed.sex as PatientSex) || '';
        }
      } catch {}
      return '';
    })();
  const isFemale = effectiveSex === 'Femenino';

  const [formData, setFormData] = useState<PatientHealthMapInfo>(() => {
    const saved = localStorage.getItem('vela_step4_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const sel = parsed.selectedObesogenicDrugs || [];
        let entries: PatientMedicationEntry[] = parsed.medicationEntries || [];
        sel.forEach((d: string) => {
          if (!entries.some((e) => e.name === d || e.id === d)) {
            entries.push({ id: d, name: d, isCustom: false, startMonth: '', startYear: '', dose: '' });
          }
        });
        return {
          ...parsed,
          medicationEntries: entries,
        };
      } catch {
        // fallthrough to initial
      }
    }
    return (
      initialData || {
        pathologicalHistory: '',
        pharmacologicalHistory: '',
        takesObesogenicMedications: '',
        selectedObesogenicDrugs: [],
        medicationEntries: [],
        otherMedicationsDetails: '',
        surgicalHistory: '',
        hospitalHistory: '',
        toxicAllergicHistory: '',
        hasDrugAllergies: '',
        drugAllergiesDetails: '',
        hasFoodAllergies: '',
        foodAllergiesDetails: '',
        hasBoneFracturesAfter40: '',
        boneFracturesDetails: '',
        hasBoneDensitometry: '',
        boneDensitometryYear: '',
        boneDensitometryResult: '',
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
        usesHormoneReplacementTherapy: '',
        hormoneReplacementTherapyDetails: '',
        currentlyBreastfeeding: '',
        contraceptiveMethod: '',
        contraceptiveMethodOther: '',
        pregnancyPlan: '',
        hasEatingDisorderHistory: '',
        eatingDisorderDetails: '',
        smokingStatus: '',
        smokingCigarettesPerDay: '',
        smokingYears: '',
        smokingQuitTimeAgo: '',
        usesVape: false,
        alcoholConsumption: '',
        alcoholTypicalDrinksDetails: '',
        familyHistory: [],
        hasFamilyObesityHistory: '',
        familyObesityMembers: [],
        familyHistoryNotes: '',
      }
    );
  });

  const [customMedInput, setCustomMedInput] = useState<string>('');

  const [touched, setTouched] = useState<Record<string, boolean>>({
    pathologicalHistory: false,
    pharmacologicalHistory: false,
    takesObesogenicMedications: false,
    surgicalHistory: false,
    hospitalHistory: false,
    toxicAllergicHistory: false,
    hasDrugAllergies: false,
    drugAllergiesDetails: false,
    hasFoodAllergies: false,
    foodAllergiesDetails: false,
    hasBoneFracturesAfter40: false,
    boneFracturesDetails: false,
    hasBoneDensitometry: false,
    boneDensitometryYear: false,
    boneDensitometryResult: false,
    appliesGynecoObstetric: false,
    pregnanciesCount: false,
    vaginalDeliveriesCount: false,
    cesareanCount: false,
    lossesCount: false,
    cycleRegularity: false,
    cycleDuration: false,
    menarcheAge: false,
    menopauseStage: false,
    usesHormoneReplacementTherapy: false,
    hormoneReplacementTherapyDetails: false,
    currentlyBreastfeeding: false,
    contraceptiveMethod: false,
    contraceptiveMethodOther: false,
    pregnancyPlan: false,
    hasEatingDisorderHistory: false,
    eatingDisorderDetails: false,
    smokingStatus: false,
    smokingCigarettesPerDay: false,
    smokingYears: false,
    smokingQuitTimeAgo: false,
    alcoholConsumption: false,
    alcoholTypicalDrinksDetails: false,
    familyHistory: false,
    hasFamilyObesityHistory: false,
    familyObesityMembers: false,
    familyHistoryNotes: false,
  });

  // UI toggle for showing/expanding the potential obesogenic medications list
  const [showObesogenicDrugList, setShowObesogenicDrugList] = useState<boolean>(() => {
    return (
      (formData.selectedObesogenicDrugs && formData.selectedObesogenicDrugs.length > 0) ||
      formData.takesObesogenicMedications === 'Sí'
    );
  });

  const [errors, setErrors] = useState<StepFourErrors>({});
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

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
      case 'takesObesogenicMedications': {
        const hasSelectedDrugs = (currentForm.selectedObesogenicDrugs || []).length > 0;
        const hasOtherMeds = !!currentForm.otherMedicationsDetails?.trim();
        const hasMedEntries = (currentForm.medicationEntries || []).length > 0;
        const saysNo = currentForm.takesObesogenicMedications === 'No';

        if (!hasSelectedDrugs && !hasOtherMeds && !hasMedEntries && !saysNo) {
          return 'Por favor selecciona si tomas alguno de los medicamentos de la lista, escribe tus medicamentos en "Otros" o marca "No tomo ningún medicamento".';
        }
        return '';
      }

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
        return '';

      case 'hasDrugAllergies':
        if (normalizeYesNo(currentForm.hasDrugAllergies) === '') {
          return 'Por favor indica si tienes alergia a algún medicamento.';
        }
        return '';

      case 'drugAllergiesDetails':
        if (normalizeYesNo(currentForm.hasDrugAllergies) === 'Sí' && !currentForm.drugAllergiesDetails?.trim()) {
          return 'Por favor especifica a qué medicamento(s) y qué reacción tuviste.';
        }
        return '';

      case 'hasFoodAllergies':
        if (normalizeYesNo(currentForm.hasFoodAllergies) === '') {
          return 'Por favor indica si tienes alergia o intolerancia a algún alimento.';
        }
        return '';

      case 'foodAllergiesDetails':
        if (normalizeYesNo(currentForm.hasFoodAllergies) === 'Sí' && !currentForm.foodAllergiesDetails?.trim()) {
          return 'Por favor especifica a qué alimento(s).';
        }
        return '';

      case 'hasBoneFracturesAfter40':
        if (normalizeYesNo(currentForm.hasBoneFracturesAfter40) === '') {
          return 'Por favor indica si has tenido fracturas de huesos después de los 40 años o con caídas leves.';
        }
        return '';

      case 'boneFracturesDetails':
        if (normalizeYesNo(currentForm.hasBoneFracturesAfter40) === 'Sí' && !currentForm.boneFracturesDetails?.trim()) {
          return 'Por favor indica cuál hueso y a qué edad ocurrió la fractura.';
        }
        return '';

      case 'hasBoneDensitometry':
        if (normalizeYesNo(currentForm.hasBoneDensitometry) === '') {
          return 'Por favor indica si te han hecho una densitometría ósea.';
        }
        return '';

      case 'boneDensitometryYear':
        if (normalizeYesNo(currentForm.hasBoneDensitometry) === 'Sí' && !currentForm.boneDensitometryYear?.trim()) {
          return 'Por favor indica el año en que te realizaron la densitometría.';
        }
        return '';

      case 'boneDensitometryResult':
        if (normalizeYesNo(currentForm.hasBoneDensitometry) === 'Sí' && !currentForm.boneDensitometryResult) {
          return 'Por favor selecciona el resultado de la densitometría ósea.';
        }
        return '';

      case 'usesHormoneReplacementTherapy': {
        const isMenopause =
          isFemale &&
          normalizeYesNo(currentForm.appliesGynecoObstetric) === 'Sí' &&
          (currentForm.menopauseStage === 'Menopausia' ||
            currentForm.menopauseStage === 'Perimenopausia' ||
            currentForm.cycleRegularity === 'Ya no menstruo (menopausia / histerectomía)');
        if (!isMenopause) return '';
        if (normalizeYesNo(currentForm.usesHormoneReplacementTherapy) === '') {
          return 'Por favor indica si usas terapia hormonal para la menopausia.';
        }
        return '';
      }

      case 'hormoneReplacementTherapyDetails': {
        const isMenopause =
          isFemale &&
          normalizeYesNo(currentForm.appliesGynecoObstetric) === 'Sí' &&
          (currentForm.menopauseStage === 'Menopausia' ||
            currentForm.menopauseStage === 'Perimenopausia' ||
            currentForm.cycleRegularity === 'Ya no menstruo (menopausia / histerectomía)');
        if (!isMenopause) return '';
        if (
          normalizeYesNo(currentForm.usesHormoneReplacementTherapy) === 'Sí' &&
          !currentForm.hormoneReplacementTherapyDetails?.trim()
        ) {
          return 'Por favor indica cuál terapia hormonal usas y desde cuándo.';
        }
        return '';
      }

      case 'appliesGynecoObstetric':
        if (!isFemale) return '';
        if (!currentForm.appliesGynecoObstetric) {
          return 'Por favor selecciona si aplica en tu caso registrar antecedentes gineco-obstétricos.';
        }
        return '';

      case 'menarcheAge':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.menarcheAge?.trim()) {
          return 'Por favor indica a qué edad tuviste tu primer período (desarrollo).';
        }
        return '';

      case 'cycleRegularity':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.cycleRegularity) {
          return 'Por favor selecciona cómo son tus ciclos menstruales.';
        }
        return '';

      case 'cycleDuration':
        if (!isFemale) return '';
        if (
          currentForm.appliesGynecoObstetric === 'Sí' &&
          (currentForm.cycleRegularity === 'Regulares' || currentForm.cycleRegularity === 'Irregulares') &&
          !currentForm.cycleDuration?.trim()
        ) {
          return 'Por favor indícanos cuánto duran tus ciclos / días de sangrado.';
        }
        return '';

      case 'menopauseStage':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.menopauseStage) {
          return 'Por favor indica si te encuentras en perimenopausia o menopausia.';
        }
        return '';

      case 'currentlyBreastfeeding':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.currentlyBreastfeeding) {
          return 'Por favor indica si estás lactando actualmente.';
        }
        return '';

      case 'contraceptiveMethod':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí') {
          if (!currentForm.contraceptiveMethod) {
            return 'Por favor selecciona el método de planificación familiar que utilizas.';
          }
          if (
            currentForm.contraceptiveMethod === 'Otro' &&
            !currentForm.contraceptiveMethodOther?.trim()
          ) {
            return 'Por favor especifica qué método de planificación familiar utilizas.';
          }
        }
        return '';

      case 'contraceptiveMethodOther':
        if (!isFemale) return '';
        if (
          currentForm.appliesGynecoObstetric === 'Sí' &&
          currentForm.contraceptiveMethod === 'Otro' &&
          !currentForm.contraceptiveMethodOther?.trim()
        ) {
          return 'Por favor especifica qué método de planificación familiar utilizas.';
        }
        return '';

      case 'pregnancyPlan':
        if (!isFemale) return '';
        if (currentForm.appliesGynecoObstetric === 'Sí' && !currentForm.pregnancyPlan) {
          return 'Por favor selecciona si planeas un embarazo próximamente.';
        }
        return '';

      case 'hasEatingDisorderHistory':
        if (!currentForm.hasEatingDisorderHistory) {
          return 'Por favor responde a esta pregunta.';
        }
        return '';

      case 'smokingStatus':
        if (!currentForm.smokingStatus) {
          return 'Por favor selecciona una opción sobre el hábito de fumar.';
        }
        return '';

      case 'smokingCigarettesPerDay':
        if (currentForm.smokingStatus === 'Fumo actualmente' && !currentForm.smokingCigarettesPerDay?.trim()) {
          return 'Por favor indica cuántos cigarrillos al día consumes aproximadamente.';
        }
        return '';

      case 'smokingYears':
        if (currentForm.smokingStatus === 'Fumo actualmente' && !currentForm.smokingYears?.trim()) {
          return 'Por favor indica hace cuántos años fumas.';
        }
        return '';

      case 'smokingQuitTimeAgo':
        if (currentForm.smokingStatus === 'Fumé pero ya lo dejé' && !currentForm.smokingQuitTimeAgo?.trim()) {
          return 'Por favor indica hace cuánto tiempo dejaste de fumar.';
        }
        return '';

      case 'alcoholConsumption':
        if (!currentForm.alcoholConsumption) {
          return 'Por favor selecciona una opción sobre el consumo de alcohol.';
        }
        return '';

      case 'alcoholTypicalDrinksDetails':
        if (
          currentForm.alcoholConsumption &&
          currentForm.alcoholConsumption !== 'No consumo' &&
          !currentForm.alcoholTypicalDrinksDetails?.trim()
        ) {
          return 'Por favor describe qué tipo de bebida y cuántos tragos sueles consumir.';
        }
        return '';

      case 'hasFamilyObesityHistory':
        if (!currentForm.hasFamilyObesityHistory) {
          return 'Por favor indica si algún familiar cercano ha presentado antecedentes de obesidad.';
        }
        return '';

      case 'familyObesityMembers': {
        if (currentForm.hasFamilyObesityHistory === 'Sí') {
          const members = currentForm.familyObesityMembers || [];
          if (members.length === 0) {
            return 'Por favor agrega al menos un familiar con antecedentes de obesidad o selecciona "No".';
          }
          const hasIncompleteMember = members.some(
            (m) => !m.relationship || (m.relationship === 'Otro familiar' && !m.otherRelationship?.trim())
          );
          if (hasIncompleteMember) {
            return 'Por favor especifica el parentesco de cada familiar agregado.';
          }
        }
        return '';
      }

      default:
        return '';
    }
  };

  const handleChange = (
    field: keyof PatientHealthMapInfo,
    value: any
  ) => {
    setFormData((prev) => {
      const updatedForm = { ...prev, [field]: value };
      if (value && (!Array.isArray(value) || value.length > 0)) {
        setErrors((prevErrs) => ({ ...prevErrs, [field]: '' }));
      } else if (attemptedSubmit || touched[field]) {
        const errorMsg = validateField(field, updatedForm);
        setErrors((prevErrs) => ({ ...prevErrs, [field]: errorMsg }));
      }
      return updatedForm;
    });
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

  const toggleObesogenicDrug = (drugName: string) => {
    const currentSelected = formData.selectedObesogenicDrugs || [];
    const isSelected = currentSelected.includes(drugName);
    const updatedSelected = isSelected
      ? currentSelected.filter((d) => d !== drugName)
      : [...currentSelected, drugName];

    let updatedEntries = [...(formData.medicationEntries || [])];
    if (isSelected) {
      updatedEntries = updatedEntries.filter((e) => e.name !== drugName && e.id !== drugName);
    } else {
      if (!updatedEntries.some((e) => e.name === drugName || e.id === drugName)) {
        updatedEntries.push({
          id: drugName,
          name: drugName,
          isCustom: false,
          startMonth: '',
          startYear: '',
          dose: '',
        });
      }
    }

    const narrative = buildPharmacologicalHistoryString(
      updatedSelected,
      updatedEntries,
      formData.otherMedicationsDetails
    );

    const hasAnyMed =
      updatedSelected.length > 0 ||
      updatedEntries.length > 0 ||
      !!formData.otherMedicationsDetails?.trim();

    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      takesObesogenicMedications: hasAnyMed
        ? 'Sí'
        : formData.takesObesogenicMedications === 'No'
        ? 'No'
        : '',
      selectedObesogenicDrugs: updatedSelected,
      medicationEntries: updatedEntries,
      pharmacologicalHistory:
        narrative || (formData.takesObesogenicMedications === 'No' ? 'Ninguno actualmente' : ''),
    };

    setFormData(updatedFormData);
    if (touched.pharmacologicalHistory || touched.takesObesogenicMedications) {
      const err = validateField('pharmacologicalHistory', updatedFormData);
      setErrors((prev) => ({
        ...prev,
        pharmacologicalHistory: err,
        takesObesogenicMedications: err,
      }));
    }
  };

  const handleAddCustomMedication = (nameToAdd?: string) => {
    const rawName = nameToAdd || customMedInput;
    const trimmed = rawName.trim();
    if (!trimmed) return;

    const currentEntries = formData.medicationEntries || [];
    if (currentEntries.some((e) => e.name.toLowerCase() === trimmed.toLowerCase())) {
      setCustomMedInput('');
      return;
    }

    const newEntry: PatientMedicationEntry = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      isCustom: true,
      startMonth: '',
      startYear: '',
      dose: '',
    };

    const updatedEntries = [...currentEntries, newEntry];
    const narrative = buildPharmacologicalHistoryString(
      formData.selectedObesogenicDrugs || [],
      updatedEntries,
      formData.otherMedicationsDetails
    );

    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      takesObesogenicMedications: 'Sí',
      medicationEntries: updatedEntries,
      pharmacologicalHistory: narrative,
    };

    setFormData(updatedFormData);
    setCustomMedInput('');
    if (touched.pharmacologicalHistory || touched.takesObesogenicMedications) {
      const err = validateField('pharmacologicalHistory', updatedFormData);
      setErrors((prev) => ({
        ...prev,
        pharmacologicalHistory: err,
        takesObesogenicMedications: err,
      }));
    }
  };

  const handleRemoveMedicationEntry = (id: string) => {
    const currentEntries = formData.medicationEntries || [];
    const entryToRemove = currentEntries.find((e) => e.id === id);
    const updatedEntries = currentEntries.filter((e) => e.id !== id);

    let updatedSelected = formData.selectedObesogenicDrugs || [];
    if (entryToRemove && !entryToRemove.isCustom) {
      updatedSelected = updatedSelected.filter((d) => d !== entryToRemove.name);
    }

    const narrative = buildPharmacologicalHistoryString(
      updatedSelected,
      updatedEntries,
      formData.otherMedicationsDetails
    );

    const hasAnyMed =
      updatedSelected.length > 0 ||
      updatedEntries.length > 0 ||
      !!formData.otherMedicationsDetails?.trim();

    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      takesObesogenicMedications: hasAnyMed
        ? 'Sí'
        : formData.takesObesogenicMedications === 'No'
        ? 'No'
        : '',
      selectedObesogenicDrugs: updatedSelected,
      medicationEntries: updatedEntries,
      pharmacologicalHistory:
        narrative || (formData.takesObesogenicMedications === 'No' ? 'Ninguno actualmente' : ''),
    };

    setFormData(updatedFormData);
  };

  const handleUpdateMedicationEntry = (
    id: string,
    updates: Partial<PatientMedicationEntry>
  ) => {
    const currentEntries = formData.medicationEntries || [];
    const updatedEntries = currentEntries.map((e) =>
      e.id === id ? { ...e, ...updates } : e
    );

    const narrative = buildPharmacologicalHistoryString(
      formData.selectedObesogenicDrugs || [],
      updatedEntries,
      formData.otherMedicationsDetails
    );

    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      medicationEntries: updatedEntries,
      pharmacologicalHistory: narrative,
    };

    setFormData(updatedFormData);
  };

  const handleOtherMedsChange = (text: string) => {
    const selected = formData.selectedObesogenicDrugs || [];
    const entries = formData.medicationEntries || [];
    const narrative = buildPharmacologicalHistoryString(selected, entries, text);

    const hasAnyMed = selected.length > 0 || entries.length > 0 || !!text.trim();
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      otherMedicationsDetails: text,
      takesObesogenicMedications: hasAnyMed
        ? 'Sí'
        : formData.takesObesogenicMedications === 'No'
        ? 'No'
        : '',
      pharmacologicalHistory:
        narrative || (formData.takesObesogenicMedications === 'No' ? 'Ninguno actualmente' : ''),
    };

    setFormData(updatedFormData);
    if (touched.pharmacologicalHistory || touched.takesObesogenicMedications) {
      const err = validateField('pharmacologicalHistory', updatedFormData);
      setErrors((prev) => ({
        ...prev,
        pharmacologicalHistory: err,
        takesObesogenicMedications: err,
      }));
    }
  };

  const handleNoMedications = () => {
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      takesObesogenicMedications: 'No',
      selectedObesogenicDrugs: [],
      medicationEntries: [],
      otherMedicationsDetails: '',
      pharmacologicalHistory: 'Ninguno (no toma medicamentos actualmente)',
    };
    setFormData(updatedFormData);
    setTouched((prev) => ({
      ...prev,
      pharmacologicalHistory: true,
      takesObesogenicMedications: true,
    }));
    setErrors((prev) => ({
      ...prev,
      pharmacologicalHistory: '',
      takesObesogenicMedications: '',
    }));
  };

  // Form validity check
  const isFormValid = (() => {
    if (!formData.pathologicalHistory.trim()) return false;
    
    // Validar antecedentes farmacológicos (debe haber marcado fármacos, agregado medicaciones, escrito en Otros o marcado No tomo ningún medicamento)
    const hasSelectedDrugs = (formData.selectedObesogenicDrugs || []).length > 0;
    const hasOtherMeds = !!formData.otherMedicationsDetails?.trim();
    const hasMedEntries = (formData.medicationEntries || []).length > 0;
    const saysNo = formData.takesObesogenicMedications === 'No';
    if (!hasSelectedDrugs && !hasOtherMeds && !hasMedEntries && !saysNo) return false;

    if (!formData.surgicalHistory.trim()) return false;
    if (!formData.hospitalHistory.trim()) return false;

    // Alergias
    if (normalizeYesNo(formData.hasDrugAllergies) === '') return false;
    if (normalizeYesNo(formData.hasDrugAllergies) === 'Sí' && !formData.drugAllergiesDetails?.trim()) return false;
    if (normalizeYesNo(formData.hasFoodAllergies) === '') return false;
    if (normalizeYesNo(formData.hasFoodAllergies) === 'Sí' && !formData.foodAllergiesDetails?.trim()) return false;

    // Salud ósea
    if (normalizeYesNo(formData.hasBoneFracturesAfter40) === '') return false;
    if (normalizeYesNo(formData.hasBoneFracturesAfter40) === 'Sí' && !formData.boneFracturesDetails?.trim()) return false;
    if (normalizeYesNo(formData.hasBoneDensitometry) === '') return false;
    if (
      normalizeYesNo(formData.hasBoneDensitometry) === 'Sí' &&
      (!formData.boneDensitometryYear?.trim() || !formData.boneDensitometryResult)
    ) {
      return false;
    }

    // Gineco-obstétrico validation (solo si sexo es femenino)
    if (isFemale) {
      if (normalizeYesNo(formData.appliesGynecoObstetric) === '') return false;
      if (normalizeYesNo(formData.appliesGynecoObstetric) === 'Sí') {
        if (!formData.menarcheAge?.trim()) return false;
        if (!formData.cycleRegularity) return false;
        if (
          (formData.cycleRegularity === 'Regulares' || formData.cycleRegularity === 'Irregulares') &&
          !formData.cycleDuration?.trim()
        ) {
          return false;
        }
        if (!formData.menopauseStage) return false;

        const isMenopause =
          formData.menopauseStage === 'Menopausia' ||
          formData.menopauseStage === 'Perimenopausia' ||
          formData.cycleRegularity === 'Ya no menstruo (menopausia / histerectomía)';
        if (isMenopause) {
          if (normalizeYesNo(formData.usesHormoneReplacementTherapy) === '') return false;
          if (
            normalizeYesNo(formData.usesHormoneReplacementTherapy) === 'Sí' &&
            !formData.hormoneReplacementTherapyDetails?.trim()
          ) {
            return false;
          }
        }

        if (normalizeYesNo(formData.currentlyBreastfeeding) === '') return false;
        if (!formData.contraceptiveMethod) return false;
        if (formData.contraceptiveMethod === 'Otro' && !formData.contraceptiveMethodOther?.trim()) return false;
        if (!formData.pregnancyPlan) return false;
      }
    }

    // TCA
    if (normalizeYesNo(formData.hasEatingDisorderHistory) === '') return false;

    // Hábitos: tabaco y alcohol
    if (!formData.smokingStatus) return false;
    if (formData.smokingStatus === 'Fumo actualmente') {
      if (!formData.smokingCigarettesPerDay?.trim() || !formData.smokingYears?.trim()) return false;
    } else if (formData.smokingStatus === 'Fumé pero ya lo dejé') {
      if (!formData.smokingQuitTimeAgo?.trim()) return false;
    }

    if (!formData.alcoholConsumption) return false;
    if (formData.alcoholConsumption !== 'No consumo') {
      if (!formData.alcoholTypicalDrinksDetails?.trim()) return false;
    }

    // Antecedentes familiares de obesidad
    if (!formData.hasFamilyObesityHistory) return false;
    if (formData.hasFamilyObesityHistory === 'Sí') {
      const members = formData.familyObesityMembers || [];
      if (members.length === 0) return false;
      const hasInvalid = members.some(
        (m) => !m.relationship || (m.relationship === 'Otro familiar' && !m.otherRelationship?.trim())
      );
      if (hasInvalid) return false;
    }

    return true;
  })();

  // Handlers para antecedentes familiares de obesidad
  const handleSelectHasFamilyObesity = (val: 'Sí' | 'No') => {
    let updatedMembers = formData.familyObesityMembers || [];
    let updatedFamilyHistory = formData.familyHistory || [];

    if (val === 'Sí') {
      // Si dice Sí y no hay miembros, creamos uno por defecto
      if (updatedMembers.length === 0) {
        updatedMembers = [
          {
            id: `fam-ob-${Date.now()}`,
            relationship: 'Madre',
            onsetAge: 'En la edad adulta',
            comorbidities: [],
            otherComorbidities: '',
          },
        ];
      }
      // Marcar también 'Obesidad' en familyHistory si no está
      if (!updatedFamilyHistory.includes('Obesidad')) {
        updatedFamilyHistory = [...updatedFamilyHistory, 'Obesidad'];
      }
    } else {
      updatedMembers = [];
      // Quitar Obesidad de familyHistory si estaba
      updatedFamilyHistory = updatedFamilyHistory.filter((c) => c !== 'Obesidad');
    }

    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      hasFamilyObesityHistory: val,
      familyObesityMembers: updatedMembers,
      familyHistory: updatedFamilyHistory,
    };

    setFormData(updatedFormData);
    setTouched((prev) => ({
      ...prev,
      hasFamilyObesityHistory: true,
      familyObesityMembers: true,
    }));
    setErrors((prev) => ({
      ...prev,
      hasFamilyObesityHistory: validateField('hasFamilyObesityHistory', updatedFormData),
      familyObesityMembers: validateField('familyObesityMembers', updatedFormData),
    }));
  };

  const handleAddFamilyObesityMember = () => {
    const newMember: ObesityFamilyMemberEntry = {
      id: `fam-ob-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      relationship: 'Padre',
      onsetAge: 'En la edad adulta',
      comorbidities: [],
      otherComorbidities: '',
    };
    const updatedMembers = [...(formData.familyObesityMembers || []), newMember];
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      hasFamilyObesityHistory: 'Sí',
      familyObesityMembers: updatedMembers,
    };
    setFormData(updatedFormData);
    setTouched((prev) => ({ ...prev, familyObesityMembers: true }));
    setErrors((prev) => ({
      ...prev,
      familyObesityMembers: validateField('familyObesityMembers', updatedFormData),
    }));
  };

  const handleRemoveFamilyObesityMember = (id: string) => {
    const current = formData.familyObesityMembers || [];
    const updatedMembers = current.filter((m) => m.id !== id);
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      familyObesityMembers: updatedMembers,
      hasFamilyObesityHistory: updatedMembers.length === 0 ? 'No' : formData.hasFamilyObesityHistory,
    };
    setFormData(updatedFormData);
    setTouched((prev) => ({ ...prev, familyObesityMembers: true }));
    setErrors((prev) => ({
      ...prev,
      familyObesityMembers: validateField('familyObesityMembers', updatedFormData),
    }));
  };

  const handleUpdateFamilyObesityMember = (
    id: string,
    updates: Partial<ObesityFamilyMemberEntry>
  ) => {
    const current = formData.familyObesityMembers || [];
    const updatedMembers = current.map((m) => (m.id === id ? { ...m, ...updates } : m));
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      familyObesityMembers: updatedMembers,
    };
    setFormData(updatedFormData);
    setTouched((prev) => ({ ...prev, familyObesityMembers: true }));
    setErrors((prev) => ({
      ...prev,
      familyObesityMembers: validateField('familyObesityMembers', updatedFormData),
    }));
  };

  const handleToggleMemberComorbidity = (id: string, comorbidity: string) => {
    const current = formData.familyObesityMembers || [];
    const member = current.find((m) => m.id === id);
    if (!member) return;
    const exists = (member.comorbidities || []).includes(comorbidity);
    const updatedComorbidities = exists
      ? member.comorbidities.filter((c) => c !== comorbidity)
      : [...(member.comorbidities || []), comorbidity];

    const currentAges = { ...(member.comorbiditiesAges || {}) };
    if (exists) {
      delete currentAges[comorbidity];
    }

    handleUpdateFamilyObesityMember(id, {
      comorbidities: updatedComorbidities,
      comorbiditiesAges: currentAges,
    });
  };

  const handleUpdateMemberComorbidityAge = (id: string, comorbidity: string, ageVal: string) => {
    const current = formData.familyObesityMembers || [];
    const member = current.find((m) => m.id === id);
    if (!member) return;
    const currentAges = { ...(member.comorbiditiesAges || {}) };
    if (ageVal === '') {
      delete currentAges[comorbidity];
    } else {
      currentAges[comorbidity] = ageVal;
    }
    handleUpdateFamilyObesityMember(id, { comorbiditiesAges: currentAges });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    const isMenopause =
      isFemale &&
      formData.appliesGynecoObstetric === 'Sí' &&
      (formData.menopauseStage === 'Menopausia' ||
        formData.menopauseStage === 'Perimenopausia' ||
        formData.cycleRegularity === 'Ya no menstruo (menopausia / histerectomía)');

    const allTouched: Record<string, boolean> = {
      pathologicalHistory: true,
      pharmacologicalHistory: true,
      takesObesogenicMedications: true,
      surgicalHistory: true,
      hospitalHistory: true,
      toxicAllergicHistory: true,
      hasDrugAllergies: true,
      drugAllergiesDetails: formData.hasDrugAllergies === 'Sí',
      hasFoodAllergies: true,
      foodAllergiesDetails: formData.hasFoodAllergies === 'Sí',
      hasBoneFracturesAfter40: true,
      boneFracturesDetails: formData.hasBoneFracturesAfter40 === 'Sí',
      hasBoneDensitometry: true,
      boneDensitometryYear: formData.hasBoneDensitometry === 'Sí',
      boneDensitometryResult: formData.hasBoneDensitometry === 'Sí',
      appliesGynecoObstetric: isFemale,
      pregnanciesCount: isFemale,
      vaginalDeliveriesCount: isFemale,
      cesareanCount: isFemale,
      lossesCount: isFemale,
      cycleRegularity: isFemale,
      cycleDuration: isFemale,
      menarcheAge: isFemale,
      menopauseStage: isFemale,
      usesHormoneReplacementTherapy: isMenopause,
      hormoneReplacementTherapyDetails: isMenopause && formData.usesHormoneReplacementTherapy === 'Sí',
      currentlyBreastfeeding: isFemale && formData.appliesGynecoObstetric === 'Sí',
      contraceptiveMethod: isFemale && formData.appliesGynecoObstetric === 'Sí',
      contraceptiveMethodOther:
        isFemale &&
        formData.appliesGynecoObstetric === 'Sí' &&
        formData.contraceptiveMethod === 'Otro',
      pregnancyPlan: isFemale && formData.appliesGynecoObstetric === 'Sí',
      hasEatingDisorderHistory: true,
      eatingDisorderDetails: true,
      smokingStatus: true,
      smokingCigarettesPerDay: formData.smokingStatus === 'Fumo actualmente',
      smokingYears: formData.smokingStatus === 'Fumo actualmente',
      smokingQuitTimeAgo: formData.smokingStatus === 'Fumé pero ya lo dejé',
      alcoholConsumption: true,
      alcoholTypicalDrinksDetails: formData.alcoholConsumption !== 'No consumo' && !!formData.alcoholConsumption,
      familyHistory: true,
      hasFamilyObesityHistory: true,
      familyObesityMembers: true,
      familyHistoryNotes: true,
    };
    setTouched(allTouched);

    const newErrors: StepFourErrors = {
      pathologicalHistory: validateField('pathologicalHistory', formData),
      pharmacologicalHistory: validateField('pharmacologicalHistory', formData),
      takesObesogenicMedications: validateField('takesObesogenicMedications', formData),
      surgicalHistory: validateField('surgicalHistory', formData),
      hospitalHistory: validateField('hospitalHistory', formData),
      toxicAllergicHistory: validateField('toxicAllergicHistory', formData),
      hasDrugAllergies: validateField('hasDrugAllergies', formData),
      drugAllergiesDetails: validateField('drugAllergiesDetails', formData),
      hasFoodAllergies: validateField('hasFoodAllergies', formData),
      foodAllergiesDetails: validateField('foodAllergiesDetails', formData),
      hasBoneFracturesAfter40: validateField('hasBoneFracturesAfter40', formData),
      boneFracturesDetails: validateField('boneFracturesDetails', formData),
      hasBoneDensitometry: validateField('hasBoneDensitometry', formData),
      boneDensitometryYear: validateField('boneDensitometryYear', formData),
      boneDensitometryResult: validateField('boneDensitometryResult', formData),
      appliesGynecoObstetric: isFemale ? validateField('appliesGynecoObstetric', formData) : '',
      menarcheAge: isFemale ? validateField('menarcheAge', formData) : '',
      cycleRegularity: isFemale ? validateField('cycleRegularity', formData) : '',
      cycleDuration: isFemale ? validateField('cycleDuration', formData) : '',
      menopauseStage: isFemale ? validateField('menopauseStage', formData) : '',
      usesHormoneReplacementTherapy: isMenopause
        ? validateField('usesHormoneReplacementTherapy', formData)
        : '',
      hormoneReplacementTherapyDetails:
        isMenopause && formData.usesHormoneReplacementTherapy === 'Sí'
          ? validateField('hormoneReplacementTherapyDetails', formData)
          : '',
      currentlyBreastfeeding:
        isFemale && formData.appliesGynecoObstetric === 'Sí'
          ? validateField('currentlyBreastfeeding', formData)
          : '',
      contraceptiveMethod:
        isFemale && formData.appliesGynecoObstetric === 'Sí'
          ? validateField('contraceptiveMethod', formData)
          : '',
      contraceptiveMethodOther:
        isFemale &&
        formData.appliesGynecoObstetric === 'Sí' &&
        formData.contraceptiveMethod === 'Otro'
          ? validateField('contraceptiveMethodOther', formData)
          : '',
      pregnancyPlan:
        isFemale && formData.appliesGynecoObstetric === 'Sí'
          ? validateField('pregnancyPlan', formData)
          : '',
      hasEatingDisorderHistory: validateField('hasEatingDisorderHistory', formData),
      smokingStatus: validateField('smokingStatus', formData),
      smokingCigarettesPerDay: validateField('smokingCigarettesPerDay', formData),
      smokingYears: validateField('smokingYears', formData),
      smokingQuitTimeAgo: validateField('smokingQuitTimeAgo', formData),
      alcoholConsumption: validateField('alcoholConsumption', formData),
      alcoholTypicalDrinksDetails: validateField('alcoholTypicalDrinksDetails', formData),
      hasFamilyObesityHistory: validateField('hasFamilyObesityHistory', formData),
      familyObesityMembers: validateField('familyObesityMembers', formData),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => !!err);
    if (!hasAnyError && isFormValid) {
      const dataToSave: PatientHealthMapInfo =
        isFemale && formData.appliesGynecoObstetric === 'Sí'
          ? formData
          : {
              ...formData,
              appliesGynecoObstetric: isFemale ? formData.appliesGynecoObstetric : 'No',
              pregnanciesCount: undefined,
              vaginalDeliveriesCount: undefined,
              cesareanCount: undefined,
              lossesCount: undefined,
              cycleRegularity: undefined,
              cycleDuration: undefined,
              menarcheAge: undefined,
              menopauseStage: undefined,
              menopauseSymptoms: [],
              menopauseSymptomsOther: '',
              currentlyBreastfeeding: undefined,
              contraceptiveMethod: undefined,
              contraceptiveMethodOther: undefined,
              pregnancyPlan: undefined,
            };
      onContinue(dataToSave);
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
          <span>Paso 5 de 11 • Tu mapa de salud y antecedentes</span>
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

        {/* 2. Antecedentes farmacológicos: Pregunta inicial, lista condicional y campo abierto para otros */}
        <div id="field-pharmacologicalHistory" className="space-y-4">
          <div className="space-y-1">
            <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
              <span className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-[#6E9E93]" />
                2. Antecedentes farmacológicos y medicamentos actuales <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              Muchos medicamentos de uso común pueden influir en el apetito, el metabolismo o la ganancia de peso. Queremos conocer todo lo que tomas actualmente.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/90 border border-[#AEC9C0]/40 space-y-4">
            {/* Pregunta inicial: ¿Tomas alguno de estos medicamentos con potencial de influir en el peso? */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#2E3A36] block">
                ¿Tomas o sospechas que tomas algún medicamento que pueda influir en tu peso (antidepresivos, corticoides, antipsicóticos, anticonvulsivos, insulina, etc.)?
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setShowObesogenicDrugList(true);
                    if (formData.takesObesogenicMedications === 'No') {
                      handleChange('takesObesogenicMedications', '');
                      handleChange('pharmacologicalHistory', formData.otherMedicationsDetails || '');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    showObesogenicDrugList || (formData.selectedObesogenicDrugs || []).length > 0
                      ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] ring-1 ring-[#6E9E93]'
                      : 'border-[#D9D3C8] bg-white text-[#5C6E68] hover:border-[#AEC9C0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        showObesogenicDrugList || (formData.selectedObesogenicDrugs || []).length > 0
                          ? 'border-[#6E9E93] bg-[#6E9E93]'
                          : 'border-[#AEC9C0] bg-white'
                      }`}
                    >
                      {(showObesogenicDrugList || (formData.selectedObesogenicDrugs || []).length > 0) && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#2E3A36]">
                        Sí, tomo o quiero revisar la lista
                      </span>
                      <span className="text-[11px] text-[#5C6E68]">
                        Ver y seleccionar de la lista de fármacos frecuentes
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowObesogenicDrugList(false);
                    if ((formData.selectedObesogenicDrugs || []).length > 0) {
                      handleChange('selectedObesogenicDrugs', []);
                      const other = formData.otherMedicationsDetails?.trim();
                      handleChange('pharmacologicalHistory', other ? `Otros: ${other}` : '');
                      if (!other) {
                        handleChange('takesObesogenicMedications', '');
                      }
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                    !showObesogenicDrugList && (formData.selectedObesogenicDrugs || []).length === 0
                      ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] ring-1 ring-[#6E9E93]'
                      : 'border-[#D9D3C8] bg-white text-[#5C6E68] hover:border-[#AEC9C0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        !showObesogenicDrugList && (formData.selectedObesogenicDrugs || []).length === 0
                          ? 'border-[#6E9E93] bg-[#6E9E93]'
                          : 'border-[#AEC9C0] bg-white'
                      }`}
                    >
                      {!showObesogenicDrugList && (formData.selectedObesogenicDrugs || []).length === 0 && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-semibold block text-[#2E3A36]">
                        No tomo ninguno de estos fármacos
                      </span>
                      <span className="text-[11px] text-[#5C6E68]">
                        Continuar registrando solo otros medicamentos
                      </span>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Lista de medicamentos con potencial obesogénico: SÓLO visible cuando el usuario decide verla o dice Sí */}
            <AnimatePresence>
              {showObesogenicDrugList && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3 pt-3 border-t border-[#E8E2D8] overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-[#2E3A36] uppercase tracking-wider block">
                        ¿Tomas alguno de estos medicamentos?
                      </span>
                      <p className="text-[11px] text-[#5C6E68] mt-0.5">
                        Selecciona todos los que tomes o hayas tomado recientemente:
                      </p>
                    </div>
                    {(formData.selectedObesogenicDrugs?.length || 0) > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#6E9E93] text-white font-medium shrink-0 ml-2">
                        {formData.selectedObesogenicDrugs?.length} seleccionado(s)
                      </span>
                    )}
                  </div>

                  {/* Grilla de medicamentos seleccionables */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {OBESOGENIC_DRUGS_LIST.map((drug) => {
                      const isSelected = (formData.selectedObesogenicDrugs || []).includes(drug);
                      const hasSub = drug.includes('(');
                      const mainTitle = hasSub ? drug.substring(0, drug.indexOf('(')).trim() : drug;
                      const subTitle = hasSub ? drug.substring(drug.indexOf('(')).trim() : null;

                      return (
                        <button
                          key={drug}
                          type="button"
                          onClick={() => toggleObesogenicDrug(drug)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-between transition-all duration-150 cursor-pointer text-left ${
                            hasSub ? 'col-span-2 sm:col-span-2 md:col-span-2' : ''
                          } ${
                            isSelected
                              ? 'border-[#6E9E93] bg-[#6E9E93] text-white shadow-2xs font-semibold ring-1 ring-[#6E9E93]'
                              : 'border-[#D9D3C8] bg-white text-[#2E3A36] hover:border-[#6E9E93] hover:bg-[#EBF3F0]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0 pr-1">
                            <span className={hasSub ? 'font-medium leading-snug' : 'truncate'}>
                              {mainTitle}
                            </span>
                            {subTitle && (
                              <span
                                className={`text-[10px] leading-tight mt-0.5 ${
                                  isSelected ? 'text-white/90' : 'text-[#5C6E68]'
                                }`}
                              >
                                {subTitle}
                              </span>
                            )}
                          </div>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 shrink-0 ml-1" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded-full border border-[#D9D3C8] shrink-0 ml-1 bg-[#FAF6F0]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Lista interactiva de medicamentos seleccionados con sus dos campos: Desde cuándo y Dosis */}
            <AnimatePresence>
              {(formData.medicationEntries || []).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-3 pt-3 border-t border-[#E8E2D8] overflow-hidden"
                >
                  <div className="flex items-center justify-between pb-1">
                    <span className="text-xs font-semibold text-[#2E3A36] uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Detalle de tus medicamentos seleccionados ({(formData.medicationEntries || []).length})
                    </span>
                    <span className="text-[11px] text-[#5C6E68]">
                      Completa fecha de inicio y dosis
                    </span>
                  </div>
                  <p className="text-[11px] text-[#5C6E68] leading-relaxed">
                    Indica aproximadamente desde cuándo tomas cada medicamento y la dosis. Esta información nos permite cruzar con exactitud la fecha de inicio del fármaco con las variaciones en tu curva de peso.
                  </p>

                  <div className="space-y-2.5">
                    {(formData.medicationEntries || []).map((entry) => (
                      <motion.div
                        key={entry.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="p-3.5 sm:p-4 rounded-2xl bg-white border border-[#AEC9C0]/80 shadow-2xs space-y-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs sm:text-sm font-semibold text-[#2E3A36]">
                              {entry.name}
                            </span>
                            {!entry.isCustom ? (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EBF3F0] text-[#5B887E] font-medium border border-[#AEC9C0]/50">
                                Fármaco con potencial de peso
                              </span>
                            ) : (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#5C6E68] font-medium border border-[#D9D3C8]">
                                Otro medicamento / suplemento
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveMedicationEntry(entry.id)}
                            className="text-[#8E9E99] hover:text-[#C66A4D] p-1 rounded-lg hover:bg-[#FDEEE9]/60 transition-colors cursor-pointer"
                            title="Quitar este medicamento"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {/* 1. Desde cuándo lo toma (Mes y Año) */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[#2E3A36] block">
                              ¿Desde cuándo lo tomas? <span className="text-[#8E9E99] font-normal">(aprox.)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-1.5">
                              <select
                                value={entry.startMonth || ''}
                                onChange={(e) =>
                                  handleUpdateMedicationEntry(entry.id, { startMonth: e.target.value })
                                }
                                className="w-full px-2.5 py-2 rounded-xl bg-[#FAF6F0]/60 border border-[#D9D3C8] text-xs text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                              >
                                <option value="">Mes...</option>
                                {MONTHS_SPANISH.map((m) => (
                                  <option key={m} value={m}>
                                    {m}
                                  </option>
                                ))}
                              </select>

                              <select
                                value={entry.startYear || ''}
                                onChange={(e) =>
                                  handleUpdateMedicationEntry(entry.id, { startYear: e.target.value })
                                }
                                className="w-full px-2.5 py-2 rounded-xl bg-[#FAF6F0]/60 border border-[#D9D3C8] text-xs text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                              >
                                <option value="">Año...</option>
                                {MEDICATION_YEARS.map((y) => (
                                  <option key={y} value={y}>
                                    {y}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>

                          {/* 2. Dosis (campo de texto libre) */}
                          <div className="space-y-1">
                            <label className="text-[11px] font-semibold text-[#2E3A36] block">
                              Dosis <span className="text-[#8E9E99] font-normal">(ej. 500mg, 1 tableta al día)</span>
                            </label>
                            <input
                              type="text"
                              value={entry.dose || ''}
                              onChange={(e) =>
                                handleUpdateMedicationEntry(entry.id, { dose: e.target.value })
                              }
                              placeholder="Ej. 500 mg, 1 tableta diaria, 50 mcg..."
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0]/60 border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                            />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Espacio abierto para 'Otros medicamentos' con posibilidad de agregar fármacos individuales */}
            <div className="pt-3 border-t border-[#E8E2D8] space-y-2.5">
              <div>
                <label
                  htmlFor="customMed-input"
                  className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between flex-wrap gap-1"
                >
                  <span>¿Qué otros medicamentos, suplementos o tratamientos tomas?</span>
                  <span className="text-[11px] text-[#5C6E68] font-normal">
                    (tiroides, anticonceptivos, antihipertensivos, analgésicos, vitaminas, etc.)
                  </span>
                </label>
                <p className="text-[11px] text-[#5C6E68] mt-0.5">
                  Escribe el nombre y agrégalo para registrar desde cuándo lo tomas y su dosis:
                </p>
              </div>

              <div className="flex gap-2">
                <input
                  id="customMed-input"
                  type="text"
                  value={customMedInput}
                  onChange={(e) => setCustomMedInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomMedication();
                    }
                  }}
                  placeholder="Ej. Levotiroxina, Losartán, Metformina, Anticonceptivos..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                />
                <button
                  type="button"
                  onClick={() => handleAddCustomMedication()}
                  disabled={!customMedInput.trim()}
                  className="px-4 py-2 rounded-xl bg-[#6E9E93] text-white text-xs font-semibold hover:bg-[#5B887E] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer shrink-0"
                >
                  + Agregar
                </button>
              </div>

              {/* Sugerencias rápidas comunes */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="text-[11px] text-[#8E9E99] self-center mr-1">Frecuentes:</span>
                {COMMON_OTHER_MEDICATIONS_SUGGESTIONS.map((sug) => {
                  const alreadyAdded = (formData.medicationEntries || []).some(
                    (e) => e.name.toLowerCase() === sug.toLowerCase()
                  );
                  if (alreadyAdded) return null;
                  return (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => handleAddCustomMedication(sug)}
                      className="px-2.5 py-1 rounded-lg bg-[#FAF6F0] hover:bg-[#EBF3F0] text-[#2E3A36] text-[11px] border border-[#D9D3C8] hover:border-[#6E9E93] transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  );
                })}
              </div>

              {/* Observaciones adicionales opcionales */}
              <div className="pt-2">
                <label
                  htmlFor="otherMedications-input"
                  className="text-[11px] font-semibold text-[#5C6E68] block mb-1"
                >
                  Notas adicionales u observaciones sobre tu medicación (opcional):
                </label>
                <textarea
                  id="otherMedications-input"
                  rows={2}
                  value={formData.otherMedicationsDetails || ''}
                  onChange={(e) => handleOtherMedsChange(e.target.value)}
                  onBlur={() => handleBlur('pharmacologicalHistory')}
                  placeholder="Otras observaciones, suplementos ocasionales, pautas especiales..."
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y"
                />
              </div>
            </div>

            {/* Botón explícito para indicar que no toma ningún medicamento */}
            <div className="pt-2 border-t border-[#E8E2D8]/60 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setShowObesogenicDrugList(false);
                  handleNoMedications();
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium border flex items-center gap-2 transition-all duration-200 cursor-pointer ${
                  formData.takesObesogenicMedications === 'No' &&
                  (formData.selectedObesogenicDrugs || []).length === 0 &&
                  !formData.otherMedicationsDetails?.trim()
                    ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] ring-1 ring-[#6E9E93]'
                    : 'border-[#D9D3C8] bg-white text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    formData.takesObesogenicMedications === 'No' &&
                    (formData.selectedObesogenicDrugs || []).length === 0 &&
                    !formData.otherMedicationsDetails?.trim()
                      ? 'border-[#6E9E93] bg-[#6E9E93]'
                      : 'border-[#AEC9C0] bg-white'
                  }`}
                >
                  {formData.takesObesogenicMedications === 'No' &&
                    (formData.selectedObesogenicDrugs || []).length === 0 &&
                    !formData.otherMedicationsDetails?.trim() && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                </div>
                <span>No tomo ningún medicamento actualmente</span>
              </button>

              {((formData.selectedObesogenicDrugs || []).length > 0 || !!formData.otherMedicationsDetails?.trim()) && (
                <span className="text-[11px] text-[#5B887E] font-medium hidden sm:inline-block">
                  ✓ Medicación registrada
                </span>
              )}
            </div>
          </div>

          {attemptedSubmit &&
            (formData.selectedObesogenicDrugs || []).length === 0 &&
            !formData.otherMedicationsDetails?.trim() &&
            (formData.medicationEntries || []).length === 0 &&
            formData.takesObesogenicMedications !== 'No' &&
            (errors.takesObesogenicMedications || errors.pharmacologicalHistory) && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.takesObesogenicMedications || errors.pharmacologicalHistory}
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

        {/* 5. Alergias e intolerancias (Medicamentos y Alimentos) */}
        <div id="field-allergiesSection" className="space-y-5 pt-2 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#6E9E93]" />
              <h3 className="text-base font-semibold text-[#2E3A36]">
                5. Alergias e intolerancias <span className="text-[#F2A488] font-bold">*</span>
              </h3>
            </div>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              Información de seguridad médica prioritaria para evitar reacciones adversas y personalizar tus pautas nutricionales y farmacológicas.
            </p>
          </div>

          {/* 5.1 Alergia a medicamentos */}
          <div id="field-hasDrugAllergies" className="space-y-3 p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/80">
            <label className="flex items-center justify-between text-xs font-semibold text-[#2E3A36]">
              <span className="flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-[#6E9E93]" />
                ¿Tienes alergia a algún medicamento? <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(['Sí', 'No'] as const).map((opt) => {
                const isSelected = normalizeYesNo(formData.hasDrugAllergies) === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      handleChange('hasDrugAllergies', opt);
                      if (opt === 'No') {
                        handleChange('drugAllergiesDetails', '');
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
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

            {attemptedSubmit && normalizeYesNo(formData.hasDrugAllergies) === '' && errors.hasDrugAllergies && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.hasDrugAllergies}
              </motion.p>
            )}

            {/* Detalle de alergia a medicamentos si Sí */}
            <AnimatePresence>
              {normalizeYesNo(formData.hasDrugAllergies) === 'Sí' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="field-drugAllergiesDetails"
                  className="space-y-1.5 pt-2"
                >
                  <label
                    htmlFor="drugAllergiesDetails-input"
                    className="text-xs font-semibold text-[#2E3A36] block"
                  >
                    ¿Cuál medicamento y qué reacción tuviste? <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <input
                    id="drugAllergiesDetails-input"
                    type="text"
                    value={formData.drugAllergiesDetails || ''}
                    onChange={(e) => handleChange('drugAllergiesDetails', e.target.value)}
                    onBlur={() => handleBlur('drugAllergiesDetails')}
                    placeholder="Ej. Penicilina (urticaria y broncoespasmo), AINEs (edema facial)..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs sm:text-sm text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                      touched.drugAllergiesDetails && errors.drugAllergiesDetails
                        ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                        : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                    }`}
                  />
                  {touched.drugAllergiesDetails && errors.drugAllergiesDetails && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.drugAllergiesDetails}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5.2 Alergia o intolerancia a alimentos */}
          <div id="field-hasFoodAllergies" className="space-y-3 p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/80">
            <label className="flex items-center justify-between text-xs font-semibold text-[#2E3A36]">
              <span className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#6E9E93]" />
                ¿Tienes alergia o intolerancia a algún alimento? <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(['Sí', 'No'] as const).map((opt) => {
                const isSelected = normalizeYesNo(formData.hasFoodAllergies) === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      handleChange('hasFoodAllergies', opt);
                      if (opt === 'No') {
                        handleChange('foodAllergiesDetails', '');
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
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

            {attemptedSubmit && normalizeYesNo(formData.hasFoodAllergies) === '' && errors.hasFoodAllergies && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.hasFoodAllergies}
              </motion.p>
            )}

            {/* Detalle de alergia a alimentos si Sí */}
            <AnimatePresence>
              {normalizeYesNo(formData.hasFoodAllergies) === 'Sí' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="field-foodAllergiesDetails"
                  className="space-y-1.5 pt-2"
                >
                  <label
                    htmlFor="foodAllergiesDetails-input"
                    className="text-xs font-semibold text-[#2E3A36] block"
                  >
                    ¿A cuál(es) alimento(s)? <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <input
                    id="foodAllergiesDetails-input"
                    type="text"
                    value={formData.foodAllergiesDetails || ''}
                    onChange={(e) => handleChange('foodAllergiesDetails', e.target.value)}
                    onBlur={() => handleBlur('foodAllergiesDetails')}
                    placeholder="Ej. Mariscos, maní, intolerancia severa a la lactosa, gluten..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs sm:text-sm text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                      touched.foodAllergiesDetails && errors.foodAllergiesDetails
                        ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                        : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                    }`}
                  />
                  {touched.foodAllergiesDetails && errors.foodAllergiesDetails && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.foodAllergiesDetails}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 6. Salud ósea */}
        <div id="field-boneHealthSection" className="space-y-5 pt-2 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#6E9E93]" />
              <h3 className="text-base font-semibold text-[#2E3A36]">
                6. Salud ósea <span className="text-[#F2A488] font-bold">*</span>
              </h3>
            </div>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              La densidad mineral ósea y el riesgo de fragilidad son fundamentales para planificar la actividad física, nutrición y suplementación adecuada.
            </p>
          </div>

          {/* 6.1 Fracturas de huesos después de los 40 años o con caídas leves */}
          <div id="field-hasBoneFracturesAfter40" className="space-y-3 p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/80">
            <label className="flex items-center justify-between text-xs font-semibold text-[#2E3A36]">
              <span>
                ¿Has tenido fracturas de huesos después de los 40 años o con caídas leves? <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(['Sí', 'No'] as const).map((opt) => {
                const isSelected = normalizeYesNo(formData.hasBoneFracturesAfter40) === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      handleChange('hasBoneFracturesAfter40', opt);
                      if (opt === 'No') {
                        handleChange('boneFracturesDetails', '');
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
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

            {attemptedSubmit && normalizeYesNo(formData.hasBoneFracturesAfter40) === '' && errors.hasBoneFracturesAfter40 && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.hasBoneFracturesAfter40}
              </motion.p>
            )}

            {/* Detalle si Sí */}
            <AnimatePresence>
              {normalizeYesNo(formData.hasBoneFracturesAfter40) === 'Sí' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  id="field-boneFracturesDetails"
                  className="space-y-1.5 pt-2"
                >
                  <label
                    htmlFor="boneFracturesDetails-input"
                    className="text-xs font-semibold text-[#2E3A36] block"
                  >
                    ¿Cuál hueso y a qué edad ocurrió? <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <input
                    id="boneFracturesDetails-input"
                    type="text"
                    value={formData.boneFracturesDetails || ''}
                    onChange={(e) => handleChange('boneFracturesDetails', e.target.value)}
                    onBlur={() => handleBlur('boneFracturesDetails')}
                    placeholder="Ej. Fractura de muñeca a los 46 años tras un tropiezo leve..."
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs sm:text-sm text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                      touched.boneFracturesDetails && errors.boneFracturesDetails
                        ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                        : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                    }`}
                  />
                  {touched.boneFracturesDetails && errors.boneFracturesDetails && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.boneFracturesDetails}
                    </motion.p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 6.2 Densitometría ósea */}
          <div id="field-hasBoneDensitometry" className="space-y-3 p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/80">
            <label className="flex items-center justify-between text-xs font-semibold text-[#2E3A36]">
              <span>
                ¿Te han hecho una densitometría ósea? <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>

            <div className="grid grid-cols-2 gap-3 max-w-xs">
              {(['Sí', 'No'] as const).map((opt) => {
                const isSelected = normalizeYesNo(formData.hasBoneDensitometry) === opt;
                return (
                  <button
                    type="button"
                    key={opt}
                    onClick={() => {
                      handleChange('hasBoneDensitometry', opt);
                      if (opt === 'No') {
                        handleChange('boneDensitometryYear', '');
                        handleChange('boneDensitometryResult', '');
                      }
                    }}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
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

            {attemptedSubmit && normalizeYesNo(formData.hasBoneDensitometry) === '' && errors.hasBoneDensitometry && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.hasBoneDensitometry}
              </motion.p>
            )}

            {/* Campos condicionales si Sí: año y resultado */}
            <AnimatePresence>
              {normalizeYesNo(formData.hasBoneDensitometry) === 'Sí' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 pt-3 border-t border-[#E8E2D8]"
                >
                  {/* Año */}
                  <div id="field-boneDensitometryYear" className="space-y-1.5">
                    <label
                      htmlFor="boneDensitometryYear-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿En qué año te la realizaron aproximadamente? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="boneDensitometryYear-input"
                      type="text"
                      value={formData.boneDensitometryYear || ''}
                      onChange={(e) => handleChange('boneDensitometryYear', e.target.value)}
                      onBlur={() => handleBlur('boneDensitometryYear')}
                      placeholder="Ej. 2023"
                      className={`w-full max-w-xs px-3.5 py-2.5 rounded-xl bg-white border text-xs sm:text-sm text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                        touched.boneDensitometryYear && errors.boneDensitometryYear
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.boneDensitometryYear && errors.boneDensitometryYear && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {errors.boneDensitometryYear}
                      </motion.p>
                    )}
                  </div>

                  {/* Resultado */}
                  <div id="field-boneDensitometryResult" className="space-y-2">
                    <label className="text-xs font-semibold text-[#2E3A36] block">
                      ¿Cuál fue el resultado informado? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {BONE_DENSITOMETRY_RESULTS.map((res) => {
                        const isSelected = formData.boneDensitometryResult === res;
                        return (
                          <button
                            type="button"
                            key={res}
                            onClick={() => handleChange('boneDensitometryResult', res)}
                            className={`p-3 rounded-xl border text-center flex items-center justify-between transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                                : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
                            }`}
                          >
                            <span className="text-xs font-semibold">{res}</span>
                            <div
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                                isSelected
                                  ? 'bg-[#6E9E93] text-white'
                                  : 'border border-[#C8C2B7]'
                              }`}
                            >
                              {isSelected && <Check className="w-2 h-2 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {touched.boneDensitometryResult && errors.boneDensitometryResult && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {errors.boneDensitometryResult}
                      </motion.p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Bloque: Hábitos: tabaco y alcohol */}
        <div id="field-habitsSmokingAlcohol" className="space-y-6 pt-5 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Cigarette className="w-5 h-5 text-[#6E9E93]" />
              <h3 className="text-base sm:text-lg font-semibold text-[#2E3A36]">
                Hábitos: tabaco y alcohol
              </h3>
            </div>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              Registra tus hábitos respecto al consumo de tabaco, vapeo y alcohol para una valoración médica integral.
            </p>
          </div>

          {/* 1. ¿Fumas o has fumado? */}
          <div id="field-smokingStatus" className="space-y-3">
            <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
              <span className="flex items-center gap-2">
                ¿Fumas o has fumado? <span className="text-[#F2A488] font-bold">*</span>
              </span>
              <span className="text-xs font-normal text-[#8E9E99]">Selecciona una opción</span>
            </label>

            <div
              role="radiogroup"
              aria-label="¿Fumas o has fumado?"
              className="grid grid-cols-1 sm:grid-cols-3 gap-2.5"
            >
              {SMOKING_STATUS_OPTIONS.map((status) => {
                const isSelected = formData.smokingStatus === status;
                return (
                  <button
                    type="button"
                    key={status}
                    id={`smoking-status-${status.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    onClick={() => {
                      handleChange('smokingStatus', status);
                    }}
                    className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <span className="truncate">{status}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected
                          ? 'bg-[#6E9E93] text-white'
                          : 'border border-[#C8C2B7] group-hover:border-[#AEC9C0]'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {attemptedSubmit && !formData.smokingStatus && errors.smokingStatus && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.smokingStatus}
              </motion.p>
            )}

            {/* Condicionales de tabaco */}
            <AnimatePresence>
              {formData.smokingStatus === 'Fumo actualmente' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
                  <div id="field-smokingCigarettesPerDay" className="space-y-1.5">
                    <label
                      htmlFor="smokingCigarettesPerDay-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿Cuántos cigarrillos al día? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="smokingCigarettesPerDay-input"
                      type="text"
                      value={formData.smokingCigarettesPerDay || ''}
                      onChange={(e) => handleChange('smokingCigarettesPerDay', e.target.value)}
                      onBlur={() => handleBlur('smokingCigarettesPerDay')}
                      placeholder="Ej. 5 al día, media cajetilla"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-[#2E3A36] text-sm placeholder-[#8E9E99] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                        touched.smokingCigarettesPerDay && errors.smokingCigarettesPerDay
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.smokingCigarettesPerDay && errors.smokingCigarettesPerDay && (
                      <p className="text-xs text-[#C66A4D] flex items-center gap-1 pl-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {errors.smokingCigarettesPerDay}
                      </p>
                    )}
                  </div>

                  <div id="field-smokingYears" className="space-y-1.5">
                    <label
                      htmlFor="smokingYears-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿Hace cuántos años fumas? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="smokingYears-input"
                      type="text"
                      value={formData.smokingYears || ''}
                      onChange={(e) => handleChange('smokingYears', e.target.value)}
                      onBlur={() => handleBlur('smokingYears')}
                      placeholder="Ej. 5 años, desde los 18"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-[#2E3A36] text-sm placeholder-[#8E9E99] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                        touched.smokingYears && errors.smokingYears
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.smokingYears && errors.smokingYears && (
                      <p className="text-xs text-[#C66A4D] flex items-center gap-1 pl-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {errors.smokingYears}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}

              {formData.smokingStatus === 'Fumé pero ya lo dejé' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2 max-w-md"
                >
                  <div id="field-smokingQuitTimeAgo" className="space-y-1.5">
                    <label
                      htmlFor="smokingQuitTimeAgo-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿Hace cuánto lo dejaste? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="smokingQuitTimeAgo-input"
                      type="text"
                      value={formData.smokingQuitTimeAgo || ''}
                      onChange={(e) => handleChange('smokingQuitTimeAgo', e.target.value)}
                      onBlur={() => handleBlur('smokingQuitTimeAgo')}
                      placeholder="Ej. Hace 3 años, 6 meses"
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-[#2E3A36] text-sm placeholder-[#8E9E99] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                        touched.smokingQuitTimeAgo && errors.smokingQuitTimeAgo
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.smokingQuitTimeAgo && errors.smokingQuitTimeAgo && (
                      <p className="text-xs text-[#C66A4D] flex items-center gap-1 pl-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {errors.smokingQuitTimeAgo}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Opción de vapeador */}
            <div className="pt-1">
              <button
                type="button"
                id="field-usesVape"
                onClick={() => handleChange('usesVape', !formData.usesVape)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-sm transition-all duration-200 cursor-pointer ${
                  formData.usesVape
                    ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] font-semibold shadow-2xs'
                    : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all ${
                    formData.usesVape
                      ? 'bg-[#6E9E93] text-white'
                      : 'border border-[#C8C2B7]'
                  }`}
                >
                  {formData.usesVape && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <span>Uso vapeador o cigarrillo electrónico</span>
              </button>
            </div>
          </div>

          {/* 2. ¿Consumes alcohol? */}
          <div id="field-alcoholConsumption" className="space-y-3 pt-3 border-t border-[#E8E2D8]/70">
            <label className="flex items-center justify-between text-sm font-semibold text-[#2E3A36]">
              <span className="flex items-center gap-2">
                <Wine className="w-4 h-4 text-[#6E9E93]" />
                ¿Consumes alcohol? <span className="text-[#F2A488] font-bold">*</span>
              </span>
              <span className="text-xs font-normal text-[#8E9E99]">Selecciona una opción</span>
            </label>

            <div
              role="radiogroup"
              aria-label="¿Consumes alcohol?"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5"
            >
              {ALCOHOL_CONSUMPTION_OPTIONS.map((option) => {
                const isSelected = formData.alcoholConsumption === option;
                return (
                  <button
                    type="button"
                    key={option}
                    id={`alcohol-consumption-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    onClick={() => {
                      handleChange('alcoholConsumption', option);
                    }}
                    className={`group relative flex items-center justify-between px-3.5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                        : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ml-1 transition-all ${
                        isSelected
                          ? 'bg-[#6E9E93] text-white'
                          : 'border border-[#C8C2B7] group-hover:border-[#AEC9C0]'
                      }`}
                    >
                      {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {attemptedSubmit && !formData.alcoholConsumption && errors.alcoholConsumption && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                {errors.alcoholConsumption}
              </motion.p>
            )}

            {/* Condicional de alcohol */}
            <AnimatePresence>
              {formData.alcoholConsumption && formData.alcoholConsumption !== 'No consumo' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="pt-2"
                >
                  <div id="field-alcoholTypicalDrinksDetails" className="space-y-1.5">
                    <label
                      htmlFor="alcoholTypicalDrinksDetails-input"
                      className="text-xs font-semibold text-[#2E3A36] block"
                    >
                      ¿Qué bebida y cuántos tragos en una ocasión típica? <span className="text-[#F2A488] font-bold">*</span>
                    </label>
                    <input
                      id="alcoholTypicalDrinksDetails-input"
                      type="text"
                      value={formData.alcoholTypicalDrinksDetails || ''}
                      onChange={(e) => handleChange('alcoholTypicalDrinksDetails', e.target.value)}
                      onBlur={() => handleBlur('alcoholTypicalDrinksDetails')}
                      placeholder="Ej. 1-2 copas de vino los fines de semana, 2 cervezas, etc."
                      className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-[#2E3A36] text-sm placeholder-[#8E9E99] transition-all focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                        touched.alcoholTypicalDrinksDetails && errors.alcoholTypicalDrinksDetails
                          ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                          : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                      }`}
                    />
                    {touched.alcoholTypicalDrinksDetails && errors.alcoholTypicalDrinksDetails && (
                      <p className="text-xs text-[#C66A4D] flex items-center gap-1 pl-1">
                        <Info className="w-3 h-3 shrink-0" />
                        {errors.alcoholTypicalDrinksDetails}
                      </p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* 6. Antecedentes gineco-obstétricos estructurados (solo visible si sexo es Femenino) */}
        {isFemale && (
          <div id="field-appliesGynecoObstetric" className="space-y-5 pt-3 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center gap-2">
              <Baby className="w-4 h-4 text-[#6E9E93]" />
              <label className="text-sm font-semibold text-[#2E3A36]">
                6. Antecedentes gineco-obstétricos <span className="text-[#F2A488] font-bold">*</span>
              </label>
            </div>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              ¿Aplica en tu caso registrar antecedentes gineco-obstétricos (ciclos menstruales, embarazos, etc.)?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-md">
            {(
              [
                { value: 'Sí', label: 'Sí, aplica en mi caso' },
                { value: 'No', label: 'No aplica en mi caso' },
              ] as const
            ).map((opt) => {
              const isSelected = formData.appliesGynecoObstetric === opt.value;
              return (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => {
                    handleChange('appliesGynecoObstetric', opt.value);
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

          {attemptedSubmit && !formData.appliesGynecoObstetric && errors.appliesGynecoObstetric && (
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

                  {attemptedSubmit &&
                    formData.appliesGynecoObstetric === 'Sí' &&
                    !formData.cycleRegularity &&
                    errors.cycleRegularity && (
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

                  {attemptedSubmit &&
                    formData.appliesGynecoObstetric === 'Sí' &&
                    !formData.menopauseStage &&
                    errors.menopauseStage && (
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

                {/* Terapia hormonal para la menopausia (solo si perimenopausia o menopausia / ya no menstrua) */}
                {(formData.menopauseStage === 'Perimenopausia' ||
                  formData.menopauseStage === 'Menopausia' ||
                  formData.cycleRegularity === 'Ya no menstruo (menopausia / histerectomía)') && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    id="field-usesHormoneReplacementTherapy"
                    className="space-y-3 p-4 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8]/90"
                  >
                    <label className="text-xs font-semibold text-[#2E3A36] block">
                      ¿Usas terapia hormonal para la menopausia?{' '}
                      <span className="text-[#F2A488] font-bold">*</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {HORMONE_THERAPY_OPTIONS.map((opt) => {
                        const isSelected = formData.usesHormoneReplacementTherapy === opt;
                        return (
                          <button
                            type="button"
                            key={opt}
                            onClick={() => {
                              handleChange('usesHormoneReplacementTherapy', opt);
                              if (opt !== 'Sí') {
                                handleChange('hormoneReplacementTherapyDetails', '');
                              }
                            }}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] font-semibold shadow-2xs'
                                : 'bg-white/80 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0]'
                            }`}
                          >
                            <span>{opt}</span>
                            <div
                              className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-1 transition-all ${
                                isSelected
                                  ? 'bg-[#6E9E93] border-[#6E9E93] text-white'
                                  : 'border-[#C8C2B7] bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {attemptedSubmit &&
                      !formData.usesHormoneReplacementTherapy &&
                      errors.usesHormoneReplacementTherapy && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                      >
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        {errors.usesHormoneReplacementTherapy}
                      </motion.p>
                    )}

                    {/* Detalle si Sí */}
                    <AnimatePresence>
                      {formData.usesHormoneReplacementTherapy === 'Sí' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          id="field-hormoneReplacementTherapyDetails"
                          className="space-y-1.5 pt-2 border-t border-[#E8E2D8]"
                        >
                          <label
                            htmlFor="hormoneReplacementTherapyDetails-input"
                            className="text-xs font-semibold text-[#2E3A36] block"
                          >
                            ¿Cuál y desde cuándo? <span className="text-[#F2A488] font-bold">*</span>
                          </label>
                          <input
                            id="hormoneReplacementTherapyDetails-input"
                            type="text"
                            value={formData.hormoneReplacementTherapyDetails || ''}
                            onChange={(e) =>
                              handleChange('hormoneReplacementTherapyDetails', e.target.value)
                            }
                            onBlur={() => handleBlur('hormoneReplacementTherapyDetails')}
                            placeholder="Ej. Estradiol transdérmico en gel + progesterona oral desde 2022..."
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                              touched.hormoneReplacementTherapyDetails &&
                              errors.hormoneReplacementTherapyDetails
                                ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                                : 'border-[#D9D3C8] hover:border-[#AEC9C0]'
                            }`}
                          />
                          {touched.hormoneReplacementTherapyDetails &&
                            errors.hormoneReplacementTherapyDetails && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                            >
                              <Info className="w-3.5 h-3.5 shrink-0" />
                              {errors.hormoneReplacementTherapyDetails}
                            </motion.p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* 1) ¿Estás lactando actualmente? */}
                <div id="field-currentlyBreastfeeding" className="space-y-2 pt-3 border-t border-[#D9D3C8]/70">
                  <label className="text-xs font-semibold text-[#2E3A36] block">
                    ¿Estás lactando actualmente?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {(['Sí', 'No'] as const).map((opt) => {
                      const isSelected = formData.currentlyBreastfeeding === opt;
                      return (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => handleChange('currentlyBreastfeeding', opt)}
                          className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
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
                  {attemptedSubmit &&
                    formData.appliesGynecoObstetric === 'Sí' &&
                    !formData.currentlyBreastfeeding &&
                    errors.currentlyBreastfeeding && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.currentlyBreastfeeding}
                    </motion.p>
                  )}
                </div>

                {/* 2) ¿Qué método de planificación familiar usas? */}
                <div id="field-contraceptiveMethod" className="space-y-2 pt-3 border-t border-[#D9D3C8]/70">
                  <label className="text-xs font-semibold text-[#2E3A36] block">
                    ¿Qué método de planificación familiar usas?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {CONTRACEPTIVE_METHODS.map((method) => {
                      const isSelected = formData.contraceptiveMethod === method;
                      return (
                        <button
                          type="button"
                          key={method}
                          onClick={() => handleChange('contraceptiveMethod', method)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                              : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                          }`}
                        >
                          <span className="text-xs">{method}</span>
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

                  {formData.contraceptiveMethod === 'Otro' && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      id="field-contraceptiveMethodOther"
                      className="pt-1.5"
                    >
                      <input
                        type="text"
                        value={formData.contraceptiveMethodOther || ''}
                        onChange={(e) => handleChange('contraceptiveMethodOther', e.target.value)}
                        onBlur={() => handleBlur('contraceptiveMethodOther')}
                        placeholder="Especifica qué otro método de planificación familiar utilizas..."
                        className={`w-full px-3.5 py-2.5 rounded-xl bg-white border text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                          touched.contraceptiveMethodOther && errors.contraceptiveMethodOther
                            ? 'border-[#F2A488] bg-[#FDEEE9]/40'
                            : 'border-[#D9D3C8]'
                        }`}
                      />
                      {touched.contraceptiveMethodOther && errors.contraceptiveMethodOther && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1 mt-1"
                        >
                          <Info className="w-3.5 h-3.5 shrink-0" />
                          {errors.contraceptiveMethodOther}
                        </motion.p>
                      )}
                    </motion.div>
                  )}

                  {attemptedSubmit &&
                    formData.appliesGynecoObstetric === 'Sí' &&
                    !formData.contraceptiveMethod &&
                    errors.contraceptiveMethod && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.contraceptiveMethod}
                    </motion.p>
                  )}
                </div>

                {/* 3) ¿Planeas un embarazo próximamente? */}
                <div id="field-pregnancyPlan" className="space-y-2 pt-3 border-t border-[#D9D3C8]/70">
                  <label className="text-xs font-semibold text-[#2E3A36] block">
                    ¿Planeas un embarazo próximamente?{' '}
                    <span className="text-[#F2A488] font-bold">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PREGNANCY_PLAN_OPTIONS.map((plan) => {
                      const isSelected = formData.pregnancyPlan === plan;
                      return (
                        <button
                          type="button"
                          key={plan}
                          onClick={() => handleChange('pregnancyPlan', plan)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between gap-2 transition-all duration-200 cursor-pointer ${
                            isSelected
                              ? 'bg-[#EBF3F0] border-[#6E9E93] text-[#2E3A36] shadow-2xs font-semibold'
                              : 'bg-[#FAF6F0]/60 border-[#D9D3C8] text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-[#FAF6F0]'
                          }`}
                        >
                          <span className="text-xs">{plan}</span>
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
                  {attemptedSubmit &&
                    formData.appliesGynecoObstetric === 'Sí' &&
                    !formData.pregnancyPlan &&
                    errors.pregnancyPlan && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      {errors.pregnancyPlan}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        )}

        {/* Trastorno de la conducta alimentaria (TCA) */}
        <div id="field-hasEatingDisorderHistory" className="space-y-3 pt-3 border-t border-[#E8E2D8]">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
              <span>
                {isFemale ? '7' : '6'}. ¿Tienes o has tenido diagnóstico de algún trastorno de la conducta alimentaria?{' '}
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

          {attemptedSubmit && !formData.hasEatingDisorderHistory && errors.hasEatingDisorderHistory && (
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
            Factores biológicos, metabólicos y hereditarios en tu familia biológica (padres, hermanos, abuelos, tíos).
          </p>
        </div>

        {/* Pregunta ampliada y detallada: Antecedentes familiares de obesidad */}
        <div id="field-hasFamilyObesityHistory" className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-semibold text-[#2E3A36] flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#6E9E93]" />
                {isFemale ? '8' : '7'}. ¿Algún familiar cercano ha presentado antecedentes de obesidad o dificultad importante con el peso? <span className="text-[#F2A488] font-bold">*</span>
              </span>
            </label>
            <p className="text-xs text-[#5C6E68]">
              La predisposición genética y el entorno metabólico familiar son piezas clave para personalizar tu abordaje integral.
            </p>
          </div>

          {/* Selector Sí / No */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectHasFamilyObesity('Sí')}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                formData.hasFamilyObesityHistory === 'Sí'
                  ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] ring-1 ring-[#6E9E93]'
                  : 'border-[#D9D3C8] bg-[#FAF6F0]/60 text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    formData.hasFamilyObesityHistory === 'Sí'
                      ? 'border-[#6E9E93] bg-[#6E9E93]'
                      : 'border-[#AEC9C0] bg-white'
                  }`}
                >
                  {formData.hasFamilyObesityHistory === 'Sí' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium block text-[#2E3A36]">
                    Sí, en mi familia hay antecedentes
                  </span>
                  <span className="text-xs text-[#5C6E68]">Indicar quién, edad de inicio y comorbilidades asociadas</span>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSelectHasFamilyObesity('No')}
              className={`p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 cursor-pointer ${
                formData.hasFamilyObesityHistory === 'No'
                  ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] ring-1 ring-[#6E9E93]'
                  : 'border-[#D9D3C8] bg-[#FAF6F0]/60 text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    formData.hasFamilyObesityHistory === 'No'
                      ? 'border-[#6E9E93] bg-[#6E9E93]'
                      : 'border-[#AEC9C0] bg-white'
                  }`}
                >
                  {formData.hasFamilyObesityHistory === 'No' && (
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-medium block text-[#2E3A36]">
                    No, que yo sepa
                  </span>
                  <span className="text-xs text-[#5C6E68]">No hay familiares con obesidad conocida</span>
                </div>
              </div>
            </button>
          </div>

          {attemptedSubmit && !formData.hasFamilyObesityHistory && errors.hasFamilyObesityHistory && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              {errors.hasFamilyObesityHistory}
            </motion.p>
          )}

          {/* Desglose detallado por familiar si responde Sí */}
          <AnimatePresence>
            {formData.hasFamilyObesityHistory === 'Sí' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-1 overflow-hidden"
              >
                <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF6F0]/90 border border-[#AEC9C0]/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D8] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-[#2E3A36] flex items-center gap-2">
                        <Users className="w-4 h-4 text-[#6E9E93]" />
                        Familiares con obesidad o exceso de peso
                      </h3>
                      <p className="text-[11px] text-[#5C6E68] mt-0.5">
                        Indica quién es cada familiar, cuándo inició y qué comorbilidades presenta (diabetes tipo 2, hipertensión, dislipidemia, eventos cardiovasculares tempranos o SOP/infertilidad).
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFamilyObesityMember}
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#6E9E93] text-[#2E3A36] text-xs font-semibold hover:bg-[#EBF3F0] transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer self-start sm:self-auto shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#6E9E93]" />
                      <span>Agregar otro familiar</span>
                    </button>
                  </div>

                  {/* Listado de tarjetas de familiares */}
                  <div className="space-y-4">
                    {(formData.familyObesityMembers || []).map((member, index) => (
                      <div
                        key={member.id || index}
                        className="p-4 rounded-xl bg-white border border-[#D9D3C8] space-y-3.5 shadow-2xs relative"
                      >
                        {/* Encabezado del familiar */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#6E9E93] flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-[#EBF3F0] text-[#2E3A36] flex items-center justify-center text-[10px]">
                              {index + 1}
                            </span>
                            Familiar #{index + 1}
                          </span>

                          {(formData.familyObesityMembers || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveFamilyObesityMember(member.id)}
                              className="text-[#8E9E99] hover:text-[#C66A4D] transition-colors p-1 rounded-lg hover:bg-[#FDEEE9]/60 cursor-pointer"
                              title="Eliminar este familiar"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Parentesco */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#2E3A36] block">
                              ¿Quién es exactamente? <span className="text-[#F2A488] font-bold">*</span>
                            </label>
                            <select
                              value={member.relationship}
                              onChange={(e) =>
                                handleUpdateFamilyObesityMember(member.id, {
                                  relationship: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0]/70 border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                            >
                              {FAMILY_OBESITY_MEMBERS.map((rel) => (
                                <option key={rel} value={rel}>
                                  {rel}
                                </option>
                              ))}
                            </select>

                            {member.relationship === 'Otro familiar' && (
                              <input
                                type="text"
                                value={member.otherRelationship || ''}
                                onChange={(e) =>
                                  handleUpdateFamilyObesityMember(member.id, {
                                    otherRelationship: e.target.value,
                                  })
                                }
                                placeholder="Especifica el parentesco (ej. Primo hermano, Sobrina...)"
                                className="w-full mt-1.5 px-3 py-2 rounded-xl bg-white border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                              />
                            )}
                          </div>

                          {/* Edad de inicio */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#2E3A36] block">
                              ¿A qué edad comenzó con obesidad o sobrepeso? <span className="text-[#F2A488] font-bold">*</span>
                            </label>
                            <select
                              value={member.onsetAge}
                              onChange={(e) =>
                                handleUpdateFamilyObesityMember(member.id, {
                                  onsetAge: e.target.value as any,
                                })
                              }
                              className="w-full px-3 py-2.5 rounded-xl bg-[#FAF6F0]/70 border border-[#D9D3C8] text-[#2E3A36] text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                            >
                              {FAMILY_OBESITY_ONSET_AGES.map((onset) => (
                                <option key={onset} value={onset}>
                                  {onset}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Comorbilidades asociadas a este familiar */}
                        <div className="space-y-2 pt-1 border-t border-[#E8E2D8]">
                          <label className="text-xs font-semibold text-[#2E3A36] block">
                            ¿Qué comorbilidades o enfermedades tiene o tuvo este familiar?
                            <span className="text-[11px] text-[#5C6E68] font-normal block mt-0.5">
                              Selecciona todas las que correspondan a {member.relationship || 'este familiar'} e indica la edad aproximada:
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {FAMILY_COMORBIDITIES_LIST.map((comorb) => {
                              const isChecked = (member.comorbidities || []).includes(comorb);
                              const currentAgeVal = member.comorbiditiesAges?.[comorb] || '';
                              const isDontKnow = currentAgeVal === 'No sé' || currentAgeVal === 'No se';

                              return (
                                <div
                                  key={comorb}
                                  className={`p-3 rounded-2xl border transition-all duration-200 ${
                                    isChecked
                                      ? 'border-[#6E9E93] bg-[#EBF3F0]/90 shadow-2xs'
                                      : 'border-[#D9D3C8] bg-[#FAF6F0]/50 hover:border-[#AEC9C0] hover:bg-white'
                                  }`}
                                >
                                  {/* Header button: toggle comorbidity */}
                                  <button
                                    type="button"
                                    onClick={() => handleToggleMemberComorbidity(member.id, comorb)}
                                    className="w-full text-left text-xs flex items-center justify-between gap-2 cursor-pointer font-medium"
                                  >
                                    <span className={isChecked ? 'text-[#2E3A36] font-semibold' : 'text-[#5C6E68]'}>
                                      {comorb}
                                    </span>
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

                                  {/* Age of onset sub-input when selected */}
                                  {isChecked && (
                                    <motion.div
                                      initial={{ opacity: 0, height: 0 }}
                                      animate={{ opacity: 1, height: 'auto' }}
                                      className="mt-2.5 pt-2.5 border-t border-[#D0E2DC] space-y-1.5"
                                    >
                                      <label className="text-[11px] font-medium text-[#465A54] block">
                                        ¿A qué edad aproximadamente? <span className="text-[#8E9E99] font-normal">(opcional)</span>
                                      </label>

                                      <div className="flex items-center gap-2">
                                        <input
                                          type="number"
                                          min="1"
                                          max="120"
                                          disabled={isDontKnow}
                                          value={isDontKnow ? '' : currentAgeVal}
                                          onChange={(e) =>
                                            handleUpdateMemberComorbidityAge(member.id, comorb, e.target.value)
                                          }
                                          placeholder={isDontKnow ? 'No sabe' : 'Ej. 52'}
                                          className={`w-24 px-2.5 py-1.5 rounded-lg border text-xs bg-white text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                                            isDontKnow ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'border-[#C8C2B7]'
                                          }`}
                                        />

                                        <button
                                          type="button"
                                          onClick={() => {
                                            if (isDontKnow) {
                                              handleUpdateMemberComorbidityAge(member.id, comorb, '');
                                            } else {
                                              handleUpdateMemberComorbidityAge(member.id, comorb, 'No sé');
                                            }
                                          }}
                                          className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                                            isDontKnow
                                              ? 'bg-[#6E9E93] border-[#6E9E93] text-white font-semibold shadow-2xs'
                                              : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#6E9E93] hover:text-[#2E3A36]'
                                          }`}
                                        >
                                          {isDontKnow ? '✓ No sé' : 'No sé'}
                                        </button>
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Campo abierto opcional de otras comorbilidades para este familiar */}
                          <div className="pt-2">
                            <label className="text-xs font-semibold text-[#2E3A36] block mb-1">
                              Otras condiciones médicas conocidas de este familiar <span className="text-[#8E9E99] font-normal">(opcional)</span>
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                              <input
                                type="text"
                                value={member.otherComorbidities || ''}
                                onChange={(e) =>
                                  handleUpdateFamilyObesityMember(member.id, {
                                    otherComorbidities: e.target.value,
                                  })
                                }
                                placeholder="Ej. Hipotiroidismo, cáncer de colon..."
                                className="sm:col-span-2 px-3 py-2 rounded-xl bg-white border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40"
                              />
                              {member.otherComorbidities?.trim() && (
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    disabled={member.otherComorbiditiesAge === 'No sé'}
                                    value={member.otherComorbiditiesAge === 'No sé' ? '' : (member.otherComorbiditiesAge || '')}
                                    onChange={(e) =>
                                      handleUpdateFamilyObesityMember(member.id, {
                                        otherComorbiditiesAge: e.target.value,
                                      })
                                    }
                                    placeholder={member.otherComorbiditiesAge === 'No sé' ? 'No sabe' : 'Edad aprox.'}
                                    className={`w-full px-2.5 py-2 rounded-xl border text-xs bg-white text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 ${
                                      member.otherComorbiditiesAge === 'No sé' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'border-[#D9D3C8]'
                                    }`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const current = member.otherComorbiditiesAge === 'No sé' ? '' : 'No sé';
                                      handleUpdateFamilyObesityMember(member.id, { otherComorbiditiesAge: current });
                                    }}
                                    className={`px-2 py-2 rounded-xl border text-xs font-medium transition-colors cursor-pointer shrink-0 ${
                                      member.otherComorbiditiesAge === 'No sé'
                                        ? 'bg-[#6E9E93] border-[#6E9E93] text-white font-semibold'
                                        : 'bg-white border-[#D9D3C8] text-[#5C6E68] hover:border-[#6E9E93]'
                                    }`}
                                  >
                                    {member.otherComorbiditiesAge === 'No sé' ? '✓ No sé' : 'No sé'}
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {errors.familyObesityMembers && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#C66A4D] flex items-center gap-1.5 pl-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {errors.familyObesityMembers}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Otras condiciones familiares biológicas (Checklist general) */}
        <div id="field-familyHistory" className="space-y-3 pt-4 border-t border-[#E8E2D8]">
          <label className="text-sm font-semibold text-[#2E3A36] block">
            {isFemale ? '9' : '8'}. Además, ¿alguien en tu familia directa (padres, hermanos, abuelos) ha tenido alguna de estas condiciones?
          </label>
          <p className="text-xs text-[#5C6E68]">
            Selecciona todas las condiciones adicionales que apliquen en tu linaje familiar. Si no aplica ninguna, déjalas sin marcar.
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
