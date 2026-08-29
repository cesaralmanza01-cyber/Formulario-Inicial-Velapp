import React, { useState, useRef } from 'react';
import {
  FirestoreQuestionnaireDocument,
  UploadedLabFile,
} from '../types';
import {
  User,
  HeartHandshake,
  Scale,
  Stethoscope,
  Activity,
  FileCheck2,
  AlertCircle,
  Download,
  Printer,
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  Pill,
  RotateCcw,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';
import { downloadPatientRecordPdf } from '../utils/pdfGenerator';
import { VelaLogo } from './VelaLogo';

interface DoctorPatientDetailProps {
  patient: FirestoreQuestionnaireDocument;
  onBackToList: () => void;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'No registrado';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export const DoctorPatientDetail: React.FC<DoctorPatientDetailProps> = ({
  patient,
  onBackToList,
}) => {
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await downloadPatientRecordPdf(patient, printableAreaRef.current);
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/50 shadow-sm space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E8E2D8] pb-4">
        <div className="space-y-1">
          <button
            onClick={onBackToList}
            className="lg:hidden text-xs text-[#5B887E] flex items-center gap-1 font-semibold mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Volver a lista
          </button>
          <h2
            className="text-xl sm:text-2xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            {patient.patientName || 'Paciente'}
          </h2>
          <p className="text-xs text-[#5C6E68]">
            {patient.identificacion?.documentType || 'CC'}: {patient.patientDocument || 'Sin documento'} •{' '}
            {patient.identificacion?.birthDate ? `Nacimiento: ${patient.identificacion.birthDate}` : ''}
            {patient.identificacion?.age ? ` (${patient.identificacion.age} años)` : ''} •{' '}
            {patient.identificacion?.civilStatus || 'Estado civil no esp.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={`px-3 py-1.5 rounded-full text-xs font-semibold shrink-0 ${
              patient.isSavedByPatient || patient.status === 'completado'
                ? 'bg-[#E5F7ED] text-[#1E7E48] border border-[#1E7E48]/20'
                : 'bg-[#FAF0E6] text-[#A2622D] border border-[#A2622D]/20'
            }`}
          >
            {patient.isSavedByPatient || patient.status === 'completado'
              ? '✓ Cuestionario Guardado y Enviado'
              : `En progreso (Paso ${patient.currentStep}/11)`}
          </span>

          <button
            id="btn-download-pdf"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="px-4 py-2 rounded-xl bg-[#5B887E] hover:bg-[#477369] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer disabled:opacity-50"
            title="Descargar reporte completo en formato PDF"
          >
            {isExportingPdf ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generando PDF...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Descargar PDF</span>
              </>
            )}
          </button>

          <button
            onClick={handlePrint}
            className="px-3 py-2 rounded-xl bg-[#FAF6F0] hover:bg-[#EBF3F0] text-[#2E3A36] border border-[#AEC9C0] text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Imprimir o guardar como PDF del sistema"
          >
            <Printer className="w-3.5 h-3.5 text-[#5B887E]" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
        </div>
      </div>

      {/* Printable Body Content */}
      <div ref={printableAreaRef} className="space-y-6 text-[#2E3A36]">
        {/* Printable Header (Visible only on print or export) */}
        <div className="hidden print:block border-b-2 border-[#5B887E] pb-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#5B887E]">VELA • HISTORIA CLÍNICA INICIAL</h1>
              <p className="text-xs text-[#5C6E68]">Manejo Médico e Integral del Sobrepeso y Obesidad • Dra. Lorena Castro</p>
            </div>
            <div className="text-right text-xs text-[#5C6E68]">
              <p>Paciente: <strong>{patient.patientName}</strong></p>
              <p>Doc: {patient.identificacion?.documentType || 'CC'} {patient.patientDocument}</p>
              <p>Fecha: {formatDate(patient.updatedAt)}</p>
            </div>
          </div>
        </div>

        {/* Clinical Red Flags Banner (Warm Coral #F2A488 Highlight) */}
        {patient.banderas_revisar && patient.banderas_revisar.length > 0 && (
          <div className="p-4 rounded-2xl bg-[#FFF8F6] border-2 border-[#F2A488] space-y-2.5">
            <div className="flex items-center gap-2 text-[#C66A4D] font-semibold text-xs sm:text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Puntos clínicos para revisar con atención en consulta ({patient.banderas_revisar.length})</span>
            </div>
            <div className="space-y-1.5">
              {patient.banderas_revisar.map((flag, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white border border-[#F2A488]/50 text-xs space-y-0.5">
                  <p className="font-semibold text-[#2E3A36]">
                    [{flag.category}] {flag.symptom}
                  </p>
                  <p className="text-[11px] text-[#5C6E68] italic">{flag.clinicalNote}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Identificación y Datos Generales */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> 1. Identificación y Datos Generales
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#2E3A36]">
            <div><strong>Nombre completo:</strong> {patient.identificacion?.fullName || patient.patientName || 'No especificado'}</div>
            <div><strong>Documento:</strong> {patient.identificacion?.documentType || 'CC'} {patient.patientDocument || 'No especificado'}</div>
            <div><strong>Fecha de nacimiento:</strong> {patient.identificacion?.birthDate || 'No especificada'} ({patient.identificacion?.age || '—'} años)</div>
            <div><strong>Ocupación:</strong> {patient.identificacion?.occupation || 'No especificada'}</div>
            <div><strong>Estado civil:</strong> {patient.identificacion?.civilStatus || 'No especificado'}</div>
            <div>
              <strong>Cómo nos conoció:</strong> {patient.identificacion?.referralSource || 'No especificado'}
              {patient.identificacion?.referralOtherDetails ? ` (${patient.identificacion.referralOtherDetails})` : ''}
            </div>
            <div><strong>Inicio del registro:</strong> {formatDate(patient.startedAt)}</div>
            <div><strong>Última actualización:</strong> {formatDate(patient.updatedAt)}</div>
            {patient.completedAt && (
              <div className="col-span-full font-semibold text-[#1E7E48]">
                <strong>Fecha de finalización:</strong> {formatDate(patient.completedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Motivo y Objetivos */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <HeartHandshake className="w-3.5 h-3.5" /> 2. Motivo y Objetivos de Consulta
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2.5 text-[#2E3A36]">
            <div>
              <span className="text-[#5C6E68] block font-medium">Motivo principal de consulta:</span>
              <p className="font-semibold text-sm mt-0.5">{patient.motivo_objetivos?.consultationReason || 'No especificado'}</p>
            </div>
            {patient.motivo_objetivos?.expectedGoals && (
              <div>
                <span className="text-[#5C6E68] block font-medium">Metas y expectativas que espera lograr:</span>
                <p className="mt-0.5">{patient.motivo_objetivos.expectedGoals}</p>
              </div>
            )}
            {patient.motivo_objetivos?.futureVision && (
              <div>
                <span className="text-[#5C6E68] block font-medium">Visión en 6 meses de su salud y bienestar:</span>
                <p className="mt-0.5 italic">"{patient.motivo_objetivos.futureVision}"</p>
              </div>
            )}
            {patient.motivo_objetivos?.currentObstacles && (
              <div>
                <span className="text-[#5C6E68] block font-medium">Obstáculos y desafíos actuales:</span>
                <p className="mt-0.5">{patient.motivo_objetivos.currentObstacles}</p>
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Historial y Relación con el Peso */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" /> 3. Historial y Relación con el Peso
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-3 text-[#2E3A36]">
            {/* Weight summary boxes */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
              <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] text-center">
                <span className="text-[10px] text-[#5C6E68] block uppercase">Peso actual</span>
                <span className="text-base font-bold text-[#5B887E]">
                  {patient.relacion_peso?.currentWeightKg ? `${patient.relacion_peso.currentWeightKg} kg` : '—'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] text-center">
                <span className="text-[10px] text-[#5C6E68] block uppercase">Estatura / Talla</span>
                <span className="text-base font-bold text-[#5B887E]">
                  {patient.relacion_peso?.heightCm ? `${patient.relacion_peso.heightCm} cm` : '—'}
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] text-center">
                <span className="text-[10px] text-[#5C6E68] block uppercase">Menor peso (+18)</span>
                <span className="text-sm font-semibold">
                  {patient.relacion_peso?.lowestWeightSince18Kg || patient.relacion_peso?.lowestWeightEver || '—'} kg
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-[#E8E2D8] text-center">
                <span className="text-[10px] text-[#5C6E68] block uppercase">Mayor peso (+18)</span>
                <span className="text-sm font-semibold">
                  {patient.relacion_peso?.highestWeightSince18Kg || patient.relacion_peso?.highestWeightEver || '—'} kg
                </span>
              </div>
            </div>

            {/* Weight Trajectory Milestones Timeline */}
            {patient.relacion_peso?.weightTrajectoryMilestones && patient.relacion_peso.weightTrajectoryMilestones.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <span className="font-semibold text-[#5B887E] text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Línea de tiempo de trayectoria de peso ({patient.relacion_peso.weightTrajectoryMilestones.length} momentos de vida):
                </span>
                <div className="space-y-1.5">
                  {patient.relacion_peso.weightTrajectoryMilestones.map((m) => (
                    <div key={m.id} className="p-2.5 rounded-xl bg-white border border-[#E8E2D8] space-y-1">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{m.stageOrAge}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-[#FAF6F0] border border-[#D9D3C8] text-[#5C6E68]">
                          {m.shiftType === 'subida' ? '↗️ Subida' : m.shiftType === 'bajada' ? '↘️ Bajada' : m.shiftType === 'rebote' ? '🔄 Rebote' : '⏸️ Estable'} {m.approxWeightOrChange ? `(${m.approxWeightOrChange})` : ''}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#5C6E68] italic">"{m.lifeContext}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Previous Attempts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#E8E2D8]">
              <div>
                <strong>Intentos previos:</strong> {patient.relacion_peso?.hasPreviousAttempts || 'No'}
                {patient.relacion_peso?.fluctuationCount ? ` (${patient.relacion_peso.fluctuationCount})` : ''}
              </div>
              <div>
                <strong>Velocidad de recuperación:</strong> {patient.relacion_peso?.regainSpeed || 'No especificada'}
              </div>
              {patient.relacion_peso?.previousMethods && patient.relacion_peso.previousMethods.length > 0 && (
                <div className="col-span-full">
                  <strong>Métodos utilizados:</strong> {patient.relacion_peso.previousMethods.join(', ')}
                </div>
              )}
              {patient.relacion_peso?.restrictiveDiets === 'Sí' && (
                <div className="col-span-full">
                  <strong>Dietas restrictivas:</strong> Sí {patient.relacion_peso.restrictiveDietsDetails ? `(${patient.relacion_peso.restrictiveDietsDetails})` : ''}
                </div>
              )}
            </div>

            {/* Weight medications & surgeries */}
            <div className="space-y-1.5 pt-1 border-t border-[#E8E2D8]">
              <div>
                <strong>Fármacos para control de peso:</strong> {patient.relacion_peso?.usedWeightMedications || 'No'}
                {patient.relacion_peso?.usedWeightMedications === 'Sí' && (
                  <div className="mt-1 pl-3 border-l-2 border-[#5B887E] space-y-0.5">
                    {patient.relacion_peso.weightMedicationsNames && <p>• Medicamentos: {patient.relacion_peso.weightMedicationsNames}</p>}
                    {patient.relacion_peso.weightMedicationsExperience && <p>• Experiencia: {patient.relacion_peso.weightMedicationsExperience}</p>}
                    {patient.relacion_peso.weightMedicationsAdverseEffects && <p>• Efectos adversos: {patient.relacion_peso.weightMedicationsAdverseEffects}</p>}
                  </div>
                )}
              </div>

              <div>
                <strong>Cirugía bariátrica:</strong> {patient.relacion_peso?.hadBariatricSurgery || 'No'}
                {patient.relacion_peso?.hadBariatricSurgery === 'Sí' && patient.relacion_peso.bariatricSurgeryTimeAgo && (
                  <span> ({patient.relacion_peso.bariatricSurgeryTimeAgo})</span>
                )}
              </div>

              <div>
                <strong>Cirugías estéticas (Lipo, etc.):</strong> {patient.relacion_peso?.hadAestheticSurgery || 'No'}
                {patient.relacion_peso?.hadAestheticSurgery === 'Sí' && (
                  <span> ({patient.relacion_peso.aestheticSurgeryDetails || 'Procedimiento estético'} - {patient.relacion_peso.aestheticSurgeryTimeAgo || ''})</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Mapa de Salud y Antecedentes Médicos */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <Stethoscope className="w-3.5 h-3.5" /> 4. Mapa de Salud y Antecedentes
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><strong>Patológicos:</strong> {patient.mapa_salud?.pathologicalHistory || patient.mapa_salud?.medicalHistory || 'Niega'}</div>
              <div><strong>Farmacológicos:</strong> {patient.mapa_salud?.pharmacologicalHistory || 'Niega'}</div>
              <div><strong>Quirúrgicos:</strong> {patient.mapa_salud?.surgicalHistory || 'Niega'}</div>
              <div><strong>Hospitalarios:</strong> {patient.mapa_salud?.hospitalHistory || 'Niega'}</div>
              <div><strong>Tóxico-Alérgicos:</strong> {patient.mapa_salud?.toxicAllergicHistory || 'Niega'}</div>
              <div>
                <strong>Antecedentes de TCA:</strong> {patient.mapa_salud?.hasEatingDisorderHistory || 'No'}
                {patient.mapa_salud?.hasEatingDisorderHistory === 'Sí' && patient.mapa_salud.eatingDisorderDetails ? ` (${patient.mapa_salud.eatingDisorderDetails})` : ''}
              </div>
            </div>

            {/* Gyneco-obstetric details */}
            {patient.mapa_salud?.appliesGynecoObstetric === 'Sí' && (
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-1">
                <div className="font-semibold text-[#5B887E] text-[11px]">Antecedentes Gineco-obstétricos:</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>Gestaciones (G): <strong>{patient.mapa_salud.pregnanciesCount || '0'}</strong></div>
                  <div>Partos (P): <strong>{patient.mapa_salud.vaginalDeliveriesCount || '0'}</strong></div>
                  <div>Cesáreas (C): <strong>{patient.mapa_salud.cesareanCount || '0'}</strong></div>
                  <div>Pérdidas (A): <strong>{patient.mapa_salud.lossesCount || '0'}</strong></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#FAF6F0]">
                  <div>Menarquía: {patient.mapa_salud.menarcheAge ? `${patient.mapa_salud.menarcheAge} años` : '—'}</div>
                  <div>Ciclos: {patient.mapa_salud.cycleRegularity || '—'} {patient.mapa_salud.cycleDuration ? `(${patient.mapa_salud.cycleDuration})` : ''}</div>
                  <div>Menopausia: {patient.mapa_salud.menopauseStage || 'No'}</div>
                </div>
              </div>
            )}

            {/* Family history */}
            {patient.mapa_salud?.familyHistory && patient.mapa_salud.familyHistory.length > 0 && (
              <div className="pt-1 border-t border-[#E8E2D8]">
                <strong>Antecedentes Familiares:</strong> {patient.mapa_salud.familyHistory.join(', ')}
                {patient.mapa_salud.familyHistoryNotes && <p className="italic text-[#5C6E68] mt-0.5">"{patient.mapa_salud.familyHistoryNotes}"</p>}
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Revisión por Sistemas y Síntomas */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> 5. Revisión por Sistemas y Síntomas
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
            {/* System Category Chips */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { label: 'General / Energía', data: patient.revision_sistemas?.general },
                { label: 'Cardiovascular', data: patient.revision_sistemas?.cardiovascular },
                { label: 'Respiratorio', data: patient.revision_sistemas?.respiratory },
                { label: 'Digestivo', data: patient.revision_sistemas?.digestive },
                { label: 'Piel y Hormonas', data: patient.revision_sistemas?.skinHairHormones },
                { label: 'Músculos y Articulaciones', data: patient.revision_sistemas?.musclesJoints },
                { label: 'Ánimo y Sueño', data: patient.revision_sistemas?.moodSleepMind },
              ].map((sys, idx) => (
                <div key={idx} className="p-2 bg-white rounded-xl border border-[#E8E2D8]">
                  <span className="font-semibold text-[#5B887E] block text-[11px]">{sys.label}:</span>
                  <span className="text-[11px]">
                    {sys.data?.hasNoSymptoms
                      ? 'Sin síntomas (Nada de esto)'
                      : sys.data?.selectedChips?.length
                      ? sys.data.selectedChips.join(', ')
                      : 'Sin registro'}
                  </span>
                </div>
              ))}
            </div>

            {/* Digestive Habits */}
            {patient.revision_sistemas?.digestiveHabits && (
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-1">
                <span className="font-semibold text-[#5B887E] block text-[11px]">Hábito Intestinal:</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  <div>Consistencia: <strong>{patient.revision_sistemas.digestiveHabits.stoolConsistency || '—'}</strong></div>
                  <div>Frecuencia: <strong>{patient.revision_sistemas.digestiveHabits.dailyBowelMovementCount || '—'}</strong></div>
                  <div>Dificultad: <strong>{patient.revision_sistemas.digestiveHabits.hasDifficultyDefecating || 'No'}</strong></div>
                </div>
                {patient.revision_sistemas.digestiveHabits.takesLaxatives && (
                  <div className="text-[11px]">
                    Uso de laxantes: <strong>{patient.revision_sistemas.digestiveHabits.takesLaxatives}</strong> {patient.revision_sistemas.digestiveHabits.laxativeDetails ? `(${patient.revision_sistemas.digestiveHabits.laxativeDetails})` : ''}
                  </div>
                )}
              </div>
            )}

            {/* Mood & Sleep */}
            {patient.revision_sistemas?.moodSleepHabits && (
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-1">
                <span className="font-semibold text-[#5B887E] block text-[11px]">Estrés, Sueño y Rutina Diaria:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div>Nivel de estrés (1-10): <strong className="text-[#C66A4D]">{patient.revision_sistemas.moodSleepHabits.stressLevel ?? '—'} / 10</strong></div>
                  <div>
                    Horario de descanso: <strong>{patient.revision_sistemas.moodSleepHabits.bedtime || '—'} a {patient.revision_sistemas.moodSleepHabits.wakeTime || '—'}</strong> ({patient.revision_sistemas.moodSleepHabits.calculatedSleepHours ?? '—'} horas)
                  </div>
                </div>
                {patient.revision_sistemas.moodSleepHabits.dailyRoutineDescription && (
                  <p className="text-[11px] text-[#5C6E68] italic pt-1 border-t border-[#FAF6F0]">
                    "{patient.revision_sistemas.moodSleepHabits.dailyRoutineDescription}"
                  </p>
                )}
              </div>
            )}

            {patient.revision_sistemas?.additionalNotes && (
              <p className="italic text-[#5C6E68] pt-1">
                <strong>Notas adicionales:</strong> "{patient.revision_sistemas.additionalNotes}"
              </p>
            )}
          </div>
        </div>

        {/* Section 6: Entrevista Dietética y Nutrición */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" /> 6. Entrevista Nutricional y Hábitos de Alimentación
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><strong>Alimentos preferidos:</strong> {patient.entrevista_dietetica?.favoriteFoods || '—'}</div>
              <div><strong>Alimentos que menos le gustan:</strong> {patient.entrevista_dietetica?.dislikedFoods || '—'}</div>
              <div>
                <strong>Restricciones e intolerancias:</strong> {patient.entrevista_dietetica?.dietaryRestrictions?.join(', ') || 'Ninguna'}
                {patient.entrevista_dietetica?.dietaryRestrictionsOther ? ` (${patient.entrevista_dietetica.dietaryRestrictionsOther})` : ''}
                {patient.entrevista_dietetica?.dietaryAllergiesDetails ? ` (Alergia: ${patient.entrevista_dietetica.dietaryAllergiesDetails})` : ''}
              </div>
              <div><strong>Preparación de comidas:</strong> {patient.entrevista_dietetica?.mealPreparationStyle || '—'}</div>
              <div><strong>Frecuencia comer por fuera:</strong> {patient.entrevista_dietetica?.eatingOutFrequency || '—'}</div>
              <div>
                <strong>Suplementación:</strong> {patient.entrevista_dietetica?.takesSupplements || 'No'}
                {patient.entrevista_dietetica?.takesSupplements === 'Sí' && patient.entrevista_dietetica.supplementDetails ? ` (${patient.entrevista_dietetica.supplementDetails})` : ''}
              </div>
            </div>

            {/* Daily Meals Timeline */}
            {patient.entrevista_dietetica?.dailyMealsTimeline && patient.entrevista_dietetica.dailyMealsTimeline.length > 0 && (
              <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-1.5">
                <span className="font-semibold text-[#5B887E] text-[11px] block">
                  Diario de comidas de un día ({patient.entrevista_dietetica.dailyMealsTimeline.length} momentos):
                </span>
                <div className="space-y-1">
                  {patient.entrevista_dietetica.dailyMealsTimeline.map((meal, idx) => (
                    <div key={meal.id || idx} className="flex items-start justify-between gap-2 border-b border-[#FAF6F0] pb-1 last:border-0 last:pb-0">
                      <span className="font-semibold text-[#2E3A36] shrink-0">
                        {meal.name} ({meal.time}):
                      </span>
                      <span className="text-[#5C6E68] text-right">
                        {meal.foodAndDrinks} {meal.location ? `• ${meal.location}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weak Spots */}
            {patient.entrevista_dietetica?.nutritionWeakSpots && patient.entrevista_dietetica.nutritionWeakSpots.length > 0 && (
              <div className="pt-1 border-t border-[#E8E2D8]">
                <strong className="text-[#C66A4D]">Puntos débiles identificados:</strong> {patient.entrevista_dietetica.nutritionWeakSpots.join(', ')}
                {patient.entrevista_dietetica.nutritionWeakSpotsNotes && (
                  <p className="italic text-[#5C6E68] mt-0.5">"{patient.entrevista_dietetica.nutritionWeakSpotsNotes}"</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section 7: Movimiento y Actividad Física */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> 7. Movimiento y Actividad Física
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div><strong>Actividad diaria laboral:</strong> {patient.actividad_fisica?.dailyActivityType || '—'}</div>
              <div><strong>Uso de escaleras:</strong> {patient.actividad_fisica?.takesStairsFrequency || '—'}</div>
              <div><strong>Caminar como transporte:</strong> {patient.actividad_fisica?.walksForTransport || '—'}</div>
              <div><strong>Horas sentada al día:</strong> {patient.actividad_fisica?.dailySittingHours || '—'}</div>
              {patient.actividad_fisica?.dailyStepsApprox && (
                <div><strong>Pasos diarios aprox:</strong> {patient.actividad_fisica.dailyStepsApprox} pasos</div>
              )}
            </div>

            {/* Structured Exercise */}
            <div className="p-3 bg-white rounded-xl border border-[#E8E2D8] space-y-1">
              <span className="font-semibold text-[#5B887E] text-[11px] block">Ejercicio Estructurado:</span>
              <div>¿Hace ejercicio actualmente?: <strong>{patient.actividad_fisica?.doesStructuredExercise || 'No'}</strong></div>
              {patient.actividad_fisica?.doesStructuredExercise === 'Sí' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 border-t border-[#FAF6F0]">
                  <div>Tipos: {patient.actividad_fisica.exerciseTypes?.join(', ') || '—'}</div>
                  <div>Frecuencia: {patient.actividad_fisica.exerciseWeeklyFrequency || '—'} ({patient.actividad_fisica.exerciseSessionDuration || '—'})</div>
                  <div>Intensidad: {patient.actividad_fisica.exerciseIntensity || '—'}</div>
                </div>
              )}
            </div>

            {/* Motivation & Barriers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[#E8E2D8]">
              <div>Motivación ejercicio estructurado: <strong className="text-[#5B887E]">{patient.actividad_fisica?.motivationStructuredExercise ?? '—'} / 5</strong></div>
              <div>Motivación movimiento cotidiano: <strong className="text-[#C66A4D]">{patient.actividad_fisica?.motivationDailyMovement ?? '—'} / 5</strong></div>
              {patient.actividad_fisica?.movementBarriersOrConcerns && (
                <div className="col-span-full">
                  <strong>Barreras o preocupaciones:</strong> <span className="italic text-[#5C6E68]">"{patient.actividad_fisica.movementBarriersOrConcerns}"</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 9: Paraclínicos y Exámenes de Laboratorio */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <FileCheck2 className="w-3.5 h-3.5" /> 9. Exámenes de Laboratorio
            </span>
            <span className="text-[11px] font-normal text-[#5C6E68]">
              ¿Tiene exámenes?: <strong>{patient.paraclinicos?.hasRecentLabs || 'No'}</strong>
            </span>
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
            {patient.paraclinicos?.notesOrFindings && (
              <p className="italic text-[#5C6E68]">
                <strong>Notas sobre resultados:</strong> "{patient.paraclinicos.notesOrFindings}"
              </p>
            )}
            {patient.paraclinicos?.files && patient.paraclinicos.files.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#2E3A36]">
                  Archivos de laboratorio adjuntados ({patient.paraclinicos.files.length}):
                </span>
                {patient.paraclinicos.files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-xl bg-white border border-[#D9D3C8] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2E3A36] truncate">{file.name}</p>
                      <p className="text-[10px] text-[#8E9E99]">{file.description || 'Sin descripción'}</p>
                    </div>
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#5B887E] hover:bg-[#477369] text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Ver / Descargar
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#8E9E99] italic">Cargado localmente</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#8E9E99] text-[11px]">No se adjuntaron paraclínicos recientes.</p>
            )}
          </div>
        </div>

        {/* Section 10: Registro InBody / Composición Corporal */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> 10. Registro InBody / Bioimpedancia
            </span>
            <span className="text-[11px] font-normal text-[#5C6E68]">
              ¿Tiene reporte?: <strong>{patient.inbody?.hasInBodyReport || 'No'}</strong>
            </span>
          </h3>
          <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-3 text-[#2E3A36]">
            {/* Extracted InBody Metrics Grid */}
            {patient.inbody?.extractedMetrics && (
              <div className="p-3.5 rounded-xl bg-white border-2 border-[#AEC9C0] shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-1.5">
                  <span className="font-bold text-[#5B887E] text-[11px] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Parámetros InBody Extraídos Automáticamente:
                  </span>
                  {patient.inbody.extractedMetrics.fechaExamen && (
                    <span className="text-[10px] text-[#5C6E68]">
                      Fecha: {patient.inbody.extractedMetrics.fechaExamen}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {patient.inbody.extractedMetrics.pesoKg != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Peso</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.pesoKg} kg</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.tallaCm != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Talla</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.tallaCm} cm</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.porcentajeGrasaCorporal != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#C66A4D]">% Grasa</p>
                      <p className="font-bold text-[#C66A4D] text-xs">{patient.inbody.extractedMetrics.porcentajeGrasaCorporal}%</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.masaGrasaCorporalKg != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Masa Grasa</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.masaGrasaCorporalKg} kg</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.masaMuscularEsqueleticaKg != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#5B887E]">Masa Muscular</p>
                      <p className="font-bold text-[#5B887E] text-xs">{patient.inbody.extractedMetrics.masaMuscularEsqueleticaKg} kg</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.masaLibreDeGrasaKg != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Masa Libre Grasa</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.masaLibreDeGrasaKg} kg</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.nivelGrasaVisceral != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#C66A4D]">Grasa Visceral</p>
                      <p className="font-bold text-[#C66A4D] text-xs">Nivel {patient.inbody.extractedMetrics.nivelGrasaVisceral}</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.aguaCorporalTotalLt != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Agua Total</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.aguaCorporalTotalLt} L</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.imc != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">IMC</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.imc} kg/m²</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.tasaMetabolicaBasalKcal != null && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0]">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">TMB</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.tasaMetabolicaBasalKcal} kcal</p>
                    </div>
                  )}
                  {patient.inbody.extractedMetrics.modeloEquipo && (
                    <div className="p-2 rounded-lg bg-[#FAF6F0] col-span-2">
                      <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Equipo</p>
                      <p className="font-bold text-[#2E3A36] text-xs">{patient.inbody.extractedMetrics.modeloEquipo}</p>
                    </div>
                  )}
                </div>

                {patient.inbody.extractedMetrics.observacionesClinicas && (
                  <p className="text-[11px] text-[#5C6E68] italic pt-1 border-t border-[#E8E2D8]">
                    "{patient.inbody.extractedMetrics.observacionesClinicas}"
                  </p>
                )}
              </div>
            )}

            {patient.inbody?.knownMetrics && (
              <p><strong>Métricas reportadas por la paciente:</strong> {patient.inbody.knownMetrics}</p>
            )}
            {patient.inbody?.notesOrGoals && (
              <p className="italic text-[#5C6E68]">"{patient.inbody.notesOrGoals}"</p>
            )}

            {/* InBody Files List */}
            {patient.inbody?.files && patient.inbody.files.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-[#2E3A36]">
                  Reportes InBody adjuntos ({patient.inbody.files.length}):
                </span>
                {patient.inbody.files.map((file) => (
                  <div
                    key={file.id}
                    className="p-2.5 rounded-xl bg-white border border-[#D9D3C8] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[#2E3A36] truncate">{file.name}</p>
                      <p className="text-[10px] text-[#8E9E99]">{file.description || 'Sin notas'}</p>
                    </div>
                    {file.downloadUrl ? (
                      <a
                        href={file.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-[#5B887E] hover:bg-[#477369] text-white text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" /> Ver / Descargar
                      </a>
                    ) : (
                      <span className="text-[10px] text-[#8E9E99] italic">Cargado localmente</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[#8E9E99] text-[11px]">No se adjuntó reporte de InBody.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
