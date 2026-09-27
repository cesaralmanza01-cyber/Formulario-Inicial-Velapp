import {
  PatientBodySymptomsInfo,
  PatientWeightHistoryInfo,
  PatientHealthMapInfo,
} from '../types';

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
  symptoms?: PatientBodySymptomsInfo | null,
  weightHistory?: PatientWeightHistoryInfo | null,
  healthMap?: PatientHealthMapInfo | null
): ClinicalRedFlagReport {
  const flags: ClinicalRedFlagItem[] = [];

  // Flag: Inicio de sobrepeso en infancia (cualquier edad) - Bandera roja para la Dra. Lorena Castro
  if (weightHistory?.overweightOnsetStage === 'infancia') {
    const ageNum = weightHistory.childhoodOnsetAge
      ? parseInt(weightHistory.childhoodOnsetAge, 10)
      : NaN;

    flags.push({
      id: 'early_childhood_obesity_genetic_alert',
      category: 'Historia ponderal y genética',
      symptom: 'Obesidad de inicio temprano — ¿genética?',
      clinicalNote:
        'Bandera roja — Nota interna para la Dra. Lorena Castro: El paciente reporta que el sobrepeso empezó a ser un tema en la infancia. Evaluar sospecha de base genética, metabólica o factores tempranos del desarrollo.',
    });

    // Mantener la alerta que ya existe para inicio antes de los 5 años
    if (!isNaN(ageNum) && ageNum < 5) {
      flags.push({
        id: 'early_childhood_obesity_genetic',
        category: 'Historia ponderal y genética',
        symptom: `Sobrepeso iniciado antes de los 5 años (edad reportada: ${ageNum} años)`,
        clinicalNote:
          'ALERTA CLÍNICA PRIORITARIA: Inicio de sobrepeso en la primera infancia (< 5 años). Considerar estudio de obesidad monogénica / vía de la leptina-melanocortina (MC4R, LEP, LEPR, POMC, PCSK1) y evaluar derivación a genética médica.',
      });
    }
  }

  // Flag: Antecedente familiar de enfermedad cardiovascular prematura (1er grado)
  if (healthMap?.hasFamilyObesityHistory === 'Sí' && healthMap.familyObesityMembers) {
    for (const member of healthMap.familyObesityMembers) {
      const rel = (member.relationship || '').toLowerCase().trim();
      const otherRel = (member.otherRelationship || '').toLowerCase().trim();

      const isFather = rel.includes('padre') || rel.includes('papá') || otherRel.includes('padre') || otherRel.includes('papá');
      const isMother = rel.includes('madre') || rel.includes('mamá') || otherRel.includes('madre') || otherRel.includes('mamá');
      const isBrother = rel === 'hermano' || otherRel === 'hermano';
      const isSister = rel === 'hermana' || otherRel === 'hermana';
      const isSiblingAmbiguous = rel.includes('hermano(a)') || rel.includes('hermano/a') || otherRel.includes('herman');
      const isSon = rel === 'hijo' || otherRel === 'hijo';
      const isDaughter = rel === 'hija' || otherRel === 'hija';
      const isChildAmbiguous = rel.includes('hijo(a)') || rel.includes('hijo/a') || otherRel.includes('hij');

      const isFirstDegreeMale = isFather || isBrother || isSon;
      const isFirstDegreeFemale = isMother || isSister || isDaughter;
      const isFirstDegreeAmbiguous = isSiblingAmbiguous || isChildAmbiguous;

      const isFirstDegree = isFirstDegreeMale || isFirstDegreeFemale || isFirstDegreeAmbiguous;
      if (!isFirstDegree) continue;

      const comorbs = member.comorbidities || [];
      const cvdComorbidities = comorbs.filter((c) => {
        const cl = c.toLowerCase();
        return (
          cl.includes('infarto') ||
          cl.includes('trombosis') ||
          cl.includes('acv') ||
          cl.includes('cerebrovascular') ||
          cl.includes('muerte súbita') ||
          cl.includes('muerte subita') ||
          cl.includes('evento cardiovascular a temprana edad')
        );
      });

      for (const cvd of cvdComorbidities) {
        const rawAge = member.comorbiditiesAges?.[cvd]?.trim();
        const ageNum = rawAge ? parseInt(rawAge, 10) : NaN;

        let isPremature = false;
        let reason = '';

        if (!isNaN(ageNum)) {
          if (isFirstDegreeMale && ageNum < 55) {
            isPremature = true;
            reason = `en varón (${member.relationship}) a los ${ageNum} años (<55 años)`;
          } else if (isFirstDegreeFemale && ageNum < 65) {
            isPremature = true;
            reason = `en mujer (${member.relationship}) a los ${ageNum} años (<65 años)`;
          } else if (isFirstDegreeAmbiguous) {
            if (ageNum < 55) {
              isPremature = true;
              reason = `en familiar de 1.er grado (${member.relationship}) a los ${ageNum} años (<55 años)`;
            } else if (ageNum < 65) {
              isPremature = true;
              reason = `en familiar de 1.er grado (${member.relationship}) a los ${ageNum} años (<65 años)`;
            }
          }
        } else if (cvd.toLowerCase().includes('temprana edad')) {
          isPremature = true;
          reason = `en familiar de 1.er grado (${member.relationship}) reportado a temprana edad`;
        }

        if (isPremature) {
          flags.push({
            id: `fam_cvd_premature_${member.id || rel}`,
            category: 'Cardiovascular y antecedentes hereditarios',
            symptom: 'Antecedente familiar de enfermedad cardiovascular prematura',
            clinicalNote: `ALERTA CLÍNICA: Familiar de primer grado (${member.relationship}) con antecedente de ${cvd} ${reason}. Criterio de alto riesgo aterosclerótico y cardiovascular según guías clínicas (evento coronario/vascular en varón <55 o mujer <65 años). Evaluar perfil lipídico avanzado (ApoB / Lp(a)), estratificación de riesgo cardiovascular y tamizaje preventivo.`,
          });
          break; // Avoid duplicate flag for same member
        }
      }
    }
  }

  if (!symptoms) {
    return { hasRedFlags: flags.length > 0, flags };
  }

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

  // Flag 5: Tamizaje PHQ-2 positivo (≥ 3 puntos) - Bandera roja para la doctora
  const phq2 = symptoms.moodSleepHabits?.phq2;
  const phq2Score =
    phq2?.totalScore !== undefined
      ? phq2.totalScore
      : (phq2?.littleInterest || phq2?.feelingDown)
      ? (
          (phq2.littleInterest === 'Nunca' ? 0 : phq2.littleInterest === 'Varios días' ? 1 : phq2.littleInterest === 'Más de la mitad de los días' ? 2 : phq2.littleInterest === 'Casi todos los días' ? 3 : 0) +
          (phq2.feelingDown === 'Nunca' ? 0 : phq2.feelingDown === 'Varios días' ? 1 : phq2.feelingDown === 'Más de la mitad de los días' ? 2 : phq2.feelingDown === 'Casi todos los días' ? 3 : 0)
        )
      : 0;

  if (phq2Score >= 3) {
    flags.push({
      id: 'phq2_positive_depression',
      category: 'Salud mental y estado de ánimo',
      symptom: 'PHQ-2 positivo (≥3) — ampliar evaluación de depresión',
      clinicalNote: `Tamizaje PHQ-2 positivo (${phq2Score}/6 puntos). Respuestas: 1) Poco interés/placer: "${phq2?.littleInterest || '—'}", 2) Tristeza/desánimo: "${phq2?.feelingDown || '—'}". Se recomienda ampliar evaluación clínica de síntomas afectivos y considerar aplicación de escala PHQ-9 completa.`,
    });
  }

  // Flag 6: Tamizaje STOP de Apnea del Sueño positivo (≥ 2 de 4) - Bandera roja para la doctora
  const stop = symptoms.moodSleepHabits?.sleepAssessment?.stopScreening;
  let stopScore = 0;
  if (stop) {
    if (stop.score !== undefined) {
      stopScore = stop.score;
    } else {
      if (stop.snoringLoudly === 'Sí') stopScore++;
      if (stop.tiredDuringDay === 'Sí') stopScore++;
      if (stop.observedApnea === 'Sí') stopScore++;
      if (stop.highBloodPressure === 'Sí') stopScore++;
    }
  }

  if (stopScore >= 2) {
    const positiveItems: string[] = [];
    if (stop?.snoringLoudly === 'Sí') positiveItems.push('Ronquido fuerte');
    if (stop?.tiredDuringDay === 'Sí') positiveItems.push('Cansancio/fatiga diurna');
    if (stop?.observedApnea === 'Sí') positiveItems.push('Apnea/ahogo nocturno observado');
    if (stop?.highBloodPressure === 'Sí') positiveItems.push('Hipertensión arterial');

    flags.push({
      id: 'stop_apnea_positive',
      category: 'Sueño y riesgo respiratorio',
      symptom: 'Tamizaje STOP positivo — completar STOP-Bang en consulta',
      clinicalNote: `Tamizaje STOP positivo: ${stopScore} de 4 criterios afirmativos (${positiveItems.join(', ')}). Sugestivo de riesgo elevado de Síndrome de Apnea-Hipopnea Obstructiva del Sueño (SAHOS). Se recomienda completar STOP-Bang en consulta presencial (evaluar IMC >35, edad >50, perímetro de cuello y sexo masculino) y considerar estudio de polisomnografía / poligrafía respiratoria.`,
    });
  }

  // Flag 7: Cambios recientes de peso + cualquier chip de Categoría 5
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
