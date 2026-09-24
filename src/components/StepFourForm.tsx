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
} from 'lucide-react';
import {
  PatientHealthMapInfo,
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
} from '../types';

interface StepFourFormProps {
  initialData?: PatientHealthMapInfo;
  patientSex?: PatientSex;
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
        return JSON.parse(saved);
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
        otherMedicationsDetails: '',
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
        hasFamilyObesityHistory: '',
        familyObesityMembers: [],
        familyHistoryNotes: '',
      }
    );
  });

  const [touched, setTouched] = useState<Record<string, boolean>>({
    pathologicalHistory: false,
    pharmacologicalHistory: false,
    takesObesogenicMedications: false,
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
        const saysNo = currentForm.takesObesogenicMedications === 'No';

        if (!hasSelectedDrugs && !hasOtherMeds && !saysNo) {
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
        if (!currentForm.toxicAllergicHistory.trim()) {
          return 'Por favor registra alergias y hábitos de consumo o escribe "Ninguno".';
        }
        return '';

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

      case 'hasEatingDisorderHistory':
        if (!currentForm.hasEatingDisorderHistory) {
          return 'Por favor responde a esta pregunta.';
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

  const toggleObesogenicDrug = (drugName: string) => {
    const current = formData.selectedObesogenicDrugs || [];
    const exists = current.includes(drugName);
    const updated = exists
      ? current.filter((d) => d !== drugName)
      : [...current, drugName];

    // Compute updated narrative summary for pharmacologicalHistory
    const parts: string[] = [];
    if (updated.length > 0) {
      parts.push(`Fármacos de la lista: ${updated.join(', ')}`);
    }
    if (formData.otherMedicationsDetails?.trim()) {
      parts.push(`Otros: ${formData.otherMedicationsDetails.trim()}`);
    }

    const hasAnyMed = updated.length > 0 || !!formData.otherMedicationsDetails?.trim();
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      takesObesogenicMedications: hasAnyMed ? 'Sí' : (formData.takesObesogenicMedications === 'No' ? 'No' : ''),
      selectedObesogenicDrugs: updated,
      pharmacologicalHistory: parts.join(' | ') || (formData.takesObesogenicMedications === 'No' ? 'Ninguno actualmente' : ''),
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

  const handleOtherMedsChange = (text: string) => {
    const selected = formData.selectedObesogenicDrugs || [];
    const parts: string[] = [];
    if (selected.length > 0) {
      parts.push(`Fármacos de la lista: ${selected.join(', ')}`);
    }
    if (text.trim()) {
      parts.push(`Otros: ${text.trim()}`);
    }

    const hasAnyMed = selected.length > 0 || !!text.trim();
    const updatedFormData: PatientHealthMapInfo = {
      ...formData,
      otherMedicationsDetails: text,
      takesObesogenicMedications: hasAnyMed ? 'Sí' : (formData.takesObesogenicMedications === 'No' ? 'No' : ''),
      pharmacologicalHistory: parts.join(' | ') || (formData.takesObesogenicMedications === 'No' ? 'Ninguno actualmente' : ''),
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
    
    // Validar antecedentes farmacológicos (debe haber marcado fármacos, escrito en Otros o marcado No tomo ningún medicamento)
    const hasSelectedDrugs = (formData.selectedObesogenicDrugs || []).length > 0;
    const hasOtherMeds = !!formData.otherMedicationsDetails?.trim();
    const saysNo = formData.takesObesogenicMedications === 'No';
    if (!hasSelectedDrugs && !hasOtherMeds && !saysNo) return false;

    if (!formData.surgicalHistory.trim()) return false;
    if (!formData.hospitalHistory.trim()) return false;
    if (!formData.toxicAllergicHistory.trim()) return false;

    // Gineco-obstétrico validation (solo si sexo es femenino)
    if (isFemale) {
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
    }

    // TCA
    if (!formData.hasEatingDisorderHistory) return false;

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

    handleUpdateFamilyObesityMember(id, { comorbidities: updatedComorbidities });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Record<string, boolean> = {
      pathologicalHistory: true,
      pharmacologicalHistory: true,
      takesObesogenicMedications: true,
      surgicalHistory: true,
      hospitalHistory: true,
      toxicAllergicHistory: true,
      appliesGynecoObstetric: isFemale,
      pregnanciesCount: isFemale,
      vaginalDeliveriesCount: isFemale,
      cesareanCount: isFemale,
      lossesCount: isFemale,
      cycleRegularity: isFemale,
      cycleDuration: isFemale,
      menarcheAge: isFemale,
      menopauseStage: isFemale,
      hasEatingDisorderHistory: true,
      eatingDisorderDetails: true,
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
      appliesGynecoObstetric: isFemale ? validateField('appliesGynecoObstetric', formData) : '',
      menarcheAge: isFemale ? validateField('menarcheAge', formData) : '',
      cycleRegularity: isFemale ? validateField('cycleRegularity', formData) : '',
      cycleDuration: isFemale ? validateField('cycleDuration', formData) : '',
      menopauseStage: isFemale ? validateField('menopauseStage', formData) : '',
      hasEatingDisorderHistory: validateField('hasEatingDisorderHistory', formData),
      hasFamilyObesityHistory: validateField('hasFamilyObesityHistory', formData),
      familyObesityMembers: validateField('familyObesityMembers', formData),
    };

    setErrors(newErrors);

    const hasAnyError = Object.values(newErrors).some((err) => !!err);
    if (!hasAnyError && isFormValid) {
      const dataToSave: PatientHealthMapInfo = isFemale
        ? formData
        : {
            ...formData,
            appliesGynecoObstetric: 'No',
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
                      return (
                        <button
                          key={drug}
                          type="button"
                          onClick={() => toggleObesogenicDrug(drug)}
                          className={`px-3 py-2.5 rounded-xl text-xs font-medium border flex items-center justify-between transition-all duration-150 cursor-pointer text-left ${
                            isSelected
                              ? 'border-[#6E9E93] bg-[#6E9E93] text-white shadow-2xs font-semibold ring-1 ring-[#6E9E93]'
                              : 'border-[#D9D3C8] bg-white text-[#2E3A36] hover:border-[#6E9E93] hover:bg-[#EBF3F0]'
                          }`}
                        >
                          <span className="truncate">{drug}</span>
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

            {/* Espacio abierto para 'Otros medicamentos' */}
            <div className="pt-3 border-t border-[#E8E2D8] space-y-1.5">
              <label
                htmlFor="otherMedications-input"
                className="text-xs font-semibold text-[#2E3A36] flex items-center justify-between flex-wrap gap-1"
              >
                <span>¿Qué otros medicamentos, suplementos o tratamientos tomas?</span>
                <span className="text-[11px] text-[#5C6E68] font-normal">
                  (tiroides, anticonceptivos, antihipertensivos, analgésicos, vitaminas, etc.)
                </span>
              </label>
              <textarea
                id="otherMedications-input"
                rows={2}
                value={formData.otherMedicationsDetails || ''}
                onChange={(e) => handleOtherMedsChange(e.target.value)}
                onBlur={() => handleBlur('pharmacologicalHistory')}
                placeholder="Escribe aquí qué otros medicamentos tomas habitualmente, con dosis o frecuencia si las recuerdas (ej. Levotiroxina 50 mcg en ayunas, Losartán 50 mg, píldoras anticonceptivas, etc.)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[#D9D3C8] text-[#2E3A36] placeholder-[#8E9E99] text-xs sm:text-sm transition-all duration-200 focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 resize-y"
              />
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

          {(touched.takesObesogenicMedications || touched.pharmacologicalHistory) &&
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

          {touched.hasFamilyObesityHistory && errors.hasFamilyObesityHistory && (
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
                              Selecciona todas las que correspondan a {member.relationship || 'este familiar'}:
                            </span>
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {FAMILY_COMORBIDITIES_LIST.map((comorb) => {
                              const isChecked = (member.comorbidities || []).includes(comorb);
                              return (
                                <button
                                  type="button"
                                  key={comorb}
                                  onClick={() => handleToggleMemberComorbidity(member.id, comorb)}
                                  className={`px-3 py-2 rounded-xl text-left text-xs border flex items-center justify-between transition-all cursor-pointer ${
                                    isChecked
                                      ? 'border-[#6E9E93] bg-[#EBF3F0] text-[#2E3A36] font-semibold ring-1 ring-[#6E9E93]'
                                      : 'border-[#D9D3C8] bg-[#FAF6F0]/50 text-[#5C6E68] hover:border-[#AEC9C0] hover:bg-white'
                                  }`}
                                >
                                  <span className="pr-1">{comorb}</span>
                                  <div
                                    className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
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

                          {/* Campo abierto opcional de otras comorbilidades para este familiar */}
                          <div className="pt-1">
                            <input
                              type="text"
                              value={member.otherComorbidities || ''}
                              onChange={(e) =>
                                handleUpdateFamilyObesityMember(member.id, {
                                  otherComorbidities: e.target.value,
                                })
                              }
                              placeholder="Otras condiciones médicas conocidas de este familiar (opcional)..."
                              className="w-full px-3 py-2 rounded-xl bg-[#FAF6F0]/40 border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#6E9E93]/40 focus:bg-white"
                            />
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
