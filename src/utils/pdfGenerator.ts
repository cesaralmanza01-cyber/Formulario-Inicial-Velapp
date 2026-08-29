import jsPDF from 'jspdf';
import {
  FirestoreQuestionnaireDocument,
  UploadedLabFile,
  MealMomentEntry,
  WeightTrajectoryMilestone,
} from '../types';
import { getFileDataUrl } from './fileMemoryStore';

/**
 * Formats date into readable Colombian / Latin American format
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'No registrado';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculates BMI and returns formatted string with clinical category
 */
function calculateBmiString(weightKgStr?: string, heightCmStr?: string): string | null {
  if (!weightKgStr || !heightCmStr) return null;
  const w = parseFloat(weightKgStr);
  const h = parseFloat(heightCmStr);
  if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return null;

  const hM = h / 100;
  const bmi = Math.round((w / (hM * hM)) * 10) / 10;

  let category = 'Normopeso';
  if (bmi < 18.5) category = 'Bajo peso';
  else if (bmi >= 25 && bmi < 30) category = 'Sobrepeso';
  else if (bmi >= 30 && bmi < 35) category = 'Obesidad Grado I';
  else if (bmi >= 35 && bmi < 40) category = 'Obesidad Grado II';
  else if (bmi >= 40) category = 'Obesidad Grado III (Mórbida)';

  return `${bmi} kg/m² (${category})`;
}

/**
 * Creates and formats a jsPDF document containing the 100% complete patient medical history,
 * guaranteeing zero text overlap and perfect proportional rendering for all attachments.
 */
export function generatePatientQuestionnairePdfDoc(
  patient: FirestoreQuestionnaireDocument
): jsPDF {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  const contentWidth = pageWidth - margin * 2;
  let y = 36;

  // Helper to ensure sufficient space or trigger page break cleanly
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 38) {
      doc.addPage();
      y = 36;
    }
  };

  // Helper to draw clean section header banner
  const printSectionTitle = (title: string) => {
    checkPageBreak(38);
    // Background bar in pale salvia #EBF3F0 (RGB: 235, 243, 240)
    doc.setFillColor(235, 243, 240);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
    doc.setDrawColor(174, 201, 192); // #AEC9C0
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'S');

    doc.setTextColor(91, 136, 126); // #5B887E Deep Sage
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, margin + 10, y + 13.5);
    y += 27;
  };

  // Helper to draw sub-section title
  const printSubSectionTitle = (subtitle: string) => {
    checkPageBreak(24);
    doc.setFillColor(244, 249, 247); // #F4F9F7
    doc.roundedRect(margin + 4, y, contentWidth - 8, 16, 2, 2, 'F');

    doc.setTextColor(110, 158, 147); // #6E9E93
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(subtitle, margin + 10, y + 11.5);
    y += 20;
  };

  /**
   * Safe Field Printer:
   * Completely prevents text collision/overlap ("letra sobre letra"):
   * - If value is long (multi-line, paragraph, list, or label > 140pt): renders stacked block with indented text.
   * - If value is short and label fits comfortably: renders clean 2-column inline with measured column widths.
   */
  const printField = (
    label: string,
    value?: string | number | null | undefined,
    forceBlock: boolean = false
  ) => {
    if (value === undefined || value === null || value === '') return;
    const strVal = String(value).trim();
    if (!strVal) return;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const labelFull = `${label}:`;
    const labelTextWidth = doc.getTextWidth(labelFull);

    const isLongText =
      strVal.length > 55 ||
      strVal.includes('\n') ||
      labelTextWidth > 135 ||
      forceBlock;

    if (isLongText) {
      // Stacked Block layout: Label on top, Value wrapped below
      const textMaxWidth = contentWidth - 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(strVal, textMaxWidth);
      const totalBlockHeight = 12 + lines.length * 11 + 4;

      checkPageBreak(totalBlockHeight);

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(91, 136, 126); // #5B887E
      doc.text(labelFull, margin + 8, y + 9);

      // Value (indented)
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(46, 58, 54); // #2E3A36
      doc.text(lines, margin + 12, y + 21);

      y += totalBlockHeight;
    } else {
      // 2-Column Inline layout: Label on left, Value on right with guaranteed space
      const colLabelWidth = 145;
      const colValueWidth = contentWidth - colLabelWidth - 16;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const valLines = doc.splitTextToSize(strVal, colValueWidth);
      const rowHeight = Math.max(13, valLines.length * 11 + 3);

      checkPageBreak(rowHeight);

      // Label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(92, 110, 104); // #5C6E68
      doc.text(labelFull, margin + 8, y + 9);

      // Value
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(46, 58, 54); // #2E3A36
      doc.text(valLines, margin + colLabelWidth + 8, y + 9);

      y += rowHeight;
    }
  };

  /**
   * Highlight / Card Block for quotes, extensive daily routines, and important clinical narratives
   */
  const printNarrativeCard = (label: string, content?: string | null) => {
    if (!content || !content.trim()) return;
    const str = content.trim();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const textLines = doc.splitTextToSize(str, contentWidth - 24);
    const cardHeight = 22 + textLines.length * 11 + 6;

    checkPageBreak(cardHeight);

    // Card background
    doc.setFillColor(250, 246, 240); // #FAF6F0
    doc.roundedRect(margin + 6, y, contentWidth - 12, cardHeight - 4, 3, 3, 'F');
    doc.setDrawColor(232, 226, 216); // #E8E2D8
    doc.setLineWidth(0.5);
    doc.roundedRect(margin + 6, y, contentWidth - 12, cardHeight - 4, 3, 3, 'S');

    // Card Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(91, 136, 126); // #5B887E
    doc.text(label, margin + 14, y + 13);

    // Card Body
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(46, 58, 54); // #2E3A36
    doc.text(textLines, margin + 14, y + 25);

    y += cardHeight;
  };

  // ==========================================
  // 1. Header Banner (Vela Deep Sage #6E9E93)
  // ==========================================
  doc.setFillColor(110, 158, 147);
  doc.roundedRect(margin, y, contentWidth, 64, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VELA • CUESTIONARIO MÉDICO INICIAL', margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    'Manejo Médico e Integral del Sobrepeso y la Obesidad • Dra. Lorena Castro',
    margin + 16,
    y + 45
  );

  y += 74;

  // ==========================================
  // 2. Patient Identity Card (Vela Cream #FAF6F0)
  // ==========================================
  doc.setFillColor(250, 246, 240);
  doc.roundedRect(margin, y, contentWidth, 62, 4, 4, 'F');
  doc.setDrawColor(217, 211, 200); // #D9D3C8
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, contentWidth, 62, 4, 4, 'S');

  doc.setTextColor(46, 58, 54); // #2E3A36 Verde carbón
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(patient.patientName || 'Paciente', margin + 14, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 110, 104); // #5C6E68
  doc.text(
    `Documento: ${patient.identificacion?.documentType || 'CC'} ${patient.patientDocument || 'Sin documento'}  •  Edad: ${patient.identificacion?.age || '—'} años  •  Ocupación: ${patient.identificacion?.occupation || '—'}`,
    margin + 14,
    y + 34
  );

  const docDate = patient.completedAt || patient.savedAt || patient.updatedAt || patient.startedAt;
  doc.text(
    `Fecha de registro: ${formatDate(docDate)}  •  Estado civil: ${patient.identificacion?.civilStatus || 'No indicado'}  •  Referencia: ${patient.identificacion?.referralSource || 'Vela'}${patient.identificacion?.referralOtherDetails ? ` (${patient.identificacion.referralOtherDetails})` : ''}`,
    margin + 14,
    y + 49
  );

  y += 72;

  // ==========================================
  // 1. IDENTIFICACIÓN Y DATOS PERSONALES
  // ==========================================
  printSectionTitle('1. IDENTIFICACIÓN Y DATOS PERSONALES');
  printField('Nombre completo', patient.identificacion?.fullName || patient.patientName);
  printField(
    'Documento de identidad',
    patient.identificacion?.documentNumber
      ? `${patient.identificacion?.documentType || 'CC'} ${patient.identificacion.documentNumber}`
      : patient.patientDocument
  );
  printField('Fecha de nacimiento', patient.identificacion?.birthDate);
  printField('Edad', patient.identificacion?.age ? `${patient.identificacion.age} años` : null);
  printField('Ocupación y Profesión', patient.identificacion?.occupation);
  printField('Estado civil', patient.identificacion?.civilStatus);
  printField(
    'Medio por el cual conoció a Vela',
    patient.identificacion?.referralSource
      ? `${patient.identificacion.referralSource}${patient.identificacion.referralOtherDetails ? ` — ${patient.identificacion.referralOtherDetails}` : ''}`
      : null
  );

  // ==========================================
  // 2. MOTIVO DE CONSULTA Y OBJETIVOS
  // ==========================================
  printSectionTitle('2. MOTIVO DE CONSULTA Y OBJETIVOS');
  printNarrativeCard('Motivo principal de consulta', patient.motivo_objetivos?.consultationReason);
  printNarrativeCard('Metas y expectativas para tu proceso', patient.motivo_objetivos?.expectedGoals);
  printNarrativeCard('Visión a 6 meses de tu salud y bienestar', patient.motivo_objetivos?.futureVision);
  printNarrativeCard('Obstáculos y dificultades que percibes actualmente', patient.motivo_objetivos?.currentObstacles);

  // ==========================================
  // 3. HISTORIAL Y RELACIÓN CON EL PESO
  // ==========================================
  printSectionTitle('3. HISTORIAL Y RELACIÓN CON EL PESO');
  
  // Basic anthropometry
  const bmiStr = calculateBmiString(
    patient.relacion_peso?.currentWeightKg,
    patient.relacion_peso?.heightCm
  );
  printField('Peso actual', patient.relacion_peso?.currentWeightKg ? `${patient.relacion_peso.currentWeightKg} kg` : null);
  printField('Estatura / Talla', patient.relacion_peso?.heightCm ? `${patient.relacion_peso.heightCm} cm` : null);
  if (bmiStr) {
    printField('Índice de Masa Corporal (IMC)', bmiStr);
  }
  printField('Menor peso alcanzado (+18)', patient.relacion_peso?.lowestWeightSince18Kg ? `${patient.relacion_peso.lowestWeightSince18Kg} kg` : null);
  printField('Mayor peso alcanzado (+18)', patient.relacion_peso?.highestWeightSince18Kg ? `${patient.relacion_peso.highestWeightSince18Kg} kg` : null);

  // Weight trajectory milestones if present
  if (
    patient.relacion_peso?.weightTrajectoryMilestones &&
    patient.relacion_peso.weightTrajectoryMilestones.length > 0
  ) {
    printSubSectionTitle('Momentos clave de tu trayectoria de peso');

    const shiftTypeLabels: Record<string, string> = {
      subida: 'Subida notoria de peso',
      bajada: 'Bajada notoria de peso',
      rebote: 'Fluctuación / Efecto rebote',
      estabilidad: 'Etapa de estabilidad',
    };

    patient.relacion_peso.weightTrajectoryMilestones.forEach((m: WeightTrajectoryMilestone, idx: number) => {
      const shiftLabel = shiftTypeLabels[m.shiftType] || m.shiftType || 'Cambio registrado';
      const lines: string[] = [];
      lines.push(`• Etapa / Momento de vida: ${m.stageOrAge || 'No especificado'}`);
      lines.push(`• Tipo de cambio: ${shiftLabel}${m.approxWeightOrChange ? ` (${m.approxWeightOrChange})` : ''}`);
      if (m.triggers && m.triggers.length > 0) {
        lines.push(`• Factores o desencadenantes: ${m.triggers.join(', ')}`);
      }
      if (m.lifeContext && m.lifeContext.trim().length > 0) {
        lines.push(`• Contexto y vivencia descrita: ${m.lifeContext.trim()}`);
      }
      printField(`Hito ${idx + 1}: ${m.stageOrAge || 'Momento clave'}`, lines.join('\n'), true);
    });
  }

  // Previous attempts & diets
  printSubSectionTitle('Intentos previos y patrones de fluctuación');
  printField('¿Ha intentado perder peso previamente?', patient.relacion_peso?.hasPreviousAttempts || (patient.relacion_peso?.fluctuationCount ? 'Sí' : null));
  printField('Número de fluctuaciones en el peso', patient.relacion_peso?.fluctuationCount);
  printField('Velocidad de recuperación de peso', patient.relacion_peso?.regainSpeed);
  printField('Métodos previos intentados', patient.relacion_peso?.previousMethods?.join(', '));
  printField('¿Incluía ejercicio en los intentos previos?', patient.relacion_peso?.includedExercise);
  printField(
    'Dietas muy restrictivas en el pasado',
    patient.relacion_peso?.restrictiveDiets === 'Sí'
      ? `Sí: ${patient.relacion_peso.restrictiveDietsDetails || 'Detallado en consulta'}`
      : patient.relacion_peso?.restrictiveDiets || null
  );

  // Medications for weight
  printSubSectionTitle('Fármacos para control de peso');
  if (patient.relacion_peso?.usedWeightMedications === 'Sí') {
    printField('¿Ha usado medicamentos para el peso?', 'Sí');
    printField('Nombres de fármacos utilizados', patient.relacion_peso.weightMedicationsNames);
    printField('Experiencia con dichos fármacos', patient.relacion_peso.weightMedicationsExperience, true);
    printField('Efectos adversos o intolerancias', patient.relacion_peso.weightMedicationsAdverseEffects, true);
  } else {
    printField('¿Ha usado medicamentos para el peso?', 'No');
  }

  // Surgeries
  printSubSectionTitle('Antecedentes quirúrgicos de peso o contorno');
  printField(
    'Cirugía bariátrica previa',
    patient.relacion_peso?.hadBariatricSurgery === 'Sí'
      ? `Sí (${patient.relacion_peso.bariatricSurgeryTimeAgo || 'Hace algún tiempo'})`
      : 'No'
  );
  printField(
    'Cirugías estéticas o de contorno',
    patient.relacion_peso?.hadAestheticSurgery === 'Sí'
      ? `Sí (${patient.relacion_peso.aestheticSurgeryDetails || 'Detallado'}${patient.relacion_peso.aestheticSurgeryTimeAgo ? ` - ${patient.relacion_peso.aestheticSurgeryTimeAgo}` : ''})`
      : 'No'
  );

  // ==========================================
  // 4. MAPA DE SALUD Y ANTECEDENTES
  // ==========================================
  printSectionTitle('4. MAPA DE SALUD Y ANTECEDENTES');
  printField('Antecedentes patológicos (diagnósticos)', patient.mapa_salud?.pathologicalHistory || 'Niega');
  printField('Antecedentes farmacológicos (medicamentos habituales)', patient.mapa_salud?.pharmacologicalHistory || 'Niega');
  printField('Antecedentes quirúrgicos', patient.mapa_salud?.surgicalHistory || 'Niega');
  printField('Antecedentes hospitalarios', patient.mapa_salud?.hospitalHistory || 'Niega');
  printField('Antecedentes tóxico-alérgicos (alergias / hábitos)', patient.mapa_salud?.toxicAllergicHistory || 'Niega');

  // Gineco-obstetric
  if (patient.mapa_salud?.appliesGynecoObstetric === 'Sí') {
    printSubSectionTitle('Antecedentes gineco-obstétricos');
    printField(
      'Fórmula obstétrica',
      `G:${patient.mapa_salud.pregnanciesCount || 0}  |  Partos (P): ${patient.mapa_salud.vaginalDeliveriesCount || 0}  |  Cesáreas (C): ${patient.mapa_salud.cesareanCount || 0}  |  Pérdidas (A): ${patient.mapa_salud.lossesCount || 0}`
    );
    printField('Edad de menarquía', patient.mapa_salud.menarcheAge ? `${patient.mapa_salud.menarcheAge} años` : null);
    printField('Regularidad de ciclos menstruales', patient.mapa_salud.cycleRegularity);
    printField('Duración de ciclos', patient.mapa_salud.cycleDuration);
    printField('Etapa de menopausia / transición', patient.mapa_salud.menopauseStage);
    if (patient.mapa_salud.menopauseSymptoms && patient.mapa_salud.menopauseSymptoms.length > 0) {
      printField('Síntomas asociados a transición hormonal', patient.mapa_salud.menopauseSymptoms.join(', '));
    }
    if (patient.mapa_salud.menopauseSymptomsOther) {
      printField('Otros síntomas hormonales', patient.mapa_salud.menopauseSymptomsOther);
    }
  }

  // Eating disorders history
  if (patient.mapa_salud?.hasEatingDisorderHistory) {
    printField(
      'Historia de Trastornos de Conducta Alimentaria (TCA)',
      patient.mapa_salud.hasEatingDisorderHistory === 'Sí'
        ? `Sí: ${patient.mapa_salud.eatingDisorderDetails || 'Detallado en consulta'}`
        : 'No'
    );
  }

  // Family history
  printSubSectionTitle('Antecedentes familiares');
  printField(
    'Condiciones en familiares de primer grado',
    patient.mapa_salud?.familyHistory?.length ? patient.mapa_salud.familyHistory.join(', ') : 'No reporta antecedentes de importancia'
  );
  printField('Notas y especificaciones familiares', patient.mapa_salud?.familyHistoryNotes, true);

  // ==========================================
  // 5. REVISIÓN POR SISTEMAS Y SÍNTOMAS
  // ==========================================
  printSectionTitle('5. REVISIÓN POR SISTEMAS Y SÍNTOMAS');

  // 1. General
  printField(
    '1. General (Energía y termorregulación)',
    patient.revision_sistemas?.general?.selectedChips?.length
      ? patient.revision_sistemas.general.selectedChips.join(', ')
      : patient.revision_sistemas?.general?.hasNoSymptoms
      ? 'Sin síntomas reportados'
      : 'No reporta'
  );

  // 2. Cardiovascular
  printField(
    '2. Cardiovascular y circulatorio',
    patient.revision_sistemas?.cardiovascular?.selectedChips?.length
      ? patient.revision_sistemas.cardiovascular.selectedChips.join(', ')
      : patient.revision_sistemas?.cardiovascular?.hasNoSymptoms
      ? 'Sin síntomas reportados'
      : 'No reporta'
  );

  // 3. Respiratorio
  printField(
    '3. Respiratorio y calidad de descanso',
    patient.revision_sistemas?.respiratory?.selectedChips?.length
      ? patient.revision_sistemas.respiratory.selectedChips.join(', ')
      : patient.revision_sistemas?.respiratory?.hasNoSymptoms
      ? 'Sin síntomas reportados'
      : 'No reporta'
  );

  // 4. Digestivo
  printField(
    '4. Digestivo y gastrointestinal',
    patient.revision_sistemas?.digestive?.selectedChips?.length
      ? patient.revision_sistemas.digestive.selectedChips.join(', ')
      : patient.revision_sistemas?.digestive?.hasNoSymptoms
      ? 'Sin síntomas digestivos'
      : 'No reporta'
  );

  if (patient.revision_sistemas?.digestiveHabits) {
    const dh = patient.revision_sistemas.digestiveHabits;
    printSubSectionTitle('Hábito intestinal y deposiciones');
    printField('Consistencia de heces', dh.stoolConsistency);
    printField('Frecuencia de deposiciones', dh.dailyBowelMovementCount);
    printField('Dificultad o esfuerzo para evacuar', dh.hasDifficultyDefecating);
    printField(
      'Uso de laxantes',
      dh.takesLaxatives && dh.takesLaxatives !== 'No'
        ? `${dh.takesLaxatives}${dh.laxativeDetails ? ` (${dh.laxativeDetails})` : ''}`
        : 'No usa laxantes'
    );
  }

  // 5. Piel, cabello y hormonas
  printField(
    '5. Piel, cabello, acantosis y fuerza',
    patient.revision_sistemas?.skinHairHormones?.selectedChips?.length
      ? patient.revision_sistemas.skinHairHormones.selectedChips.join(', ')
      : patient.revision_sistemas?.skinHairHormones?.hasNoSymptoms
      ? 'Sin síntomas cutáneos u hormonales'
      : 'No reporta'
  );

  // 6. Músculos y articulaciones
  printField(
    '6. Músculos y articulaciones',
    patient.revision_sistemas?.musclesJoints?.selectedChips?.length
      ? patient.revision_sistemas.musclesJoints.selectedChips.join(', ')
      : patient.revision_sistemas?.musclesJoints?.hasNoSymptoms
      ? 'Sin dolores articulares o musculares'
      : 'No reporta'
  );

  // 7. Ánimo, estrés y sueño
  printField(
    '7. Ánimo, ansiedad y cefaleas',
    patient.revision_sistemas?.moodSleepMind?.selectedChips?.length
      ? patient.revision_sistemas.moodSleepMind.selectedChips.join(', ')
      : patient.revision_sistemas?.moodSleepMind?.hasNoSymptoms
      ? 'Sin alteraciones de ánimo o sueño'
      : 'No reporta'
  );

  if (patient.revision_sistemas?.moodSleepHabits) {
    const msh = patient.revision_sistemas.moodSleepHabits;
    printSubSectionTitle('Estrés, horarios de descanso y rutina diaria');
    printField('Nivel de estrés percibido', msh.stressLevel !== undefined ? `${msh.stressLevel} / 10` : null);
    printField(
      'Horas de sueño y horario de descanso',
      msh.calculatedSleepHours
        ? `${msh.calculatedSleepHours} horas de sueño habituales (Horario: ${msh.bedtime || '—'} a ${msh.wakeTime || '—'})`
        : null
    );
    printNarrativeCard('Descripción de un día cotidiano habitual', msh.dailyRoutineDescription);
  }

  if (patient.revision_sistemas?.additionalNotes) {
    printField('Notas o síntomas adicionales', patient.revision_sistemas.additionalNotes, true);
  }

  // ==========================================
  // 6. ENTREVISTA DIETÉTICA Y ALIMENTACIÓN
  // ==========================================
  printSectionTitle('6. ENTREVISTA DIETÉTICA Y ALIMENTACIÓN');
  printField('Alimentos preferidos o favoritos', patient.entrevista_dietetica?.favoriteFoods, true);
  printField('Alimentos que no tolera o le disgustan', patient.entrevista_dietetica?.dislikedFoods, true);
  printField(
    'Restricciones o alergias alimentarias',
    patient.entrevista_dietetica?.dietaryRestrictions?.length
      ? `${patient.entrevista_dietetica.dietaryRestrictions.join(', ')}${patient.entrevista_dietetica.dietaryRestrictionsOther ? ` (${patient.entrevista_dietetica.dietaryRestrictionsOther})` : ''}${patient.entrevista_dietetica.dietaryAllergiesDetails ? ` — ${patient.entrevista_dietetica.dietaryAllergiesDetails}` : ''}`
      : 'Ninguna'
  );

  // Daily Meals Timeline
  if (
    patient.entrevista_dietetica?.dailyMealsTimeline &&
    patient.entrevista_dietetica.dailyMealsTimeline.length > 0
  ) {
    const validMeals = patient.entrevista_dietetica.dailyMealsTimeline.filter(
      (m: MealMomentEntry) =>
        (m.foodAndDrinks && m.foodAndDrinks.trim().length > 0) ||
        (m.time && m.time.trim().length > 0) ||
        (m.location && m.location.trim().length > 0)
    );

    if (validMeals.length > 0) {
      printSubSectionTitle('Línea de tiempo de comidas diarias habituales');
      validMeals.forEach((meal: MealMomentEntry, idx: number) => {
        const mealTitle = meal.name?.trim() || `Comida ${idx + 1}`;
        const horarioStr = meal.time ? `Horario: ${meal.time}` : 'Horario: No especificado';
        const lugarStr = meal.location ? `Lugar: ${meal.location}` : 'Lugar: En casa';
        const foodsStr = meal.foodAndDrinks?.trim() || 'Sin alimentos específicos descritos';
        const mealSummary = `${horarioStr}  |  ${lugarStr}\nAlimentos y bebidas habituales: ${foodsStr}`;
        printField(mealTitle, mealSummary, true);
      });
    }
  }

  printField('Preparación y logística de comidas', patient.entrevista_dietetica?.mealPreparationStyle);
  printField('Frecuencia de comer fuera / domicilios', patient.entrevista_dietetica?.eatingOutFrequency);
  printField(
    'Puntos débiles percibidos en la alimentación',
    patient.entrevista_dietetica?.nutritionWeakSpots?.length
      ? `${patient.entrevista_dietetica.nutritionWeakSpots.join(', ')}${patient.entrevista_dietetica.nutritionWeakSpotsOther ? ` (${patient.entrevista_dietetica.nutritionWeakSpotsOther})` : ''}`
      : 'No identifica puntos débiles'
  );
  if (patient.entrevista_dietetica?.nutritionWeakSpotsNotes) {
    printField('Notas sobre dificultades nutricionales', patient.entrevista_dietetica.nutritionWeakSpotsNotes, true);
  }
  printField(
    'Suplementación nutricional actual',
    patient.entrevista_dietetica?.takesSupplements === 'Sí'
      ? `Sí: ${patient.entrevista_dietetica.supplementDetails || 'Detallado en consulta'}`
      : 'No toma suplementos'
  );

  // ==========================================
  // 7. ACTIVIDAD FÍSICA Y MOVIMIENTO
  // ==========================================
  printSectionTitle('7. ACTIVIDAD FÍSICA Y MOVIMIENTO');
  printField('Actividad cotidiana y ocupacional', patient.actividad_fisica?.dailyActivityType);
  printField('Uso de escaleras', patient.actividad_fisica?.takesStairsFrequency);
  printField('Caminata como medio de transporte', patient.actividad_fisica?.walksForTransport);
  printField(
    'Medición de pasos diarios',
    patient.actividad_fisica?.hasStepTrackerDevice
      ? `${patient.actividad_fisica.hasStepTrackerDevice}${patient.actividad_fisica.dailyStepsApprox ? ` (${patient.actividad_fisica.dailyStepsApprox} pasos aprox.)` : ''}`
      : null
  );
  printField('Horas al día sentada', patient.actividad_fisica?.dailySittingHours);

  printSubSectionTitle('Ejercicio físico estructurado');
  printField(
    '¿Realiza ejercicio estructurado actualmente?',
    patient.actividad_fisica?.doesStructuredExercise === 'Sí' ? 'Sí' : 'No'
  );
  if (patient.actividad_fisica?.doesStructuredExercise === 'Sí') {
    printField(
      'Tipos de ejercicio',
      patient.actividad_fisica.exerciseTypes?.length
        ? `${patient.actividad_fisica.exerciseTypes.join(', ')}${patient.actividad_fisica.exerciseTypesOther ? ` (${patient.actividad_fisica.exerciseTypesOther})` : ''}`
        : null
    );
    printField('Frecuencia semanal', patient.actividad_fisica.exerciseWeeklyFrequency);
    printField('Duración promedio por sesión', patient.actividad_fisica.exerciseSessionDuration);
    printField('Intensidad percibida', patient.actividad_fisica.exerciseIntensity);
  }

  printSubSectionTitle('Motivación y barreras');
  printField(
    'Nivel de motivación para ejercicio estructurado',
    patient.actividad_fisica?.motivationStructuredExercise !== undefined
      ? `${patient.actividad_fisica.motivationStructuredExercise} / 5`
      : null
  );
  printField(
    'Nivel de motivación para movimiento diario',
    patient.actividad_fisica?.motivationDailyMovement !== undefined
      ? `${patient.actividad_fisica.motivationDailyMovement} / 5`
      : null
  );
  printField('Barreras o temores frente al movimiento', patient.actividad_fisica?.movementBarriersOrConcerns, true);

  /**
   * Helper to render attached files (InBody / Labs) with PROPORTIONAL aspect ratio
   */
  const renderAttachments = (
    files: UploadedLabFile[] | undefined,
    categoryTitle: string
  ) => {
    if (!files || files.length === 0) return;

    for (const f of files) {
      const dataUrl = f.dataUrl || getFileDataUrl(f.id, f.name);
      const isImg =
        dataUrl &&
        (f.type?.startsWith('image/') ||
          dataUrl.startsWith('data:image/') ||
          /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name || ''));

      if (isImg && dataUrl) {
        try {
          // Get natural image dimensions using jsPDF image decoder
          const imgProps = doc.getImageProperties(dataUrl);
          const naturalWidth = imgProps.width || 800;
          const naturalHeight = imgProps.height || 600;
          const aspect = naturalWidth / naturalHeight;

          // Maximum bounding box inside the page margin
          const maxAllowedW = contentWidth - 16;
          const maxAllowedH = 380; // comfortable height avoiding page overflow

          let renderW = maxAllowedW;
          let renderH = maxAllowedW / aspect;

          if (renderH > maxAllowedH) {
            renderH = maxAllowedH;
            renderW = maxAllowedH * aspect;
          }

          // Center the image nicely in the available width
          const renderX = margin + 8 + (maxAllowedW - renderW) / 2;

          checkPageBreak(renderH + 34);

          // Card header for the attached image
          doc.setFillColor(250, 246, 240);
          doc.roundedRect(margin + 4, y, contentWidth - 8, 18, 2, 2, 'F');
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(91, 136, 126); // #5B887E
          doc.text(`Documento adjunto: ${f.name || 'Reporte'} (Imagen)`, margin + 12, y + 12);
          y += 24;

          const imgFormat =
            f.type?.includes('png') || dataUrl.includes('image/png') ? 'PNG' : 'JPEG';

          // Render high-res image with exact proportional aspect ratio
          doc.addImage(
            dataUrl,
            imgFormat,
            renderX,
            y,
            renderW,
            renderH,
            undefined,
            'FAST'
          );

          // Subtle frame around image
          doc.setDrawColor(217, 211, 200);
          doc.setLineWidth(0.5);
          doc.roundedRect(renderX - 1, y - 1, renderW + 2, renderH + 2, 2, 2, 'S');

          y += renderH + 14;
        } catch (imgError) {
          console.warn('[PDF Generator] Could not render image binary, fallback to label:', imgError);
          checkPageBreak(26);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(92, 110, 104);
          doc.text(`[Imagen adjunta: ${f.name || 'Archivo'}]`, margin + 12, y + 10);
          y += 18;
        }
      } else {
        // PDF or remote document representation card
        checkPageBreak(36);
        const cardH = f.description ? 34 : 26;
        doc.setFillColor(250, 246, 240);
        doc.roundedRect(margin + 6, y, contentWidth - 12, cardH, 3, 3, 'F');
        doc.setDrawColor(217, 211, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 6, y, contentWidth - 12, cardH, 3, 3, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(91, 136, 126);
        doc.text(`• Documento PDF adjunto: ${f.name || 'Archivo'}`, margin + 14, y + 12);

        const targetUrl =
          f.downloadUrl ||
          patient.driveWebViewLink ||
          (dataUrl?.startsWith('http') ? dataUrl : null) ||
          null;

        if (targetUrl) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(52, 106, 96);
          doc.textWithLink('→ Ver documento completo en Google Drive / Nube', margin + 14, y + (f.description ? 22 : 20), {
            url: targetUrl,
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(92, 110, 104);
          doc.text('Documento PDF registrado y respaldado en el expediente clínico', margin + 14, y + (f.description ? 22 : 20));
        }

        if (f.description) {
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(7.5);
          doc.setTextColor(110, 125, 120);
          doc.text(`Nota: ${f.description}`, margin + 14, y + 30);
        }

        y += cardH + 6;
      }
    }
  };

  // ==========================================
  // 8. REPORTE INBODY / COMPOSICIÓN CORPORAL
  // ==========================================
  if (patient.inbody) {
    printSectionTitle('8. REPORTE INBODY / COMPOSICIÓN CORPORAL');
    printField('¿Cuenta con reporte InBody o examen de bioimpedancia?', patient.inbody.hasInBodyReport || 'No');
    printField('Fecha del examen y/o Centro médico', patient.inbody.testDateOrCenter);
    printField('Métricas conocidas por la paciente', patient.inbody.knownMetrics, true);

    // If intelligent extraction exists, render full structured metrics table
    if (patient.inbody.extractedMetrics) {
      const m = patient.inbody.extractedMetrics;
      printSubSectionTitle('Métricas analizadas del reporte InBody');
      printField('Peso reportado', m.pesoKg ? `${m.pesoKg} kg` : null);
      printField('Talla reportada', m.tallaCm ? `${m.tallaCm} cm` : null);
      printField('Porcentaje de Grasa Corporal (%GC)', m.porcentajeGrasaCorporal !== undefined && m.porcentajeGrasaCorporal !== null ? `${m.porcentajeGrasaCorporal}%` : null);
      printField('Masa Grasa Corporal', m.masaGrasaCorporalKg ? `${m.masaGrasaCorporalKg} kg` : null);
      printField('Masa Muscular Esquelética (MME)', m.masaMuscularEsqueleticaKg ? `${m.masaMuscularEsqueleticaKg} kg` : null);
      printField('Masa Libre de Grasa', m.masaLibreDeGrasaKg ? `${m.masaLibreDeGrasaKg} kg` : null);
      printField('Nivel de Grasa Visceral', m.nivelGrasaVisceral !== undefined && m.nivelGrasaVisceral !== null ? `Nivel ${m.nivelGrasaVisceral}` : null);
      printField('Agua Corporal Total', m.aguaCorporalTotalLt ? `${m.aguaCorporalTotalLt} L` : null);
      printField('Tasa Metabólica Basal (TMB)', m.tasaMetabolicaBasalKcal ? `${m.tasaMetabolicaBasalKcal} kcal` : null);
      printField('Índice de Masa Corporal (IMC)', m.imc ? `${m.imc} kg/m²` : null);
      printField('Relación Cintura-Cadera', m.relacionCinturaCadera !== undefined && m.relacionCinturaCadera !== null ? String(m.relacionCinturaCadera) : null);
      printField('Puntuación InBody', m.puntuacionInBody !== undefined && m.puntuacionInBody !== null ? `${m.puntuacionInBody} / 100` : null);
      printField('Modelo de equipo', m.modeloEquipo);
      printField('Observaciones clínicas del análisis', m.observacionesClinicas, true);
    }

    printField('Inquietudes adicionales sobre composición corporal', patient.inbody.notesOrGoals, true);

    // Render InBody attached files with true natural aspect ratio
    renderAttachments(patient.inbody.files, 'InBody');
  }

  // ==========================================
  // 9. EXÁMENES DE LABORATORIO / PARACLÍNICOS RECIENTES
  // ==========================================
  if (patient.paraclinicos) {
    printSectionTitle('9. EXÁMENES DE LABORATORIO / PARACLÍNICOS RECIENTES');
    printField('¿Cuenta con exámenes de laboratorio recientes?', patient.paraclinicos.hasRecentLabs || 'No');
    printField('Observaciones o hallazgos conocidos de los laboratorios', patient.paraclinicos.notesOrFindings, true);

    // Render Paraclínicos attached files
    renderAttachments(patient.paraclinicos.files, 'Paraclínicos');
  }

  // ==========================================
  // 10. BANDERAS ROJAS / PUNTOS CLÍNICOS A PROFUNDIZAR
  // ==========================================
  if (patient.banderas_revisar && patient.banderas_revisar.length > 0) {
    checkPageBreak(40);
    // Pale Coral Background #FDEEE9
    doc.setFillColor(253, 238, 233);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
    doc.setDrawColor(241, 185, 168);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'S');

    doc.setTextColor(198, 106, 77); // Coral #C66A4D
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `PUNTOS CLÍNICOS A PROFUNDIZAR EN CONSULTA (${patient.banderas_revisar.length})`,
      margin + 10,
      y + 13.5
    );
    y += 28;

    patient.banderas_revisar.forEach((f) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      const sympLines = doc.splitTextToSize(`• [${f.category}] ${f.symptom}`, contentWidth - 16);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      const noteLines = doc.splitTextToSize(f.clinicalNote, contentWidth - 28);

      const totalItemHeight = sympLines.length * 11 + noteLines.length * 10 + 6;
      checkPageBreak(totalItemHeight);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(198, 106, 77);
      doc.text(sympLines, margin + 8, y + 9);
      y += sympLines.length * 11 + 2;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(92, 110, 104);
      doc.text(noteLines, margin + 18, y + 8);
      y += noteLines.length * 10 + 4;
    });
  }

  // ==========================================
  // Clean, consistent pagination footer on every page
  // ==========================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(142, 158, 153);
    doc.text(
      `Vela • Dra. Lorena Castro • Cuestionario Inicial • Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 16,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Generates the PDF as a Blob for uploading or sharing
 */
export async function generatePatientQuestionnairePdfBlob(
  patient: FirestoreQuestionnaireDocument
): Promise<Blob> {
  console.log('[PDF Generator] Generando Blob de PDF para paciente:', patient.patientName);
  try {
    const doc = generatePatientQuestionnairePdfDoc(patient);
    const blob = doc.output('blob');
    console.log('[PDF Generator] Blob de PDF generado exitosamente. Tamaño:', blob.size, 'bytes');
    return blob;
  } catch (error) {
    console.error('[PDF Generator Error] Falló la generación del PDF Blob:', error);
    throw error;
  }
}

/**
 * Downloads the complete medical record PDF directly in the browser
 */
export async function downloadPatientRecordPdf(
  patient: FirestoreQuestionnaireDocument,
  customFileNameOrRef?: any
): Promise<void> {
  const patientName = patient.patientName || 'Paciente';
  const customFileName =
    typeof customFileNameOrRef === 'string'
      ? customFileNameOrRef
      : `Cuestionario_Inicial_Vela_${patientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${patient.patientDocument || 'doc'}.pdf`;

  console.log('[PDF Generator] Disparando descarga directa de PDF:', customFileName);
  const doc = generatePatientQuestionnairePdfDoc(patient);
  try {
    doc.save(customFileName);
    console.log('[PDF Generator] Descarga iniciada con éxito en el navegador.');
  } catch (error) {
    console.error('[PDF Generator Error] Error al ejecutar doc.save():', error);
    // Fallback: create blob url and click <a> element
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = customFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      console.log('[PDF Generator] Descarga fallback completada vía ObjectURL.');
    } catch (fallbackError) {
      console.error('[PDF Generator Error] Falló también el fallback de descarga:', fallbackError);
      throw fallbackError;
    }
  }
}
