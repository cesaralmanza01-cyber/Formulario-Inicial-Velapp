import jsPDF from 'jspdf';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import {
  FirestoreQuestionnaireDocument,
  UploadedLabFile,
  MealMomentEntry,
  WeightTrajectoryMilestone,
  ObesityFamilyMemberEntry,
  WeightStagePoint,
  LifeStageKey,
  getPHQ2OptionScore,
  calculateStopScore,
} from '../types';
import { getFileDataUrl, getFileDataUrlAsync } from './fileMemoryStore';
import { evaluateClinicalRedFlags } from './clinicalFlags';

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

  /**
   * Renders the Weight Trajectory Chart (Curva de trayectoria de peso en las etapas de vida)
   * Using native vector primitives in jsPDF for crisp medical-record rendering.
   */
  const drawWeightJourneyChart = (
    points?: WeightStagePoint[] | null,
    currentWeightStr?: string,
    lowestWeightStr?: string,
    highestWeightStr?: string
  ) => {
    const stagesMeta: { key: LifeStageKey; label: string; sub: string }[] = [
      { key: 'infancia', label: 'Infancia', sub: '0-12 a' },
      { key: 'adolescencia', label: 'Adolescencia', sub: '13-18 a' },
      { key: 'juventud', label: 'Juventud', sub: '19-29 a' },
      { key: 'adultez', label: 'Adultez', sub: '30-49 a' },
      { key: 'actualidad', label: 'Actualidad', sub: 'Hoy' },
    ];

    const byStage = new Map<string, number | null>();
    if (points && points.length > 0) {
      points.forEach((p) => {
        if (typeof p.weightKg === 'number' && !isNaN(p.weightKg)) {
          byStage.set(p.stage, p.weightKg);
        }
      });
    }

    // Fallback for actualidad if missing in points
    if (byStage.get('actualidad') === undefined && currentWeightStr) {
      const parsedCurrent = parseFloat(currentWeightStr);
      if (!isNaN(parsedCurrent) && parsedCurrent > 0) {
        byStage.set('actualidad', parsedCurrent);
      }
    }

    // Collect all valid weights
    const validWeights: number[] = [];
    stagesMeta.forEach((s) => {
      const w = byStage.get(s.key);
      if (typeof w === 'number' && !isNaN(w) && w > 0) {
        validWeights.push(w);
      }
    });

    // If no points at all, don't render empty chart
    if (validWeights.length === 0) return;

    const chartHeight = 150;
    checkPageBreak(chartHeight + 20);

    // Chart container box
    const boxX = margin + 4;
    const boxW = contentWidth - 8;
    const boxY = y;
    const boxH = chartHeight;

    // Background card (Salvia clara / Crema Vela)
    doc.setFillColor(252, 250, 247);
    doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'F');
    doc.setDrawColor(217, 211, 200);
    doc.setLineWidth(0.6);
    doc.roundedRect(boxX, boxY, boxW, boxH, 4, 4, 'S');

    // Chart Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(91, 136, 126); // #5B887E
    doc.text('Curva de trayectoria de peso a lo largo de las etapas de vida', boxX + 12, boxY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(110, 125, 120);
    doc.text('Evolución histórica y momentos de fluctuación registrados en el cuestionario', boxX + 12, boxY + 23);

    // Dynamic min & max Y range
    const rawMin = Math.min(...validWeights);
    const rawMax = Math.max(...validWeights);
    const yMin = Math.max(30, Math.floor((rawMin - 8) / 10) * 10);
    const yMax = Math.max(yMin + 20, Math.ceil((rawMax + 8) / 10) * 10);

    // Plot dimensions
    const plotLeft = boxX + 44;
    const plotRight = boxX + boxW - 24;
    const plotTop = boxY + 36;
    const plotBottom = boxY + boxH - 28;
    const plotW = plotRight - plotLeft;
    const plotH = plotBottom - plotTop;

    // Helper to calculate coordinates
    const getX = (index: number) => plotLeft + (plotW * index) / (stagesMeta.length - 1);
    const getY = (weight: number) => {
      const clamped = Math.max(yMin, Math.min(yMax, weight));
      const ratio = (clamped - yMin) / (yMax - yMin);
      return plotBottom - ratio * plotH;
    };

    // Draw horizontal grid lines (3 or 4 levels)
    const gridSteps = 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(142, 158, 153); // #8E9E99

    for (let i = 0; i <= gridSteps; i++) {
      const levelWeight = Math.round(yMin + ((yMax - yMin) * i) / gridSteps);
      const gridY = getY(levelWeight);

      // Grid dashed line
      doc.setDrawColor(232, 226, 216);
      doc.setLineWidth(0.4);
      doc.line(plotLeft, gridY, plotRight, gridY);

      // Y-axis label (kg)
      doc.text(`${levelWeight} kg`, plotLeft - 22, gridY + 2.5);
    }

    // Build plotted points coordinates
    const plottedCoords: { x: number; y: number; weight: number; label: string; sub: string; index: number }[] = [];
    stagesMeta.forEach((s, idx) => {
      const w = byStage.get(s.key);
      if (typeof w === 'number' && !isNaN(w) && w > 0) {
        plottedCoords.push({
          x: getX(idx),
          y: getY(w),
          weight: Math.round(w * 10) / 10,
          label: s.label,
          sub: s.sub,
          index: idx,
        });
      }
    });

    // Draw connecting path line between valid points
    if (plottedCoords.length >= 2) {
      doc.setDrawColor(110, 158, 147); // #6E9E93 Sage
      doc.setLineWidth(1.8);
      for (let i = 0; i < plottedCoords.length - 1; i++) {
        const p1 = plottedCoords[i];
        const p2 = plottedCoords[i + 1];
        doc.line(p1.x, p1.y, p2.x, p2.y);
      }
    }

    // Draw nodes (points), weight pills, and X-axis stage markers
    stagesMeta.forEach((s, idx) => {
      const stageX = getX(idx);

      // Vertical subtle guideline
      doc.setDrawColor(240, 235, 227);
      doc.setLineWidth(0.4);
      doc.line(stageX, plotTop, stageX, plotBottom);

      // Stage X label (below chart)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(46, 58, 54);
      const lblW = doc.getTextWidth(s.label);
      doc.text(s.label, stageX - lblW / 2, plotBottom + 11);

      // Stage sublabel (e.g. 0-12 a)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(142, 158, 153);
      const subW = doc.getTextWidth(s.sub);
      doc.text(s.sub, stageX - subW / 2, plotBottom + 18);
    });

    // Draw circular dots and weight bubble values on plotted points
    plottedCoords.forEach((p) => {
      // Outer glow circle
      doc.setFillColor(235, 243, 240); // #EBF3F0
      doc.circle(p.x, p.y, 4.5, 'F');

      // Main dot
      doc.setFillColor(110, 158, 147); // #6E9E93
      doc.circle(p.x, p.y, 2.8, 'F');

      // Inner white center
      doc.setFillColor(255, 255, 255);
      doc.circle(p.x, p.y, 1.2, 'F');

      // Weight label pill above or below point
      const weightText = `${p.weight} kg`;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const textW = doc.getTextWidth(weightText);
      const pillW = textW + 6;
      const pillH = 10;
      const pillY = p.y - 14 < plotTop ? p.y + 6 : p.y - 15;

      // Small background pill for legibility
      doc.setFillColor(255, 255, 255);
      doc.roundedRect(p.x - pillW / 2, pillY, pillW, pillH, 2, 2, 'F');
      doc.setDrawColor(174, 201, 192);
      doc.setLineWidth(0.4);
      doc.roundedRect(p.x - pillW / 2, pillY, pillW, pillH, 2, 2, 'S');

      // Value text
      doc.setTextColor(46, 58, 54);
      doc.text(weightText, p.x - textW / 2, pillY + 7.5);
    });

    y += boxH + 12;
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
  doc.roundedRect(margin, y, contentWidth, 70, 4, 4, 'F');
  doc.setDrawColor(217, 211, 200); // #D9D3C8
  doc.setLineWidth(0.75);
  doc.roundedRect(margin, y, contentWidth, 70, 4, 4, 'S');

  doc.setTextColor(46, 58, 54); // #2E3A36 Verde carbón
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(patient.patientName || 'Paciente', margin + 14, y + 17);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(92, 110, 104); // #5C6E68
  doc.text(
    `Documento: ${patient.identificacion?.documentType || 'CC'} ${patient.patientDocument || 'Sin documento'}  •  Sexo: ${patient.identificacion?.sex || 'No indicado'}  •  Edad: ${patient.identificacion?.age || '—'} años  •  Ocupación: ${patient.identificacion?.occupation || '—'}`,
    margin + 14,
    y + 32
  );

  doc.text(
    `Celular: ${patient.identificacion?.phone || 'No registrado'}  •  Correo: ${patient.identificacion?.email || patient.userEmail || 'No registrado'}`,
    margin + 14,
    y + 46
  );

  const docDate = patient.completedAt || patient.savedAt || patient.updatedAt || patient.startedAt;
  doc.text(
    `Fecha de registro: ${formatDate(docDate)}  •  Estado civil: ${patient.identificacion?.civilStatus || 'No indicado'}  •  Referencia: ${patient.identificacion?.referralSource || 'Vela'}${patient.identificacion?.referralOtherDetails ? ` (${patient.identificacion.referralOtherDetails})` : ''}`,
    margin + 14,
    y + 60
  );

  y += 80;

  // ==========================================
  // ALERTA PRIORITARIA: ALERGIA A MEDICAMENTOS (Inicio del reporte)
  // ==========================================
  if (
    patient.mapa_salud?.hasDrugAllergies === 'Sí' &&
    patient.mapa_salud.drugAllergiesDetails?.trim()
  ) {
    const allergyText = `ALERGIA A MEDICAMENTOS: ${patient.mapa_salud.drugAllergiesDetails.trim().toUpperCase()}`;
    checkPageBreak(30);
    doc.setFillColor(253, 238, 233); // Fondo coral/rojo claro #FDEEE9
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'F');
    doc.setDrawColor(198, 106, 77); // Borde coral/rojo #C66A4D
    doc.setLineWidth(0.9);
    doc.roundedRect(margin, y, contentWidth, 24, 3, 3, 'S');

    doc.setTextColor(198, 106, 77);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(allergyText, margin + 12, y + 15);

    y += 30;
  }

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
  printField('Sexo asignado / biológico', patient.identificacion?.sex);
  printField('Teléfono celular / WhatsApp', patient.identificacion?.phone);
  printField('Correo electrónico', patient.identificacion?.email || patient.userEmail);
  printField('Fecha de nacimiento', patient.identificacion?.birthDate);
  printField('Edad', patient.identificacion?.age ? `${patient.identificacion.age} años` : null);
  if (patient.identificacion?.ethnicOrigin) {
    printField('Origen étnico con el que se identifica', patient.identificacion.ethnicOrigin);
  }
  printField('Ocupación y Profesión', patient.identificacion?.occupation);
  printField('Escolaridad (último nivel alcanzado)', patient.identificacion?.educationLevel);
  printField('Estado civil', patient.identificacion?.civilStatus);
  printField(
    'Medio por el cual conoció a Vela',
    patient.identificacion?.referralSource
      ? `${patient.identificacion.referralSource}${patient.identificacion.referralOtherDetails ? ` — ${patient.identificacion.referralOtherDetails}` : ''}`
      : null
  );

  // Nota exclusiva para la doctora si el paciente tiene ascendencia asiática
  if (patient.identificacion?.ethnicOrigin === 'Asiático(a)') {
    const alertHeight = 22;
    checkPageBreak(alertHeight + 4);

    doc.setFillColor(253, 238, 233); // #FDEEE9
    doc.roundedRect(margin + 6, y, contentWidth - 12, alertHeight - 4, 3, 3, 'F');
    doc.setDrawColor(241, 185, 168); // #F1B9A8
    doc.setLineWidth(0.6);
    doc.roundedRect(margin + 6, y, contentWidth - 12, alertHeight - 4, 3, 3, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(198, 106, 77); // Coral #C66A4D
    doc.text('Nota para la Dra. Lorena Castro:', margin + 14, y + 9);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(46, 58, 54);
    doc.text('Ascendencia asiática: usar punto de corte de IMC ≥27.5', margin + 14, y + 17);

    y += alertHeight;
  }

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
    const isAsian = patient.identificacion?.ethnicOrigin === 'Asiático(a)';
    printField(
      'Índice de Masa Corporal (IMC)',
      isAsian ? `${bmiStr} (Nota: Punto de corte IMC ≥27.5 en ascendencia asiática)` : bmiStr
    );
  }

  // Peso más alto y más bajo de la vida adulta
  const highestWeightVal = patient.relacion_peso?.highestWeightSince18Kg?.trim();
  const highestAgeVal = patient.relacion_peso?.highestWeightAge?.trim();
  let highestWeightText: string | null = null;
  if (patient.relacion_peso?.highestWeightDontRemember) {
    highestWeightText = 'No recuerda';
  } else if (highestWeightVal) {
    highestWeightText = `${highestWeightVal} kg`;
    if (highestAgeVal && !patient.relacion_peso?.highestWeightAgeDontRemember) {
      highestWeightText += ` (a los ${highestAgeVal} años)`;
    }
  }
  printField('Peso más alto en la vida adulta (sin contar embarazos)', highestWeightText);

  const lowestWeightVal = patient.relacion_peso?.lowestWeightSince18Kg?.trim();
  const lowestAgeVal = patient.relacion_peso?.lowestWeightAge?.trim();
  let lowestWeightText: string | null = null;
  if (patient.relacion_peso?.lowestWeightDontRemember) {
    lowestWeightText = 'No recuerda';
  } else if (lowestWeightVal) {
    lowestWeightText = `${lowestWeightVal} kg`;
    if (lowestAgeVal && !patient.relacion_peso?.lowestWeightAgeDontRemember) {
      lowestWeightText += ` (a los ${lowestAgeVal} años)`;
    }
  }
  printField('Peso más bajo en la vida adulta', lowestWeightText);

  // Etapa de establecimiento del sobrepeso
  if (patient.relacion_peso?.overweightOnsetStage) {
    const stageLabels: Record<string, string> = {
      infancia: 'Infancia (0-12 años)',
      adolescencia: 'Adolescencia (13-18 años)',
      juventud: 'Juventud (19-29 años)',
      adultez: 'Adultez (30-49 años)',
    };
    const stageDisplay = stageLabels[patient.relacion_peso.overweightOnsetStage] || patient.relacion_peso.overweightOnsetStage;
    const childhoodDetail = patient.relacion_peso.overweightOnsetStage === 'infancia' && patient.relacion_peso.childhoodOnsetAge
      ? ` — Edad aprox: ${patient.relacion_peso.childhoodOnsetAge} años${
          parseInt(patient.relacion_peso.childhoodOnsetAge, 10) < 5
            ? ' [Alerta: Inicio < 5 años, valorar sospecha genética/monogénica]'
            : ''
        }`
      : '';
    printField('Etapa de origen del sobrepeso', `${stageDisplay}${childhoodDetail}`);

    // Alerta clínica en rojo exclusiva para la doctora cuando el sobrepeso inició en la infancia
    if (patient.relacion_peso.overweightOnsetStage === 'infancia') {
      const isUnder5 =
        patient.relacion_peso.childhoodOnsetAge &&
        parseInt(patient.relacion_peso.childhoodOnsetAge, 10) < 5;
      const under5Extra = isUnder5
        ? 'Alerta prioritaria (< 5 años): alta sospecha de causa genética monogénica (vía leptina-melanocortina: MC4R, LEP, LEPR, POMC, PCSK1). Valorar derivación a genética médica.'
        : '';

      const alertHeight = under5Extra ? 36 : 26;
      checkPageBreak(alertHeight + 4);

      // Fondo coral pálido #FDEEE9 con borde coral #F1B9A8
      doc.setFillColor(253, 238, 233);
      doc.roundedRect(margin + 6, y, contentWidth - 12, alertHeight - 4, 3, 3, 'F');
      doc.setDrawColor(241, 185, 168);
      doc.setLineWidth(0.6);
      doc.roundedRect(margin + 6, y, contentWidth - 12, alertHeight - 4, 3, 3, 'S');

      // Título en coral oscuro
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(198, 106, 77); // Coral #C66A4D
      doc.text('Bandera roja — Nota interna para la Dra. Lorena Castro', margin + 14, y + 10);

      // Texto de la alerta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(198, 106, 77);
      doc.text('• Obesidad de inicio temprano — ¿genética?', margin + 14, y + 18.5);

      if (under5Extra) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(92, 110, 104);
        doc.text(under5Extra, margin + 20, y + 26);
      }

      y += alertHeight;
    }
  }

  // Curva de trayectoria de peso en las etapas de vida (Interactive Journey Chart drawn into PDF)
  if (
    patient.relacion_peso?.weightJourneyPoints &&
    patient.relacion_peso.weightJourneyPoints.length > 0
  ) {
    drawWeightJourneyChart(
      patient.relacion_peso.weightJourneyPoints,
      patient.relacion_peso.currentWeightKg,
      patient.relacion_peso.lowestWeightSince18Kg,
      patient.relacion_peso.highestWeightSince18Kg
    );
  }

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

    const medList =
      patient.relacion_peso.weightMedicationsList &&
      patient.relacion_peso.weightMedicationsList.length > 0
        ? patient.relacion_peso.weightMedicationsList
        : [
            {
              name: patient.relacion_peso.weightMedicationsNames || '',
              dose: patient.relacion_peso.weightMedicationsDose || '',
              currentlyUsing: patient.relacion_peso.weightMedicationsCurrentlyUsing || '',
              discontinueReasons: patient.relacion_peso.weightMedicationsDiscontinueReasons || [],
              discontinueOther: patient.relacion_peso.weightMedicationsDiscontinueOther || '',
            },
          ];

    medList.forEach((med, idx) => {
      const medTitle =
        medList.length > 1
          ? `Medicamento ${idx + 1}: ${med.name || 'Sin especificar'}`
          : `Medicamento o inyectable: ${med.name || 'Sin especificar'}`;
      const medLines: string[] = [];
      if (med.dose) medLines.push(`• Dosis: ${med.dose}`);
      if (med.currentlyUsing) medLines.push(`• Estado de uso: ${med.currentlyUsing}`);
      if (
        med.currentlyUsing === 'No, lo suspendí' &&
        med.discontinueReasons &&
        med.discontinueReasons.length > 0
      ) {
        const reasons = med.discontinueReasons
          .map((r) => (r === 'Otro' && med.discontinueOther ? `Otro (${med.discontinueOther})` : r))
          .join(', ');
        medLines.push(`• Motivo de suspensión: ${reasons}`);
      }
      printField(medTitle, medLines.join('\n') || 'Registrado', true);
    });

    printField(
      'Experiencia con dichos fármacos',
      patient.relacion_peso.weightMedicationsExperience,
      true
    );
    printField(
      'Efectos adversos o intolerancias',
      patient.relacion_peso.weightMedicationsAdverseEffects,
      true
    );
  } else {
    printField('¿Ha usado medicamentos para el peso?', 'No');
  }

  // Surgeries
  printSubSectionTitle('Antecedentes quirúrgicos de peso o contorno');
  if (patient.relacion_peso?.hadBariatricSurgery === 'Sí') {
    const bariatricLines: string[] = [];
    if (patient.relacion_peso.bariatricSurgeryTimeAgo) {
      bariatricLines.push(`• Tipo y tiempo transcurrido: ${patient.relacion_peso.bariatricSurgeryTimeAgo}`);
    }
    if (patient.relacion_peso.bariatricPreOpWeightKg) {
      bariatricLines.push(`• Peso antes de la cirugía: ${patient.relacion_peso.bariatricPreOpWeightKg} kg`);
    }
    if (patient.relacion_peso.bariatricLowestWeightPostOpKg) {
      bariatricLines.push(`• Peso más bajo alcanzado tras la cirugía: ${patient.relacion_peso.bariatricLowestWeightPostOpKg} kg`);
    }
    if (patient.relacion_peso.bariatricWeightRegain) {
      let regainText = `• ¿Ha vuelto a subir de peso tras la cirugía?: ${patient.relacion_peso.bariatricWeightRegain}`;
      if (
        patient.relacion_peso.bariatricWeightRegain === 'Sí' &&
        patient.relacion_peso.bariatricWeightRegainedKg
      ) {
        regainText += ` (aproximadamente ${patient.relacion_peso.bariatricWeightRegainedKg} kg)`;
      }
      bariatricLines.push(regainText);
    }
    printField(
      'Cirugía bariátrica previa',
      bariatricLines.length > 0 ? `Sí\n${bariatricLines.join('\n')}` : 'Sí',
      true
    );
  } else {
    printField('Cirugía bariátrica previa', patient.relacion_peso?.hadBariatricSurgery || 'No');
  }
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
  // Pharmacological history & Obesogenic drugs
  let pharmDisplay = '';
  if (patient.mapa_salud?.medicationEntries && patient.mapa_salud.medicationEntries.length > 0) {
    const lines = patient.mapa_salud.medicationEntries.map((m) => {
      const details: string[] = [];
      if (m.dose?.trim()) {
        details.push(`Dosis: ${m.dose.trim()}`);
      }
      if (m.startMonth || m.startYear) {
        const dateStr = [m.startMonth, m.startYear].filter(Boolean).join(' ');
        details.push(`Inicio: ${dateStr}`);
      }
      const typeBadge = m.isCustom ? '' : ' [Potencial obesogénico]';
      return `• ${m.name}${typeBadge}${details.length > 0 ? ` (${details.join(' — ')})` : ''}`;
    });
    pharmDisplay = lines.join('\n');
    if (patient.mapa_salud?.otherMedicationsDetails?.trim()) {
      pharmDisplay += `\nNotas adicionales: ${patient.mapa_salud.otherMedicationsDetails.trim()}`;
    }
  } else {
    pharmDisplay = patient.mapa_salud?.pharmacologicalHistory || '';
    if (patient.mapa_salud?.selectedObesogenicDrugs && patient.mapa_salud.selectedObesogenicDrugs.length > 0) {
      const drugsFormatted = `Fármacos con potencial obesogénico identificados: ${patient.mapa_salud.selectedObesogenicDrugs.join(', ')}`;
      pharmDisplay = pharmDisplay ? `${drugsFormatted}\nOtros medicamentos: ${pharmDisplay}` : drugsFormatted;
    }
    if (patient.mapa_salud?.otherMedicationsDetails && patient.mapa_salud.otherMedicationsDetails.trim()) {
      pharmDisplay = pharmDisplay ? `${pharmDisplay}\nOtros: ${patient.mapa_salud.otherMedicationsDetails.trim()}` : `Otros medicamentos: ${patient.mapa_salud.otherMedicationsDetails.trim()}`;
    }
  }
  if (!pharmDisplay.trim()) {
    pharmDisplay = patient.mapa_salud?.takesObesogenicMedications === 'No' ? 'Niega fármacos obesogénicos o de uso habitual' : 'Niega';
  }
  printField('Antecedentes farmacológicos (medicamentos habituales)', pharmDisplay, true);
  printField('Antecedentes quirúrgicos', patient.mapa_salud?.surgicalHistory || 'Niega');
  printField('Antecedentes hospitalarios', patient.mapa_salud?.hospitalHistory || 'Niega');

  // Alergias e intolerancias
  printSubSectionTitle('Alergias e intolerancias');
  const drugAllergyStr =
    patient.mapa_salud?.hasDrugAllergies === 'Sí'
      ? `Sí: ${patient.mapa_salud.drugAllergiesDetails || 'Reportada'}`
      : patient.mapa_salud?.hasDrugAllergies || 'Niega';
  printField('¿Alergia a algún medicamento?', drugAllergyStr);

  const foodAllergyStr =
    patient.mapa_salud?.hasFoodAllergies === 'Sí'
      ? `Sí: ${patient.mapa_salud.foodAllergiesDetails || 'Reportada'}`
      : patient.mapa_salud?.hasFoodAllergies || 'Niega';
  printField('¿Alergia o intolerancia a alimentos?', foodAllergyStr);

  if (patient.mapa_salud?.toxicAllergicHistory && patient.mapa_salud.toxicAllergicHistory !== 'Ninguno' && patient.mapa_salud.toxicAllergicHistory !== 'Sin alergias ni hábitos tóxicos') {
    printField('Otras alergias o antecedentes tóxico-alérgicos', patient.mapa_salud.toxicAllergicHistory);
  }

  // Salud ósea
  printSubSectionTitle('Salud ósea');
  const fracturesStr =
    patient.mapa_salud?.hasBoneFracturesAfter40 === 'Sí'
      ? `Sí: ${patient.mapa_salud.boneFracturesDetails || 'Reportada'}`
      : patient.mapa_salud?.hasBoneFracturesAfter40 || 'Niega';
  printField('Fracturas de huesos (+40 años o caídas leves)', fracturesStr);

  let densitometryStr = patient.mapa_salud?.hasBoneDensitometry || 'No realizada';
  if (patient.mapa_salud?.hasBoneDensitometry === 'Sí') {
    const details = [
      patient.mapa_salud.boneDensitometryYear ? `Año: ${patient.mapa_salud.boneDensitometryYear}` : null,
      patient.mapa_salud.boneDensitometryResult ? `Resultado: ${patient.mapa_salud.boneDensitometryResult}` : null,
    ].filter(Boolean).join(' — ');
    densitometryStr = `Sí (${details || 'Realizada'})`;
  }
  printField('Densitometría ósea', densitometryStr);

  // Hábitos: tabaco y alcohol
  if (patient.mapa_salud?.smokingStatus || patient.mapa_salud?.alcoholConsumption) {
    printSubSectionTitle('Hábitos: tabaco y alcohol');

    // Tabaco y vapeador
    let tobaccoText = patient.mapa_salud?.smokingStatus || 'No especificado';
    if (patient.mapa_salud?.smokingStatus === 'Fumo actualmente') {
      const details = [
        patient.mapa_salud.smokingCigarettesPerDay ? `${patient.mapa_salud.smokingCigarettesPerDay} al día` : null,
        patient.mapa_salud.smokingYears ? `fuma hace ${patient.mapa_salud.smokingYears}` : null,
      ].filter(Boolean).join(' • ');
      if (details) tobaccoText += ` (${details})`;
    } else if (patient.mapa_salud?.smokingStatus === 'Fumé pero ya lo dejé') {
      if (patient.mapa_salud.smokingQuitTimeAgo) {
        tobaccoText += ` (lo dejó hace: ${patient.mapa_salud.smokingQuitTimeAgo})`;
      }
    }
    if (patient.mapa_salud?.usesVape) {
      tobaccoText += ' • Usa vapeador / cigarrillo electrónico';
    }
    printField('¿Fumas o has fumado?', tobaccoText);

    // Alcohol
    let alcoholText = patient.mapa_salud?.alcoholConsumption || 'No especificado';
    if (patient.mapa_salud?.alcoholConsumption && patient.mapa_salud.alcoholConsumption !== 'No consumo') {
      if (patient.mapa_salud.alcoholTypicalDrinksDetails?.trim()) {
        alcoholText += ` — Bebida y cantidad típica: ${patient.mapa_salud.alcoholTypicalDrinksDetails.trim()}`;
      }
    }
    printField('¿Consumes alcohol?', alcoholText);
  }

  // Gineco-obstetric: solo si aplica y el paciente no es de sexo masculino
  const isFemalePatient = patient.identificacion?.sex !== 'Masculino';
  if (isFemalePatient && patient.mapa_salud?.appliesGynecoObstetric === 'Sí') {
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
    if (patient.mapa_salud.usesHormoneReplacementTherapy) {
      const hrtText =
        patient.mapa_salud.usesHormoneReplacementTherapy === 'Sí'
          ? `Sí: ${patient.mapa_salud.hormoneReplacementTherapyDetails || 'En uso'}`
          : patient.mapa_salud.usesHormoneReplacementTherapy;
      printField('Terapia hormonal para la menopausia', hrtText);
    }
    printField('¿Estás lactando actualmente?', patient.mapa_salud.currentlyBreastfeeding);
    const contraception =
      patient.mapa_salud.contraceptiveMethod === 'Otro' && patient.mapa_salud.contraceptiveMethodOther?.trim()
        ? `Otro (${patient.mapa_salud.contraceptiveMethodOther.trim()})`
        : patient.mapa_salud.contraceptiveMethod;
    printField('Método de planificación familiar', contraception);
    printField('¿Planeas un embarazo próximamente?', patient.mapa_salud.pregnancyPlan);
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
    patient.mapa_salud?.familyHistory?.length ? patient.mapa_salud.familyHistory.join(', ') : 'No reporta antecedentes generales'
  );

  // Detalle de antecedentes familiares de obesidad y comorbilidades
  const hasFamObesity = patient.mapa_salud?.hasFamilyObesityHistory;
  if (hasFamObesity === 'Sí') {
    const members = patient.mapa_salud?.familyObesityMembers || [];
    if (members.length > 0) {
      printSubSectionTitle('Familiares con antecedentes de obesidad y enfermedades asociadas');
      members.forEach((m: ObesityFamilyMemberEntry, idx: number) => {
        const relation = m.relationship === 'Otro familiar' && m.otherRelationship?.trim()
          ? `Otro (${m.otherRelationship.trim()})`
          : (m.relationship || `Familiar ${idx + 1}`);
        const onset = m.onsetAge || 'Inicio no especificado';
        const comorbs = m.comorbidities && m.comorbidities.length > 0
          ? m.comorbidities
              .map((c) => {
                const age = m.comorbiditiesAges?.[c]?.trim();
                if (age && age.toLowerCase() !== 'no sé' && age.toLowerCase() !== 'no se') {
                  return `${c} (edad aprox: ${age} años)`;
                } else if (age && (age.toLowerCase() === 'no sé' || age.toLowerCase() === 'no se')) {
                  return `${c} (edad: no sabe)`;
                }
                return c;
              })
              .join(', ')
          : 'Sin comorbilidades reportadas';
        const otherAge = m.otherComorbiditiesAge?.trim();
        const otherAgeStr = otherAge
          ? (otherAge.toLowerCase() === 'no sé' || otherAge.toLowerCase() === 'no se' ? ' [edad: no sabe]' : ` [edad aprox: ${otherAge} años]`)
          : '';
        const otherComorb = m.otherComorbidities?.trim() ? ` (Otros: ${m.otherComorbidities.trim()}${otherAgeStr})` : '';
        const memberDetails = `Parentesco: ${relation}\nInicio del exceso de peso: ${onset}\nEnfermedades asociadas: ${comorbs}${otherComorb}`;
        printField(`Familiar #${idx + 1} - ${relation}`, memberDetails, true);
      });
    } else {
      printField('Antecedentes familiares de obesidad', 'Refiere familiares con obesidad, sin miembros especificados');
    }
  } else if (hasFamObesity === 'No') {
    printField('Antecedentes familiares de obesidad', 'Niega antecedentes familiares de obesidad');
  }

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
    printSubSectionTitle('Estrés, bienestar emocional y estilo de vida');
    printField(
      'Nivel de estrés en el último mes',
      msh.stressLevel !== undefined ? `${msh.stressLevel} / 10` : null
    );
    if (msh.stressSources && msh.stressSources.length > 0) {
      const sourcesStr = msh.stressSources.join(', ');
      const otherStr = msh.stressSourcesOther ? ` (Otros: ${msh.stressSourcesOther})` : '';
      printField('Principales fuentes de estrés', `${sourcesStr}${otherStr}`);
    }

    // PHQ-2 Screening details
    if (msh.phq2 && (msh.phq2.littleInterest || msh.phq2.feelingDown)) {
      printSubSectionTitle('Tamizaje de estado de ánimo PHQ-2 (Últimas 2 semanas)');
      const q1Ans = msh.phq2.littleInterest || 'No reportado';
      const q2Ans = msh.phq2.feelingDown || 'No reportado';
      const q1Score = getPHQ2OptionScore(msh.phq2.littleInterest);
      const q2Score = getPHQ2OptionScore(msh.phq2.feelingDown);
      const totalScore = msh.phq2.totalScore !== undefined ? msh.phq2.totalScore : (q1Score + q2Score);
      const isPositive = totalScore >= 3;

      const phq2Lines: string[] = [
        `• 1. Poco interés o placer en hacer las cosas: ${q1Ans} (${q1Score} ${q1Score === 1 ? 'punto' : 'puntos'})`,
        `• 2. Sensación de tristeza, desánimo o desesperanza: ${q2Ans} (${q2Score} ${q2Score === 1 ? 'punto' : 'puntos'})`,
        `• Puntaje total PHQ-2: ${totalScore} / 6 ${isPositive ? '— [POSITIVO (≥3): Ampliar evaluación de depresión]' : '— [Negativo (<3)]'}`,
      ];
      printField('Resultados del tamizaje PHQ-2', phq2Lines.join('\n'), true);
    }

    // Bloque de Evaluación del Sueño y Tamizaje STOP
    const sa = msh.sleepAssessment;
    if (sa) {
      printSubSectionTitle('Evaluación de sueño y descanso');
      printField(
        '1. Horas de sueño en una noche habitual',
        sa.usualSleepHours ? `${sa.usualSleepHours} horas` : null
      );
      printField('2. Calidad percibida del sueño', sa.sleepQuality || null);
      printField('3. ¿Trabaja en turnos nocturnos o rotativos?', sa.nightOrRotatingShift || null);

      if (sa.stopScreening) {
        const stop = sa.stopScreening;
        const stopScore = calculateStopScore(stop);
        const isStopPositive = stopScore >= 2;

        const stopLines: string[] = [
          `• 4. ¿Roncas fuerte (se escucha a través de puerta cerrada o despierta a pareja)?: ${stop.snoringLoudly || 'No reportado'}`,
          `• 5. ¿Te sientes cansado(a), fatigado(a) o con sueño durante el día con frecuencia?: ${stop.tiredDuringDay || 'No reportado'}`,
          `• 6. ¿Alguien te ha visto dejar de respirar o ahogarte mientras duermes?: ${stop.observedApnea || 'No reportado'}`,
          `• 7. ¿Tienes o te están tratando la presión arterial alta?: ${stop.highBloodPressure || 'No reportado'}`,
          `• STOP (parcial): ${stopScore} de 4 ${isStopPositive ? '— [POSITIVO (≥2): Tamizaje STOP positivo — completar STOP-Bang en consulta]' : '— [Negativo (<2)]'}`,
        ];
        printField('Tamizaje STOP (Riesgo de apnea del sueño)', stopLines.join('\n'), true);
      }
    }

    // Bloque de Pantallas y Entorno / Rutina
    if (msh.screenTimeHours || msh.whoCooksAtHome || msh.foodSecurityWorry || msh.dailyCommuteTime) {
      printSubSectionTitle('Pantallas, entorno cotidiano y determinantes del hogar');
      if (msh.screenTimeHours) {
        printField(
          'Horas frente a pantallas fuera del trabajo (celular, TV, PC)',
          `${msh.screenTimeHours} horas al día`
        );
      }
      if (msh.whoCooksAtHome) {
        const cooksStr = `${msh.whoCooksAtHome}${msh.whoCooksAtHome === 'Otro' && msh.whoCooksAtHomeOther ? ` (${msh.whoCooksAtHomeOther})` : ''}`;
        printField('¿Quién cocina habitualmente en casa?', cooksStr);
      }
      if (msh.foodSecurityWorry) {
        printField(
          '¿Le ha preocupado que no alcance el dinero para la comida (último año)?',
          msh.foodSecurityWorry
        );
      }
      if (msh.dailyCommuteTime) {
        printField('Tiempo diario invertido en desplazamientos', msh.dailyCommuteTime);
      }
    }

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

    checkPageBreak(30);
    doc.setFillColor(235, 243, 240);
    doc.roundedRect(margin + 6, y, contentWidth - 12, 16, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(52, 106, 96);
    doc.text(`Documentos y Archivos Adjuntos - ${categoryTitle} (${files.length})`, margin + 14, y + 11);
    y += 22;

    for (const f of files) {
      let dataUrl = f.dataUrl || getFileDataUrl(f.id, f.name);

      // Check if dataUrl is in sessionStorage if still not found
      if (!dataUrl && typeof window !== 'undefined' && window.sessionStorage) {
        try {
          dataUrl = window.sessionStorage.getItem(`file_data_${f.id}`) || undefined;
        } catch {
          // ignore
        }
      }

      const isImg =
        Boolean(dataUrl) &&
        (f.type?.startsWith('image/') ||
          dataUrl?.startsWith('data:image/') ||
          /\.(jpe?g|png|webp|gif|bmp)$/i.test(f.name || ''));

      if (isImg && dataUrl) {
        try {
          // Determine format cleanly
          let imgFormat = 'JPEG';
          if (f.type?.includes('png') || dataUrl.startsWith('data:image/png')) {
            imgFormat = 'PNG';
          } else if (f.type?.includes('webp') || dataUrl.startsWith('data:image/webp')) {
            imgFormat = 'WEBP';
          }

          // Get natural image dimensions using jsPDF image decoder
          let aspect = 4 / 3;
          try {
            const imgProps = doc.getImageProperties(dataUrl);
            const naturalWidth = imgProps.width || 800;
            const naturalHeight = imgProps.height || 600;
            if (naturalHeight > 0) {
              aspect = naturalWidth / naturalHeight;
            }
          } catch (propErr) {
            console.warn('[PDF Generator] getImageProperties fallback to aspect 4/3:', propErr);
          }

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
        checkPageBreak(40);
        const cardH = f.description ? 38 : 30;
        doc.setFillColor(250, 246, 240);
        doc.roundedRect(margin + 6, y, contentWidth - 12, cardH, 3, 3, 'F');
        doc.setDrawColor(217, 211, 200);
        doc.setLineWidth(0.5);
        doc.roundedRect(margin + 6, y, contentWidth - 12, cardH, 3, 3, 'S');

        const sizeStr = f.size
          ? f.size > 1024 * 1024
            ? ` (${(f.size / (1024 * 1024)).toFixed(1)} MB)`
            : ` (${Math.round(f.size / 1024)} KB)`
          : '';

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(52, 106, 96);
        doc.text(`• Documento PDF adjunto: ${f.name || 'Archivo'}${sizeStr}`, margin + 14, y + 11);

        const targetUrl =
          f.downloadUrl ||
          patient.driveWebViewLink ||
          (dataUrl?.startsWith('http') ? dataUrl : null) ||
          null;

        if (targetUrl) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(52, 106, 96);
          doc.textWithLink('→ Ver documento completo en Google Drive / Nube', margin + 14, y + 20, {
            url: targetUrl,
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(92, 110, 104);
          doc.text('Documento PDF registrado y respaldado en el expediente clínico', margin + 14, y + 20);
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
    printField('Métricas conocidas por el/la paciente', patient.inbody.knownMetrics, true);

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
  const effectiveFlags =
    patient.banderas_revisar && patient.banderas_revisar.length > 0
      ? patient.banderas_revisar
      : evaluateClinicalRedFlags(patient.revision_sistemas, patient.relacion_peso, patient.mapa_salud).flags;

  if (effectiveFlags && effectiveFlags.length > 0) {
    checkPageBreak(40);
    // Pale Coral Background #FDEEE9
    doc.setFillColor(253, 238, 233);
    doc.roundedRect(margin, y, contentWidth, 23, 3, 3, 'F');
    doc.setDrawColor(241, 185, 168);
    doc.setLineWidth(0.5);
    doc.roundedRect(margin, y, contentWidth, 23, 3, 3, 'S');

    doc.setTextColor(198, 106, 77); // Coral #C66A4D
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      `PUNTOS CLÍNICOS A PROFUNDIZAR EN CONSULTA (${effectiveFlags.length})`,
      margin + 10,
      y + 11
    );

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(92, 110, 104);
    doc.text(
      'Bandera roja — Nota interna para la Dra. Lorena Castro',
      margin + 10,
      y + 18.5
    );
    y += 29;

    effectiveFlags.forEach((f) => {
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
 * Converts a dataURL (base64) into Uint8Array
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Ensures image dataURL is compatible with pdf-lib (PNG or JPG)
 */
async function ensurePngOrJpgDataUrl(
  dataUrl: string,
  fileType?: string
): Promise<{ dataUrl: string; format: 'png' | 'jpg' }> {
  if (
    dataUrl.startsWith('data:image/jpeg') ||
    dataUrl.startsWith('data:image/jpg') ||
    fileType === 'image/jpeg' ||
    fileType === 'image/jpg'
  ) {
    return { dataUrl, format: 'jpg' };
  }
  if (dataUrl.startsWith('data:image/png') || fileType === 'image/png') {
    return { dataUrl, format: 'png' };
  }

  // If in browser, convert other image formats (e.g. webp, bmp) to PNG via canvas
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width || 800;
          canvas.height = img.naturalHeight || img.height || 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngData = canvas.toDataURL('image/png');
            resolve({ dataUrl: pngData, format: 'png' });
            return;
          }
        } catch (e) {
          console.warn('[PDF Generator] Canvas conversion to PNG failed:', e);
        }
        resolve({ dataUrl, format: 'png' });
      };
      img.onerror = () => {
        resolve({ dataUrl, format: 'png' });
      };
      img.src = dataUrl;
    });
  }

  return { dataUrl, format: 'png' };
}

/**
 * Collects and rehydrates all attached files across all sections
 */
async function collectAllAttachedFiles(
  patient: FirestoreQuestionnaireDocument
): Promise<UploadedLabFile[]> {
  const allFiles: UploadedLabFile[] = [];
  const seenIds = new Set<string>();

  const addFiles = (files?: UploadedLabFile[] | null) => {
    if (!files || !Array.isArray(files)) return;
    for (const f of files) {
      if (!f) continue;
      const key = f.id || `${f.name}_${f.size}`;
      if (!seenIds.has(key)) {
        seenIds.add(key);
        allFiles.push(f);
      }
    }
  };

  addFiles(patient.inbody?.files);
  addFiles(patient.paraclinicos?.files);

  // Ensure each file has its dataUrl loaded if possible
  for (const f of allFiles) {
    if (!f.dataUrl) {
      try {
        const storedUrl = await getFileDataUrlAsync(f.id, f.name);
        if (storedUrl) {
          f.dataUrl = storedUrl;
        }
      } catch {
        // ignore
      }
    }
  }

  return allFiles;
}

/**
 * Generates the complete clinical PDF including the full-page Annex of all attached documents (PDFs and Images)
 */
export async function generateCompletePatientPdfBytes(
  patient: FirestoreQuestionnaireDocument
): Promise<Uint8Array> {
  console.log('[PDF Generator] Generando PDF clínico completo con anexos para:', patient.patientName);

  // 1. Generar PDF base con el reporte completo del cuestionario en jsPDF
  const baseDoc = generatePatientQuestionnairePdfDoc(patient);
  const baseArrayBuffer = baseDoc.output('arraybuffer');

  // 2. Cargar en PDFDocument de pdf-lib
  const mergedPdf = await PDFDocument.load(baseArrayBuffer);

  // 3. Obtener todos los archivos adjuntos (InBody + Paraclínicos)
  const attachedFiles = await collectAllAttachedFiles(patient);

  if (attachedFiles.length === 0) {
    console.log('[PDF Generator] No hay archivos adjuntos para anexar.');
    return await mergedPdf.save();
  }

  console.log(`[PDF Generator] Anexando ${attachedFiles.length} documento(s) al final del PDF...`);

  // Fonts for headers and notes
  const helveticaBold = await mergedPdf.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await mergedPdf.embedFont(StandardFonts.Helvetica);
  const helveticaOblique = await mergedPdf.embedFont(StandardFonts.HelveticaOblique);

  // Colores Vela
  const sageColor = rgb(91 / 255, 136 / 255, 126 / 255); // #5B887E
  const deepSageColor = rgb(52 / 255, 106 / 255, 96 / 255); // #346A60
  const paleSageBg = rgb(235 / 255, 243 / 255, 240 / 255); // #EBF3F0
  const sageBorder = rgb(174 / 255, 201 / 255, 192 / 255); // #AEC9C0
  const mutedText = rgb(92 / 255, 110 / 255, 104 / 255); // #5C6E68
  const cardBg = rgb(250 / 255, 246 / 255, 240 / 255); // #FAF6F0
  const cardBorder = rgb(217 / 255, 211 / 255, 200 / 255); // #D9D3C8

  // Helper para añadir página de error / nota de archivo no procesable
  const addFallbackNotePage = (file: UploadedLabFile, reason: string) => {
    const page = mergedPdf.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();
    const margin = 36;
    const contentW = width - margin * 2;

    // Banner de cabecera
    page.drawRectangle({
      x: margin,
      y: height - 56,
      width: contentW,
      height: 22,
      color: paleSageBg,
      borderColor: sageBorder,
      borderWidth: 0.5,
    });
    const headerTitle = `ANEXO — DOCUMENTOS ADJUNTOS: ${file.name || 'Archivo adjunto'}`;
    page.drawText(headerTitle.slice(0, 80), {
      x: margin + 10,
      y: height - 42,
      size: 9,
      font: helveticaBold,
      color: sageColor,
    });

    // Tarjeta de información
    page.drawRectangle({
      x: margin,
      y: height - 130,
      width: contentW,
      height: 60,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 0.5,
    });

    const sizeStr = file.size
      ? file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`
      : 'Tamaño no registrado';

    page.drawText(`Documento adjunto: ${file.name || 'Sin nombre'} (${sizeStr})`, {
      x: margin + 12,
      y: height - 90,
      size: 8.5,
      font: helveticaBold,
      color: deepSageColor,
    });

    page.drawText(`Nota: ${reason}`, {
      x: margin + 12,
      y: height - 110,
      size: 8,
      font: helveticaOblique,
      color: mutedText,
    });
  };

  for (let fileIdx = 0; fileIdx < attachedFiles.length; fileIdx++) {
    const file = attachedFiles[fileIdx];
    let dataUrl = file.dataUrl;

    if (!dataUrl && file.downloadUrl && file.downloadUrl.startsWith('http')) {
      try {
        const resp = await fetch(file.downloadUrl);
        if (resp.ok) {
          const blob = await resp.blob();
          dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } catch (fetchErr) {
        console.warn(`[PDF Generator] No se pudo descargar archivo remoto ${file.name}:`, fetchErr);
      }
    }

    if (!dataUrl) {
      addFallbackNotePage(
        file,
        'No fue posible cargar el contenido binario del archivo para su renderizado directo. El documento se encuentra registrado y respaldado en el expediente clínico.'
      );
      continue;
    }

    const isPdf =
      file.type === 'application/pdf' ||
      dataUrl.startsWith('data:application/pdf') ||
      /\.pdf$/i.test(file.name || '');

    const isImg =
      !isPdf &&
      (file.type?.startsWith('image/') ||
        dataUrl.startsWith('data:image/') ||
        /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name || ''));

    if (isPdf) {
      try {
        const pdfBytes = dataUrlToUint8Array(dataUrl);
        const srcDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pageCount = srcDoc.getPageCount();

        if (pageCount === 0) {
          addFallbackNotePage(file, 'El archivo PDF adjunto no contiene páginas legibles.');
          continue;
        }

        const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());

        for (let pIdx = 0; pIdx < copiedPages.length; pIdx++) {
          const page = copiedPages[pIdx];
          const { width, height } = page.getSize();

          // Barra de encabezado superior con el nombre del documento como título
          page.drawRectangle({
            x: 0,
            y: height - 26,
            width: width,
            height: 26,
            color: paleSageBg,
          });
          page.drawLine({
            start: { x: 0, y: height - 26 },
            end: { x: width, y: height - 26 },
            thickness: 0.5,
            color: sageBorder,
          });

          const titleStr = `Anexo — Documento adjunto: ${file.name || 'Documento PDF'}${
            pageCount > 1 ? ` (Pág. ${pIdx + 1} de ${pageCount})` : ''
          }`;

          page.drawText(titleStr.slice(0, 95), {
            x: 18,
            y: height - 17,
            size: 8.5,
            font: helveticaBold,
            color: sageColor,
          });

          mergedPdf.addPage(page);
        }
      } catch (pdfErr: any) {
        console.warn(`[PDF Generator] Error al procesar PDF adjunto ${file.name}:`, pdfErr);
        addFallbackNotePage(
          file,
          `No se pudo anexar el PDF directamente (${pdfErr?.message || 'Formato o cifrado no soportado'}). El archivo original se conserva en el expediente.`
        );
      }
    } else if (isImg) {
      try {
        const { dataUrl: cleanDataUrl, format } = await ensurePngOrJpgDataUrl(dataUrl, file.type);
        const imgBytes = dataUrlToUint8Array(cleanDataUrl);

        let embeddedImage;
        if (format === 'jpg') {
          try {
            embeddedImage = await mergedPdf.embedJpg(imgBytes);
          } catch {
            embeddedImage = await mergedPdf.embedPng(imgBytes);
          }
        } else {
          try {
            embeddedImage = await mergedPdf.embedPng(imgBytes);
          } catch {
            embeddedImage = await mergedPdf.embedJpg(imgBytes);
          }
        }

        // Crear página A4 estándar para la imagen a tamaño legible
        const page = mergedPdf.addPage([595.28, 841.89]);
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const margin = 36;
        const availableW = pageWidth - margin * 2; // 523.28
        const availableH = pageHeight - margin * 2 - 34; // Espacio vertical bajo la cabecera

        // Banner de cabecera con el nombre del documento como título
        page.drawRectangle({
          x: margin,
          y: pageHeight - margin - 22,
          width: availableW,
          height: 22,
          color: paleSageBg,
          borderColor: sageBorder,
          borderWidth: 0.5,
        });

        const imgTitle = `Anexo — Documento adjunto: ${file.name || 'Imagen adjunta'}`;
        page.drawText(imgTitle.slice(0, 85), {
          x: margin + 10,
          y: pageHeight - margin - 14.5,
          size: 9,
          font: helveticaBold,
          color: sageColor,
        });

        // Calcular escalado proporcional manteniendo aspecto original
        const imgAspect = embeddedImage.width / embeddedImage.height;
        let renderW = availableW;
        let renderH = availableW / imgAspect;

        if (renderH > availableH) {
          renderH = availableH;
          renderW = availableH * imgAspect;
        }

        const renderX = margin + (availableW - renderW) / 2;
        const renderY = pageHeight - margin - 28 - renderH;

        // Dibujar marco sutil alrededor de la imagen
        page.drawRectangle({
          x: renderX - 1,
          y: renderY - 1,
          width: renderW + 2,
          height: renderH + 2,
          color: cardBg,
          borderColor: cardBorder,
          borderWidth: 0.5,
        });

        // Dibujar imagen
        page.drawImage(embeddedImage, {
          x: renderX,
          y: renderY,
          width: renderW,
          height: renderH,
        });
      } catch (imgErr: any) {
        console.warn(`[PDF Generator] Error al embeber imagen ${file.name}:`, imgErr);
        addFallbackNotePage(
          file,
          `No fue posible procesar la imagen para anexarla al PDF (${imgErr?.message || 'Error de imagen'}).`
        );
      }
    } else {
      addFallbackNotePage(
        file,
        `Tipo de archivo (${file.type || 'desconocido'}) registrado en el expediente clínico.`
      );
    }
  }

  return await mergedPdf.save();
}

/**
 * Generates the PDF as a Blob for uploading or sharing, including all attached documents
 */
export async function generatePatientQuestionnairePdfBlob(
  patient: FirestoreQuestionnaireDocument
): Promise<Blob> {
  console.log('[PDF Generator] Generando Blob de PDF completo con anexos para paciente:', patient.patientName);
  try {
    const pdfBytes = await generateCompletePatientPdfBytes(patient);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    console.log('[PDF Generator] Blob de PDF completo generado exitosamente. Tamaño:', blob.size, 'bytes');
    return blob;
  } catch (error) {
    console.error('[PDF Generator Error] Falló la generación del PDF con anexos, usando fallback base:', error);
    try {
      const baseDoc = generatePatientQuestionnairePdfDoc(patient);
      return baseDoc.output('blob');
    } catch (fallbackError) {
      console.error('[PDF Generator Error] Falló también el fallback de PDF Blob:', fallbackError);
      throw error;
    }
  }
}

/**
 * Downloads the complete medical record PDF directly in the browser (including all attached documents)
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

  console.log('[PDF Generator] Disparando descarga directa de PDF completo con anexos:', customFileName);
  try {
    const blob = await generatePatientQuestionnairePdfBlob(patient);
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = customFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
    console.log('[PDF Generator] Descarga iniciada con éxito en el navegador.');
  } catch (error) {
    console.error('[PDF Generator Error] Error al descargar PDF con anexos:', error);
    // Fallback: create base doc and save
    try {
      const doc = generatePatientQuestionnairePdfDoc(patient);
      doc.save(customFileName);
      console.log('[PDF Generator] Descarga completada vía fallback.');
    } catch (fallbackError) {
      console.error('[PDF Generator Error] Falló también el fallback de descarga:', fallbackError);
      throw fallbackError;
    }
  }
}
