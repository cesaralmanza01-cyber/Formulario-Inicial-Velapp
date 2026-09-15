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

export interface StepCompletenessResult {
  step: number;
  label: string;
  complete: boolean;
}

interface AllStepsData {
  step1: PatientBasicInfo | null;
  step2: PatientMotivationInfo | null;
  step3: PatientWeightHistoryInfo | null;
  step4: PatientHealthMapInfo | null;
  step5: PatientBodySymptomsInfo | null;
  step6: PatientNutritionInfo | null;
  step7: PatientPhysicalActivityInfo | null;
  step9: PatientLabExamsInfo | null;
  stepInBody: PatientInBodyInfo | null;
}

// Cada función replica exactamente la misma condición de "isFormComplete" /
// "isFormValid" / "validate()" que ya existe dentro de su Step*Form — no se
// inventan reglas nuevas, solo se reutilizan para poder chequear todo junto
// al llegar al paso final.

function isStep1Complete(data: PatientBasicInfo | null): boolean {
  if (!data) return false;
  return (
    data.fullName.trim().length > 0 &&
    data.documentNumber.trim().length > 0 &&
    data.birthDate.length > 0 &&
    data.age.trim().length > 0 &&
    data.occupation.trim().length > 0 &&
    data.civilStatus.length > 0 &&
    data.referralSource.length > 0 &&
    (data.referralSource !== 'Otro' || data.referralOtherDetails.trim().length > 0)
  );
}

function isStep2Complete(data: PatientMotivationInfo | null): boolean {
  if (!data) return false;
  return (
    data.consultationReason.trim().length > 0 &&
    data.expectedGoals.trim().length > 0 &&
    (data.currentObstacles || '').trim().length > 0 &&
    data.futureVision.trim().length > 0
  );
}

function isStep3Complete(data: PatientWeightHistoryInfo | null): boolean {
  if (!data) return false;

  if (
    !data.currentWeightKg.trim() ||
    !data.heightCm?.trim() ||
    !data.lowestWeightSince18Kg.trim() ||
    !data.highestWeightSince18Kg.trim()
  ) {
    return false;
  }

  if (!data.hasPreviousAttempts) return false;
  if (data.hasPreviousAttempts === 'Sí') {
    if (
      !data.fluctuationCount ||
      !data.regainSpeed ||
      !data.previousMethods ||
      data.previousMethods.length === 0 ||
      !data.includedExercise ||
      !data.restrictiveDiets
    ) {
      return false;
    }
  }

  if (!data.usedWeightMedications) return false;
  if (data.usedWeightMedications === 'Sí') {
    if (
      !data.weightMedicationsNames?.trim() ||
      !data.weightMedicationsExperience?.trim() ||
      !data.weightMedicationsAdverseEffects?.trim()
    ) {
      return false;
    }
  }

  if (!data.hadBariatricSurgery) return false;
  if (data.hadBariatricSurgery === 'Sí') {
    if (!data.bariatricSurgeryTimeAgo?.trim()) return false;
  }

  if (!data.hadAestheticSurgery) return false;
  if (data.hadAestheticSurgery === 'Sí') {
    if (!data.aestheticSurgeryDetails?.trim() || !data.aestheticSurgeryTimeAgo?.trim()) {
      return false;
    }
  }

  return true;
}

function isStep4Complete(data: PatientHealthMapInfo | null): boolean {
  if (!data) return false;
  if (!data.pathologicalHistory.trim()) return false;
  // Pharmacological history is satisfied either by direct text or by answering the structured medications question
  const hasPharmInfo =
    (data.pharmacologicalHistory && data.pharmacologicalHistory.trim().length > 0) ||
    data.takesObesogenicMedications === 'No' ||
    (data.takesObesogenicMedications === 'Sí' &&
      ((data.selectedObesogenicDrugs && data.selectedObesogenicDrugs.length > 0) ||
        (data.otherMedicationsDetails && data.otherMedicationsDetails.trim().length > 0)));

  if (!hasPharmInfo) return false;
  if (!data.surgicalHistory.trim()) return false;
  if (!data.hospitalHistory.trim()) return false;
  if (!data.toxicAllergicHistory.trim()) return false;

  if (!data.appliesGynecoObstetric) return false;
  if (data.appliesGynecoObstetric === 'Sí') {
    if (!data.menarcheAge?.trim()) return false;
    if (!data.cycleRegularity) return false;
    if (
      (data.cycleRegularity === 'Regulares' || data.cycleRegularity === 'Irregulares') &&
      !data.cycleDuration?.trim()
    ) {
      return false;
    }
    if (!data.menopauseStage) return false;
  }

  if (!data.hasEatingDisorderHistory) return false;

  // Antecedentes familiares: pregunta ampliada sobre obesidad en la familia
  if (!data.hasFamilyObesityHistory) return false;
  if (data.hasFamilyObesityHistory === 'Sí') {
    if (!data.familyObesityMembers || data.familyObesityMembers.length === 0) return false;
    const hasValidMember = data.familyObesityMembers.some(
      (m) => m.relationship && (m.relationship !== 'Otro familiar' || !!m.otherRelationship?.trim())
    );
    if (!hasValidMember) return false;
  }

  return true;
}

const SYMPTOM_CATEGORY_KEYS: (keyof Omit<
  PatientBodySymptomsInfo,
  'additionalNotes' | 'digestiveHabits' | 'moodSleepHabits'
>)[] = [
  'general',
  'cardiovascular',
  'respiratory',
  'digestive',
  'skinHairHormones',
  'musclesJoints',
  'moodSleepMind',
];

function isStep5Complete(data: PatientBodySymptomsInfo | null): boolean {
  if (!data) return false;
  return SYMPTOM_CATEGORY_KEYS.every((key) => {
    const cat = data[key];
    if (!cat) return false;
    if (cat.skipped) return true;
    if (cat.hasNoSymptoms) return true;
    return Boolean(cat.selectedChips && cat.selectedChips.length > 0);
  });
}

function isStep6Complete(data: PatientNutritionInfo | null): boolean {
  if (!data) return false;
  if (!data.favoriteFoods.trim()) return false;
  if (!data.dislikedFoods.trim()) return false;

  if (!data.dietaryRestrictions || data.dietaryRestrictions.length === 0) return false;
  if (
    data.dietaryRestrictions.includes('Otra') &&
    (!data.dietaryRestrictionsOther || !data.dietaryRestrictionsOther.trim())
  ) {
    return false;
  }
  if (
    data.dietaryRestrictions.includes('Alergia alimentaria') &&
    (!data.dietaryAllergiesDetails || !data.dietaryAllergiesDetails.trim())
  ) {
    return false;
  }

  if (!data.mealPreparationStyle) return false;
  if (!data.eatingOutFrequency) return false;

  return true;
}

function isStep7Complete(data: PatientPhysicalActivityInfo | null): boolean {
  if (!data) return false;
  if (!data.dailyActivityType) return false;
  if (!data.takesStairsFrequency) return false;
  if (!data.walksForTransport) return false;
  if (!data.dailySittingHours) return false;
  if (!data.doesStructuredExercise) return false;

  if (data.doesStructuredExercise === 'Sí') {
    if (!data.exerciseTypes || data.exerciseTypes.length === 0) return false;
    if (
      data.exerciseTypes.includes('Otro') &&
      (!data.exerciseTypesOther || !data.exerciseTypesOther.trim())
    ) {
      return false;
    }
    if (!data.exerciseWeeklyFrequency) return false;
  }

  return true;
}

function isStep9Complete(data: PatientLabExamsInfo | null): boolean {
  if (!data) return false;
  if (!data.hasRecentLabs) return false;
  if (data.hasRecentLabs === 'Sí' && (!data.files || data.files.length === 0)) return false;
  return true;
}

function isStepInBodyComplete(data: PatientInBodyInfo | null): boolean {
  if (!data) return false;
  if (!data.hasInBodyReport) return false;
  if (data.hasInBodyReport === 'Sí' && (!data.files || data.files.length === 0)) return false;
  return true;
}

export function evaluateAllSteps(data: AllStepsData): StepCompletenessResult[] {
  return [
    { step: 1, label: 'Datos personales', complete: isStep1Complete(data.step1) },
    { step: 2, label: 'Motivo y objetivos', complete: isStep2Complete(data.step2) },
    { step: 3, label: 'Tu relación con el peso', complete: isStep3Complete(data.step3) },
    { step: 4, label: 'Tu mapa de salud', complete: isStep4Complete(data.step4) },
    { step: 5, label: '¿Cómo se siente tu cuerpo?', complete: isStep5Complete(data.step5) },
    { step: 6, label: 'Hablemos de tu alimentación', complete: isStep6Complete(data.step6) },
    { step: 7, label: '¿Cómo te mueves en tu día a día?', complete: isStep7Complete(data.step7) },
    { step: 9, label: 'Exámenes de laboratorio', complete: isStep9Complete(data.step9) },
    { step: 10, label: 'InBody / composición corporal', complete: isStepInBodyComplete(data.stepInBody) },
  ];
}
