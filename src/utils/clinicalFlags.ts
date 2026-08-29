import { PatientBodySymptomsInfo } from '../types';

export interface ClinicalRedFlagItem {
  id: string;
  category: string;
  symptom: string;
  clinicalNote: string;
}

export interface ClinicalRedFlagReport {
  hasRedFlags: boolean;
  flags: ClinicalRedFlagItem[];
}

/**
 * Evaluates internal clinical red flags for the doctor's review.
 * NOTE: This is strictly for the medical report summary and NEVER shown
 * as an alarm to the patient during form filling.
 */
export function evaluateClinicalRedFlags(
  symptoms?: PatientBodySymptomsInfo | null
): ClinicalRedFlagReport {
  if (!symptoms) {
    return { hasRedFlags: false, flags: [] };
  }

  const flags: ClinicalRedFlagItem[] = [];

  const cat5Chips = symptoms.skinHairHormones?.selectedChips || [];
  const cat1Chips = symptoms.general?.selectedChips || [];

  // Flag 1: Moretones que aparecen fácilmente
  if (cat5Chips.includes('Moretones que aparecen fácilmente')) {
    flags.push({
      id: 'bruising',
      category: 'Piel, cabello y hormonas',
      symptom: 'Moretones que aparecen fácilmente',
      clinicalNote:
        'Evaluar fragilidad capilar, coagulopatías, uso de corticoides o síndrome de Cushing.',
    });
  }

  // Flag 2: Debilidad muscular proximal
  if (
    cat5Chips.some((chip) =>
      chip.includes('Debilidad muscular, sobre todo en piernas o brazos')
    )
  ) {
    flags.push({
      id: 'proximal_weakness',
      category: 'Piel, cabello y hormonas / Músculo',
      symptom:
        'Debilidad muscular, sobre todo en piernas o brazos (cuesta subir escaleras o levantarte de una silla)',
      clinicalNote:
        'Miopatía proximal metabólica/endocrina, sarcopenia o descarte de hiperfunción suprarrenal / tiroidopatía.',
    });
  }

  // Flag 3: Hábito intestinal de alarma o estreñimiento severo dependiente de laxantes
  if (
    symptoms.digestiveHabits?.takesLaxatives === 'Frecuentemente / A diario' ||
    symptoms.digestiveHabits?.hasDifficultyDefecating === 'Sí, con esfuerzo o dolor frecuente'
  ) {
    flags.push({
      id: 'digestive_constipation_alert',
      category: 'Digestivo y hábito evacuatorio',
      symptom: `Estreñimiento severo / uso crónico de laxantes (${symptoms.digestiveHabits?.takesLaxatives || 'Frecuente'}, Dificultad: ${symptoms.digestiveHabits?.hasDifficultyDefecating || 'Sí'})`,
      clinicalNote:
        'Evaluar motilidad colónica lenta, disinergia del piso pélvico o dependencia a catárticos.',
    });
  }

  // Flag 4: Nivel alto de estrés o privación de sueño
  if (
    symptoms.moodSleepHabits?.stressLevel &&
    symptoms.moodSleepHabits.stressLevel >= 8
  ) {
    flags.push({
      id: 'high_stress',
      category: 'Ánimo, sueño y mente',
      symptom: `Nivel de estrés reportado muy elevado (${symptoms.moodSleepHabits.stressLevel}/10)`,
      clinicalNote:
        'Evaluar impacto sobre eje HPA / hipercortisolemia, conducta alimentaria por ansiedad e insomnio.',
    });
  }

  // Flag 4: Cambios recientes de peso + cualquier chip de Categoría 5
  const hasWeightChanges = cat1Chips.includes('Cambios recientes de peso');
  const hasCat5Chips = cat5Chips.length > 0 && !symptoms.skinHairHormones.hasNoSymptoms;

  if (hasWeightChanges && hasCat5Chips) {
    flags.push({
      id: 'weight_plus_endocrine_skin',
      category: 'General + Piel, cabello y hormonas',
      symptom: `Cambios recientes de peso combinados con signos cutáneos/hormonales (${cat5Chips.join(
        ', '
      )})`,
      clinicalNote:
        'Complejo metabólico/endocrino sugestivo de resistencia a la insulina avanzada, disfunción tiroidea o eje adrenal.',
    });
  }

  return {
    hasRedFlags: flags.length > 0,
    flags,
  };
}
