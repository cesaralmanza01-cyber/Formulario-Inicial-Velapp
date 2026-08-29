import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { FirestoreQuestionnaireDocument } from '../types';

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
 * Generates and triggers download of the complete medical record PDF
 */
export async function downloadPatientRecordPdf(
  patient: FirestoreQuestionnaireDocument,
  elementToCapture?: HTMLElement | null
): Promise<void> {
  const patientName = patient.patientName || 'Paciente';
  const cleanFileName = `Historia_Clinica_Vela_${patientName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${patient.patientDocument || 'doc'}.pdf`;

  // If a DOM element is provided, we can render it with html2canvas & jsPDF for exact visual fidelity
  if (elementToCapture) {
    try {
      const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgWidth = pdfWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 10; // Top margin

      // First page
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - 20);

      // Subsequent pages if long document
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
        heightLeft -= (pdfHeight - 20);
      }

      pdf.save(cleanFileName);
      return;
    } catch (err) {
      console.warn('Canvas PDF export error, generating structured direct vector PDF:', err);
    }
  }

  // Fallback: Direct jsPDF programmatic generation
  generateDirectVectorPdf(patient, cleanFileName);
}

/**
 * Programmatic vector PDF generator as robust fallback
 */
function generateDirectVectorPdf(patient: FirestoreQuestionnaireDocument, fileName: string) {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 40;
  let y = 40;

  // Header Banner
  doc.setFillColor(91, 136, 126); // #5B887E Vela Sage
  doc.rect(margin, y, pageWidth - margin * 2, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('VELA • HISTORIA CLÍNICA INICIAL', margin + 15, y + 26);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Manejo Médico e Integral del Sobrepeso y la Obesidad • Dra. Lorena Castro', margin + 15, y + 45);

  y += 75;

  // Patient Card
  doc.setFillColor(250, 246, 240); // #FAF6F0
  doc.rect(margin, y, pageWidth - margin * 2, 65, 'F');
  doc.setDrawColor(217, 211, 200);
  doc.rect(margin, y, pageWidth - margin * 2, 65, 'S');

  doc.setTextColor(46, 58, 54); // #2E3A36
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(patient.patientName || 'Paciente', margin + 12, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Documento: ${patient.identificacion?.documentType || 'CC'} ${patient.patientDocument || 'Sin documento'} | Edad: ${patient.identificacion?.age || '—'} años | Ocupación: ${patient.identificacion?.occupation || '—'}`,
    margin + 12,
    y + 36
  );
  doc.text(
    `Estado: ${patient.status === 'completado' ? 'Completado' : `En progreso (Paso ${patient.currentStep}/11)`} | Fecha Registro: ${formatDate(patient.startedAt)} | Finalizado: ${formatDate(patient.completedAt)}`,
    margin + 12,
    y + 50
  );

  y += 80;

  // Helper function to print section titles
  const printSectionTitle = (title: string) => {
    if (y > 750) {
      doc.addPage();
      y = 40;
    }
    doc.setFillColor(235, 243, 240);
    doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
    doc.setTextColor(91, 136, 126);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(title, margin + 8, y + 14);
    y += 28;
  };

  // Helper function to print key-value rows
  const printRow = (label: string, value?: string | null) => {
    if (!value) return;
    if (y > 770) {
      doc.addPage();
      y = 40;
    }
    doc.setTextColor(92, 110, 104);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(`${label}:`, margin + 10, y);
    
    doc.setTextColor(46, 58, 54);
    doc.setFont('helvetica', 'normal');
    const textLines = doc.splitTextToSize(value, pageWidth - margin * 2 - 130);
    doc.text(textLines, margin + 120, y);
    y += Math.max(14, textLines.length * 12 + 4);
  };

  // 1. Red Flags
  if (patient.banderas_revisar && patient.banderas_revisar.length > 0) {
    if (y > 720) {
      doc.addPage();
      y = 40;
    }
    doc.setFillColor(253, 238, 233);
    doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
    doc.setTextColor(198, 106, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(`PUNTOS CLÍNICOS PARA REVISAR EN CONSULTA (${patient.banderas_revisar.length})`, margin + 8, y + 14);
    y += 26;

    patient.banderas_revisar.forEach((f) => {
      if (y > 760) {
        doc.addPage();
        y = 40;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(198, 106, 77);
      doc.text(`• [${f.category}] ${f.symptom}`, margin + 10, y);
      y += 12;
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(92, 110, 104);
      const noteLines = doc.splitTextToSize(f.clinicalNote, pageWidth - margin * 2 - 20);
      doc.text(noteLines, margin + 20, y);
      y += noteLines.length * 11 + 6;
    });
  }

  // 2. Motivo y Objetivos
  printSectionTitle('1. MOTIVO Y OBJETIVOS DE CONSULTA');
  printRow('Motivo principal', patient.motivo_objetivos?.consultationReason);
  printRow('Metas esperadas', patient.motivo_objetivos?.expectedGoals);
  printRow('Visión a 6 meses', patient.motivo_objetivos?.futureVision);
  printRow('Obstáculos actuales', patient.motivo_objetivos?.currentObstacles);

  // 3. Relación con el peso
  printSectionTitle('2. HISTORIAL Y RELACIÓN CON EL PESO');
  printRow('Peso actual', patient.relacion_peso?.currentWeightKg ? `${patient.relacion_peso.currentWeightKg} kg` : null);
  printRow('Estatura / Talla', patient.relacion_peso?.heightCm ? `${patient.relacion_peso.heightCm} cm` : null);
  printRow('Menor peso (+18)', patient.relacion_peso?.lowestWeightSince18Kg ? `${patient.relacion_peso.lowestWeightSince18Kg} kg` : null);
  printRow('Mayor peso (+18)', patient.relacion_peso?.highestWeightSince18Kg ? `${patient.relacion_peso.highestWeightSince18Kg} kg` : null);
  printRow('Fluctuaciones', patient.relacion_peso?.fluctuationCount);
  printRow('Recuperación peso', patient.relacion_peso?.regainSpeed);
  printRow('Métodos previos', patient.relacion_peso?.previousMethods?.join(', '));
  printRow('Fármacos para peso', patient.relacion_peso?.usedWeightMedications === 'Sí' ? patient.relacion_peso.weightMedicationsNames : 'No');
  printRow('Cirugía bariátrica', patient.relacion_peso?.hadBariatricSurgery === 'Sí' ? `Sí (${patient.relacion_peso.bariatricSurgeryTimeAgo})` : 'No');
  printRow('Cirugías estéticas', patient.relacion_peso?.hadAestheticSurgery === 'Sí' ? `Sí (${patient.relacion_peso.aestheticSurgeryDetails})` : 'No');

  // 4. Mapa de Salud
  printSectionTitle('3. MAPA DE SALUD Y ANTECEDENTES');
  printRow('Patológicos', patient.mapa_salud?.pathologicalHistory);
  printRow('Farmacológicos', patient.mapa_salud?.pharmacologicalHistory);
  printRow('Quirúrgicos', patient.mapa_salud?.surgicalHistory);
  printRow('Tóxico-Alérgicos', patient.mapa_salud?.toxicAllergicHistory);
  if (patient.mapa_salud?.appliesGynecoObstetric === 'Sí') {
    printRow(
      'Gineco-obstétricos',
      `G:${patient.mapa_salud.pregnanciesCount || 0} P:${patient.mapa_salud.vaginalDeliveriesCount || 0} C:${patient.mapa_salud.cesareanCount || 0} A:${patient.mapa_salud.lossesCount || 0} | Menarquía: ${patient.mapa_salud.menarcheAge || '-'} años | Ciclos: ${patient.mapa_salud.cycleRegularity || '-'} | Menopausia: ${patient.mapa_salud.menopauseStage || 'No'}`
    );
  }
  printRow('Familiares', patient.mapa_salud?.familyHistory?.join(', '));

  // 5. Revisión por Sistemas
  printSectionTitle('4. REVISIÓN POR SISTEMAS Y SÍNTOMAS');
  printRow('Patrón de energía', patient.revision_sistemas?.general?.selectedChips?.join(', ') || (patient.revision_sistemas?.general?.hasNoSymptoms ? 'Sin síntomas' : ''));
  printRow('Digestivo', patient.revision_sistemas?.digestive?.selectedChips?.join(', '));
  if (patient.revision_sistemas?.digestiveHabits) {
    printRow(
      'Hábito intestinal',
      `Consistencia: ${patient.revision_sistemas.digestiveHabits.stoolConsistency || '—'} | Frecuencia: ${patient.revision_sistemas.digestiveHabits.dailyBowelMovementCount || '—'} | Dificultad: ${patient.revision_sistemas.digestiveHabits.hasDifficultyDefecating || 'No'}`
    );
  }
  if (patient.revision_sistemas?.moodSleepHabits) {
    printRow(
      'Estrés y Sueño',
      `Estrés: ${patient.revision_sistemas.moodSleepHabits.stressLevel ?? '—'}/10 | Horas sueño: ${patient.revision_sistemas.moodSleepHabits.calculatedSleepHours ?? '—'}h (${patient.revision_sistemas.moodSleepHabits.bedtime || ''} a ${patient.revision_sistemas.moodSleepHabits.wakeTime || ''})`
    );
    printRow('Rutina cotidiana', patient.revision_sistemas.moodSleepHabits.dailyRoutineDescription);
  }

  // 6. Alimentación
  printSectionTitle('5. ALIMENTACIÓN Y NUTRICIÓN');
  printRow('Favoritos', patient.entrevista_dietetica?.favoriteFoods);
  printRow('Menos gustan', patient.entrevista_dietetica?.dislikedFoods);
  printRow('Restricciones', patient.entrevista_dietetica?.dietaryRestrictions?.join(', '));
  printRow('Resolución comidas', patient.entrevista_dietetica?.mealPreparationStyle);
  printRow('Comer por fuera', patient.entrevista_dietetica?.eatingOutFrequency);
  printRow('Puntos débiles', patient.entrevista_dietetica?.nutritionWeakSpots?.join(', '));
  printRow('Suplementos', patient.entrevista_dietetica?.takesSupplements === 'Sí' ? patient.entrevista_dietetica.supplementDetails : 'No');

  // 7. Movimiento
  printSectionTitle('6. ACTIVIDAD FÍSICA Y MOVIMIENTO');
  printRow('Actividad diaria', patient.actividad_fisica?.dailyActivityType);
  printRow('Escaleras / Caminata', `Escaleras: ${patient.actividad_fisica?.takesStairsFrequency || '—'} | Caminar transporte: ${patient.actividad_fisica?.walksForTransport || '—'}`);
  printRow('Horas sentada', patient.actividad_fisica?.dailySittingHours);
  printRow('Ejercicio estructurado', patient.actividad_fisica?.doesStructuredExercise === 'Sí' ? `${patient.actividad_fisica.exerciseTypes?.join(', ')} (${patient.actividad_fisica.exerciseWeeklyFrequency}, ${patient.actividad_fisica.exerciseSessionDuration})` : 'No');
  printRow('Motivación', `Ejercicio: ${patient.actividad_fisica?.motivationStructuredExercise || '-'}/5 | Movimiento diario: ${patient.actividad_fisica?.motivationDailyMovement || '-'}/5`);
  printRow('Barreras reportadas', patient.actividad_fisica?.movementBarriersOrConcerns);

  // 8. InBody
  if (patient.inbody?.extractedMetrics) {
    printSectionTitle('7. REGISTRO INBODY / COMPOSICIÓN CORPORAL');
    const m = patient.inbody.extractedMetrics;
    printRow(
      'Métricas InBody',
      `Peso: ${m.pesoKg ?? '-'} kg | Talla: ${m.tallaCm ?? '-'} cm | % Grasa: ${m.porcentajeGrasaCorporal ?? '-'}% | MME: ${m.masaMuscularEsqueleticaKg ?? '-'} kg | Masa Grasa: ${m.masaGrasaCorporalKg ?? '-'} kg | Grasa Visceral: Nivel ${m.nivelGrasaVisceral ?? '-'} | TMB: ${m.tasaMetabolicaBasalKcal ?? '-'} kcal | IMC: ${m.imc ?? '-'} kg/m²`
    );
    printRow('Equipo y Fecha', `${m.modeloEquipo || 'InBody'} | Fecha: ${m.fechaExamen || '—'}`);
    printRow('Observaciones', m.observacionesClinicas);
  }

  // Footer on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(142, 158, 153);
    doc.text(
      `Vela • Dra. Lorena Castro • Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'center' }
    );
  }

  doc.save(fileName);
}
