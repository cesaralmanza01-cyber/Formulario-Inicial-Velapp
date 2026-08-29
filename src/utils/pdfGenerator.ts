import jsPDF from 'jspdf';
import { FirestoreQuestionnaireDocument, UploadedLabFile } from '../types';

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
 * Creates and formats a jsPDF document containing the complete patient initial history
 */
export function generatePatientQuestionnairePdfDoc(
  patient: FirestoreQuestionnaireDocument
): jsPDF {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = 36;

  // Helper to ensure sufficient space or trigger page break
  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 40) {
      doc.addPage();
      y = 36;
    }
  };

  // 1. Header Banner (Vela Deep Sage #6E9E93 -> RGB: 110, 158, 147)
  doc.setFillColor(110, 158, 147);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 64, 4, 4, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('VELA • CUESTIONARIO MÉDICO INICIAL', margin + 16, y + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.text(
    'Manejo Médico e Integral del Sobrepeso y la Obesidad • Dra. Lorena Castro',
    margin + 16,
    y + 44
  );

  y += 76;

  // 2. Patient Identity Card (Vela Cream #FAF6F0 -> RGB: 250, 246, 240)
  doc.setFillColor(250, 246, 240);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 58, 4, 4, 'F');
  doc.setDrawColor(217, 211, 200); // #D9D3C8
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 58, 4, 4, 'S');

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
    y + 33
  );

  const docDate = patient.completedAt || patient.savedAt || patient.updatedAt || patient.startedAt;
  doc.text(
    `Fecha de registro: ${formatDate(docDate)}  •  Estado civil: ${patient.identificacion?.civilStatus || 'No indicado'}  •  Cómo nos conoció: ${patient.identificacion?.referralSource || 'Vela'}`,
    margin + 14,
    y + 47
  );

  y += 70;

  // Section header helper
  const printSectionTitle = (title: string) => {
    checkPageBreak(32);
    // Background bar in pale salvia #EBF3F0 (RGB: 235, 243, 240)
    doc.setFillColor(235, 243, 240);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');

    doc.setTextColor(110, 158, 147); // #6E9E93
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(title, margin + 8, y + 12);
    y += 24;
  };

  // Row printing helper
  const printRow = (label: string, value?: string | null | number) => {
    if (value === undefined || value === null || value === '') return;
    const strVal = String(value);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(92, 110, 104); // #5C6E68

    const labelWidth = 125;
    const valWidth = pageWidth - margin * 2 - labelWidth - 10;
    const lines = doc.splitTextToSize(strVal, valWidth);
    const rowHeight = Math.max(13, lines.length * 10.5 + 3);

    checkPageBreak(rowHeight);

    doc.text(`${label}:`, margin + 8, y + 9);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(46, 58, 54); // #2E3A36
    doc.text(lines, margin + labelWidth + 8, y + 9);

    y += rowHeight;
  };

  // 1. Identificación
  printSectionTitle('1. IDENTIFICACIÓN Y DATOS PERSONALES');
  printRow('Nombre completo', patient.identificacion?.fullName || patient.patientName);
  printRow(
    'Documento de identidad',
    patient.identificacion?.documentNumber
      ? `${patient.identificacion?.documentType || 'CC'} ${patient.identificacion.documentNumber}`
      : null
  );
  printRow('Fecha de nacimiento', patient.identificacion?.birthDate);
  printRow('Edad', patient.identificacion?.age ? `${patient.identificacion.age} años` : null);
  printRow('Ocupación y Profesión', patient.identificacion?.occupation);
  printRow('Estado civil', patient.identificacion?.civilStatus);
  printRow(
    'Medio por el cual conoció a Vela',
    patient.identificacion?.referralSource
      ? `${patient.identificacion.referralSource} ${patient.identificacion.referralOtherDetails ? `(${patient.identificacion.referralOtherDetails})` : ''}`
      : null
  );

  // 2. Motivo y Objetivos
  printSectionTitle('2. MOTIVO DE CONSULTA Y OBJETIVOS');
  printRow('Motivo principal', patient.motivo_objetivos?.consultationReason);
  printRow('Metas y expectativas', patient.motivo_objetivos?.expectedGoals);
  printRow('Visión a 6 meses', patient.motivo_objetivos?.futureVision);
  printRow('Obstáculos percibidos', patient.motivo_objetivos?.currentObstacles);

  // 3. Relación con el peso
  printSectionTitle('3. HISTORIAL Y RELACIÓN CON EL PESO');
  printRow('Peso actual', patient.relacion_peso?.currentWeightKg ? `${patient.relacion_peso.currentWeightKg} kg` : null);
  printRow('Estatura / Talla', patient.relacion_peso?.heightCm ? `${patient.relacion_peso.heightCm} cm` : null);
  printRow('Menor peso (+18)', patient.relacion_peso?.lowestWeightSince18Kg ? `${patient.relacion_peso.lowestWeightSince18Kg} kg` : null);
  printRow('Mayor peso (+18)', patient.relacion_peso?.highestWeightSince18Kg ? `${patient.relacion_peso.highestWeightSince18Kg} kg` : null);
  printRow('Fluctuaciones de peso', patient.relacion_peso?.fluctuationCount);
  printRow('Velocidad recuperación', patient.relacion_peso?.regainSpeed);
  printRow('Métodos previos intentados', patient.relacion_peso?.previousMethods?.join(', '));
  printRow(
    'Fármacos para control de peso',
    patient.relacion_peso?.usedWeightMedications === 'Sí'
      ? `Sí: ${patient.relacion_peso.weightMedicationsNames || 'Detallado en consulta'}`
      : 'No reporta'
  );
  printRow(
    'Cirugía bariátrica previa',
    patient.relacion_peso?.hadBariatricSurgery === 'Sí'
      ? `Sí (${patient.relacion_peso.bariatricSurgeryTimeAgo || 'Hace algún tiempo'})`
      : 'No'
  );
  printRow(
    'Cirugías estéticas',
    patient.relacion_peso?.hadAestheticSurgery === 'Sí'
      ? `Sí (${patient.relacion_peso.aestheticSurgeryDetails || 'Detalle en historia'})`
      : 'No'
  );

  // 4. Mapa de Salud
  printSectionTitle('4. MAPA DE SALUD Y ANTECEDENTES');
  printRow('Antecedentes patológicos', patient.mapa_salud?.pathologicalHistory || 'Niega');
  printRow('Antecedentes farmacológicos', patient.mapa_salud?.pharmacologicalHistory || 'Niega');
  printRow('Antecedentes quirúrgicos', patient.mapa_salud?.surgicalHistory || 'Niega');
  printRow('Antecedentes hospitalarios', patient.mapa_salud?.hospitalHistory || 'Niega');
  printRow('Antecedentes tóxico-alérgicos', patient.mapa_salud?.toxicAllergicHistory || 'Niega');
  if (patient.mapa_salud?.appliesGynecoObstetric === 'Sí') {
    printRow(
      'Gineco-obstétricos',
      `G:${patient.mapa_salud.pregnanciesCount || 0} P:${patient.mapa_salud.vaginalDeliveriesCount || 0} C:${patient.mapa_salud.cesareanCount || 0} A:${patient.mapa_salud.lossesCount || 0}  |  Menarquía: ${patient.mapa_salud.menarcheAge || '—'} años  |  Ciclos: ${patient.mapa_salud.cycleRegularity || '—'}  |  Menopausia: ${patient.mapa_salud.menopauseStage || 'No'}`
    );
  }
  printRow('Antecedentes familiares', patient.mapa_salud?.familyHistory?.join(', '));
  printRow('Notas antecedentes familiares', patient.mapa_salud?.familyHistoryNotes);

  // 5. Revisión por Sistemas
  printSectionTitle('5. REVISIÓN POR SISTEMAS Y SÍNTOMAS');
  printRow(
    'Patrón de energía general',
    patient.revision_sistemas?.general?.selectedChips?.join(', ') ||
      (patient.revision_sistemas?.general?.hasNoSymptoms ? 'Sin síntomas generales reportados' : null)
  );
  printRow('Síntomas digestivos', patient.revision_sistemas?.digestive?.selectedChips?.join(', '));
  if (patient.revision_sistemas?.digestiveHabits) {
    printRow(
      'Hábito intestinal',
      `Consistencia: ${patient.revision_sistemas.digestiveHabits.stoolConsistency || '—'}  |  Frecuencia diaria: ${patient.revision_sistemas.digestiveHabits.dailyBowelMovementCount || '—'}  |  Dificultad: ${patient.revision_sistemas.digestiveHabits.hasDifficultyDefecating || 'No'}`
    );
  }
  if (patient.revision_sistemas?.moodSleepHabits) {
    printRow(
      'Estrés y descanso',
      `Nivel de estrés: ${patient.revision_sistemas.moodSleepHabits.stressLevel ?? '—'}/10  |  Horas sueño: ${patient.revision_sistemas.moodSleepHabits.calculatedSleepHours ?? '—'}h (${patient.revision_sistemas.moodSleepHabits.bedtime || ''} a ${patient.revision_sistemas.moodSleepHabits.wakeTime || ''})`
    );
    printRow('Rutina diaria cotidiana', patient.revision_sistemas.moodSleepHabits.dailyRoutineDescription);
  }

  // 6. Entrevista Dietética
  printSectionTitle('6. ENTREVISTA DIETÉTICA Y ALIMENTACIÓN');
  printRow('Alimentos preferidos', patient.entrevista_dietetica?.favoriteFoods);
  printRow('Alimentos que no tolera / disgustan', patient.entrevista_dietetica?.dislikedFoods);
  printRow('Restricciones o alergias alimentarias', patient.entrevista_dietetica?.dietaryRestrictions?.join(', '));
  printRow('Preparación y logística comidas', patient.entrevista_dietetica?.mealPreparationStyle);
  printRow('Frecuencia comer fuera / domicilios', patient.entrevista_dietetica?.eatingOutFrequency);
  printRow('Puntos débiles percibidos', patient.entrevista_dietetica?.nutritionWeakSpots?.join(', '));
  printRow(
    'Suplementación actual',
    patient.entrevista_dietetica?.takesSupplements === 'Sí'
      ? patient.entrevista_dietetica.supplementDetails
      : 'No toma suplementos'
  );

  // 7. Actividad Física
  printSectionTitle('7. ACTIVIDAD FÍSICA Y MOVIMIENTO');
  printRow('Actividad cotidiana', patient.actividad_fisica?.dailyActivityType);
  printRow(
    'Hábitos de movilidad',
    `Uso escaleras: ${patient.actividad_fisica?.takesStairsFrequency || '—'}  |  Caminata transporte: ${patient.actividad_fisica?.walksForTransport || '—'}`
  );
  printRow('Horas sentada al día', patient.actividad_fisica?.dailySittingHours ? `${patient.actividad_fisica.dailySittingHours} horas` : null);
  printRow(
    'Ejercicio estructurado',
    patient.actividad_fisica?.doesStructuredExercise === 'Sí'
      ? `${patient.actividad_fisica.exerciseTypes?.join(', ') || 'Sí'} (${patient.actividad_fisica.exerciseWeeklyFrequency || ''}, ${patient.actividad_fisica.exerciseSessionDuration || ''})`
      : 'No realiza ejercicio estructurado actualmente'
  );
  printRow(
    'Nivel de motivación',
    `Ejercicio: ${patient.actividad_fisica?.motivationStructuredExercise || '-'}/5  |  Movimiento diario: ${patient.actividad_fisica?.motivationDailyMovement || '-'}/5`
  );
  printRow('Barreras u obstáculos para el movimiento', patient.actividad_fisica?.movementBarriersOrConcerns);

  // Helper to render attached files (InBody / Labs) with image embedding or links
  const renderAttachments = (
    files: UploadedLabFile[] | undefined,
    categoryTitle: string
  ) => {
    if (!files || files.length === 0) return;

    for (const f of files) {
      // Check if it's an image that can be rendered
      const isImg =
        f.dataUrl &&
        (f.type?.startsWith('image/') ||
          f.dataUrl.startsWith('data:image/jpeg') ||
          f.dataUrl.startsWith('data:image/png'));

      if (isImg && f.dataUrl) {
        checkPageBreak(180);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(110, 158, 147); // #6E9E93
        doc.text(`Adjunto imagen: ${f.name || 'Archivo'}`, margin + 8, y + 10);
        y += 14;

        try {
          const imgFormat = f.type?.includes('png') || f.dataUrl.includes('image/png') ? 'PNG' : 'JPEG';
          const maxW = pageWidth - margin * 2 - 16;
          const maxH = 150;
          doc.addImage(f.dataUrl, imgFormat, margin + 8, y, maxW, maxH, undefined, 'FAST');
          y += maxH + 12;
        } catch (e) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(92, 110, 104);
          doc.text(`[Imagen adjunta: ${f.name}]`, margin + 8, y);
          y += 14;
        }
      } else {
        // PDF or remote file note
        checkPageBreak(24);
        doc.setFillColor(250, 246, 240);
        doc.roundedRect(margin + 8, y, pageWidth - margin * 2 - 16, 20, 3, 3, 'F');
        doc.setDrawColor(217, 211, 200);
        doc.roundedRect(margin + 8, y, pageWidth - margin * 2 - 16, 20, 3, 3, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(110, 158, 147);
        doc.text(`• Archivo adjunto: ${f.name || 'Documento'} (${f.type || 'PDF'})`, margin + 14, y + 13);

        if (f.downloadUrl) {
          doc.setTextColor(46, 58, 54);
          doc.setFont('helvetica', 'normal');
          doc.text(`(Disponible en la nube)`, margin + 260, y + 13);
        }
        y += 24;
      }
    }
  };

  // 8. InBody
  if (patient.inbody) {
    printSectionTitle('8. REPORTE INBODY / COMPOSICIÓN CORPORAL');
    printRow('¿Cuenta con reporte InBody?', patient.inbody.hasInBodyReport);
    printRow('Fecha de examen / Centro', patient.inbody.testDateOrCenter);
    printRow('Métricas conocidas por la paciente', patient.inbody.knownMetrics);

    if (patient.inbody.extractedMetrics) {
      const m = patient.inbody.extractedMetrics;
      printRow(
        'Métricas analizadas',
        `Peso: ${m.pesoKg ?? '-'} kg  |  Talla: ${m.tallaCm ?? '-'} cm  |  % Grasa: ${m.porcentajeGrasaCorporal ?? '-'}%  |  Masa Muscular: ${m.masaMuscularEsqueleticaKg ?? '-'} kg  |  Masa Grasa: ${m.masaGrasaCorporalKg ?? '-'} kg  |  Grasa Visceral: Nivel ${m.nivelGrasaVisceral ?? '-'}  |  TMB: ${m.tasaMetabolicaBasalKcal ?? '-'} kcal  |  IMC: ${m.imc ?? '-'} kg/m²`
      );
      printRow('Equipo / Modelo', m.modeloEquipo);
      printRow('Observaciones clínicas', m.observacionesClinicas);
    }
    printRow('Inquietudes adicionales sobre composición', patient.inbody.notesOrGoals);

    // Render InBody attached files
    renderAttachments(patient.inbody.files, 'InBody');
  }

  // 9. Paraclínicos
  if (patient.paraclinicos) {
    printSectionTitle('9. EXÁMENES DE LABORATORIO / PARACLÍNICOS RECIENTES');
    printRow('¿Cuenta con paraclínicos recientes?', patient.paraclinicos.hasRecentLabs);
    printRow('Observaciones o hallazgos conocidos', patient.paraclinicos.notesOrFindings);

    // Render Paraclínicos attached files
    renderAttachments(patient.paraclinicos.files, 'Paraclínicos');
  }

  // 10. Banderas Rojas / Puntos Clínicos (si aplica)
  if (patient.banderas_revisar && patient.banderas_revisar.length > 0) {
    checkPageBreak(40);
    doc.setFillColor(253, 238, 233); // Pale coral #FDEEE9
    doc.roundedRect(margin, y, pageWidth - margin * 2, 18, 3, 3, 'F');
    doc.setTextColor(198, 106, 77); // Coral #C66A4D
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `PUNTOS CLÍNICOS A PROFUNDIZAR EN CONSULTA (${patient.banderas_revisar.length})`,
      margin + 8,
      y + 12
    );
    y += 24;

    patient.banderas_revisar.forEach((f) => {
      checkPageBreak(24);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(198, 106, 77);
      doc.text(`• [${f.category}] ${f.symptom}`, margin + 8, y + 9);
      y += 12;

      doc.setFont('helvetica', 'italic');
      doc.setTextColor(92, 110, 104);
      const noteLines = doc.splitTextToSize(f.clinicalNote, pageWidth - margin * 2 - 20);
      checkPageBreak(noteLines.length * 10 + 4);
      doc.text(noteLines, margin + 18, y + 8);
      y += noteLines.length * 10 + 6;
    });
  }

  // Final Footer on every page
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
  customFileName?: string
): Promise<void> {
  const patientName = patient.patientName || 'Paciente';
  const cleanFileName =
    customFileName ||
    `Cuestionario_Inicial_Vela_${patientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${patient.patientDocument || 'doc'}.pdf`;

  console.log('[PDF Generator] Disparando descarga directa de PDF:', cleanFileName);
  const doc = generatePatientQuestionnairePdfDoc(patient);
  try {
    doc.save(cleanFileName);
    console.log('[PDF Generator] Descarga iniciada con éxito en el navegador.');
  } catch (error) {
    console.error('[PDF Generator Error] Error al ejecutar doc.save():', error);
    // Fallback: create blob url and click <a> element
    try {
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = cleanFileName;
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
