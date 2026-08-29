import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle2,
  User,
  Calendar,
  Briefcase,
  Heart,
  Compass,
  Sparkles,
  Scale,
  RotateCcw,
  Pill,
  Activity,
  ArrowRight,
  X,
  Edit3,
  Mountain,
  Target,
  Clock,
  AlertTriangle,
  FileText,
  ShieldAlert,
} from 'lucide-react';
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
import { VelaIcon } from './VelaIcon';
import { evaluateClinicalRedFlags } from '../utils/clinicalFlags';

interface StepCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEditStep?: (step: number) => void;
  step1Data: PatientBasicInfo | null;
  step2Data: PatientMotivationInfo | null;
  step3Data: PatientWeightHistoryInfo | null;
  step4Data: PatientHealthMapInfo | null;
  step5Data?: PatientBodySymptomsInfo | null;
  step6Data?: PatientNutritionInfo | null;
  step7Data?: PatientPhysicalActivityInfo | null;
  step9Data?: PatientLabExamsInfo | null;
  stepInBodyData?: PatientInBodyInfo | null;
}

export const StepCompletionModal: React.FC<StepCompletionModalProps> = ({
  isOpen,
  onClose,
  onEditStep,
  step1Data,
  step2Data,
  step3Data,
  step4Data,
  step5Data,
  step6Data,
  step7Data,
  step9Data,
  stepInBodyData,
}) => {
  if (
    !isOpen ||
    (!step1Data &&
      !step2Data &&
      !step3Data &&
      !step4Data &&
      !step5Data &&
      !step6Data &&
      !step7Data &&
      !step9Data &&
      !stepInBodyData)
  )
    return null;

  const firstName = step1Data?.fullName ? step1Data.fullName.split(' ')[0] : 'Paciente';
  const redFlagsReport = evaluateClinicalRedFlags(step5Data);

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#2E3A36]/40 backdrop-blur-xs overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="w-full max-w-lg bg-[#FAF6F0] rounded-3xl border border-[#AEC9C0]/50 shadow-2xl p-6 sm:p-8 space-y-6 relative overflow-hidden my-6"
        >
          {/* Subtle background watermark */}
          <div className="absolute -right-8 -bottom-8 opacity-5 pointer-events-none">
            <VelaIcon size={200} />
          </div>

          <button
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="absolute top-5 right-5 p-2 rounded-full text-[#5C6E68] hover:bg-[#EBF3F0] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Icon & Heading */}
          <div className="flex flex-col items-center text-center space-y-3 pt-2">
            <div className="w-16 h-16 rounded-full bg-[#EBF3F0] border border-[#AEC9C0]/60 flex items-center justify-center text-[#5B887E] shadow-xs">
              <CheckCircle2 className="w-8 h-8 text-[#6E9E93]" />
            </div>

            <h3
              className="text-2xl sm:text-3xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              ¡Pantalla 5 completada!
            </h3>

            <p className="text-sm text-[#5C6E68] max-w-sm">
              Gracias, <strong className="text-[#2E3A36]">{firstName}</strong>. Hemos registrado
              la revisión de sensaciones y síntomas de tu cuerpo de manera confidencial.
            </p>
          </div>

          {/* Summary Sections */}
          <div className="space-y-3.5 max-h-[52vh] overflow-y-auto pr-1">
            {/* Step 5 Summary */}
            {step5Data && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#AEC9C0]/30 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-1 border-b border-[#FAF6F0]">
                  <span className="font-semibold text-[#5B887E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    Paso 5: ¿Cómo se siente tu cuerpo?
                  </span>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(5);
                      }}
                      className="text-[11px] text-[#6E9E93] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  {/* Category chips summary */}
                  {[
                    { key: 'general', label: 'General', data: step5Data.general },
                    { key: 'cardiovascular', label: 'Cardiovascular', data: step5Data.cardiovascular },
                    { key: 'respiratory', label: 'Respiratorio', data: step5Data.respiratory },
                    { key: 'digestive', label: 'Digestivo', data: step5Data.digestive },
                    { key: 'skinHairHormones', label: 'Piel y hormonas', data: step5Data.skinHairHormones },
                    { key: 'musclesJoints', label: 'Músculos y artic.', data: step5Data.musclesJoints },
                    { key: 'moodSleepMind', label: 'Ánimo y mente', data: step5Data.moodSleepMind },
                  ].map((item) => (
                    <div key={item.key} className="flex justify-between items-start gap-2 py-0.5 border-b border-[#FAF6F0]/80">
                      <span className="text-[#5C6E68] shrink-0">{item.label}:</span>
                      <span className="font-medium text-[#2E3A36] text-right text-[11px]">
                        {item.data?.hasNoSymptoms
                          ? 'Sin síntomas (Nada de esto)'
                          : item.data?.selectedChips?.length
                          ? item.data.selectedChips.join(', ')
                          : 'Sin registrar'}
                      </span>
                    </div>
                  ))}

                  {/* Digestive Habits details */}
                  {step5Data.digestiveHabits && (
                    <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl mt-1.5 space-y-1 text-[11px]">
                      <div className="font-semibold text-[#5B887E]">Hábito intestinal:</div>
                      {step5Data.digestiveHabits.stoolConsistency && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Consistencia heces:</span>
                          <span className="font-medium text-[#2E3A36]">{step5Data.digestiveHabits.stoolConsistency}</span>
                        </div>
                      )}
                      {step5Data.digestiveHabits.dailyBowelMovementCount && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Frecuencia:</span>
                          <span className="font-medium text-[#2E3A36]">{step5Data.digestiveHabits.dailyBowelMovementCount}</span>
                        </div>
                      )}
                      {step5Data.digestiveHabits.hasDifficultyDefecating && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Dificultad o esfuerzo:</span>
                          <span className="font-medium text-[#2E3A36]">{step5Data.digestiveHabits.hasDifficultyDefecating}</span>
                        </div>
                      )}
                      {step5Data.digestiveHabits.takesLaxatives && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Uso de laxantes:</span>
                          <span className="font-medium text-[#2E3A36]">
                            {step5Data.digestiveHabits.takesLaxatives}
                            {step5Data.digestiveHabits.laxativeDetails ? ` (${step5Data.digestiveHabits.laxativeDetails})` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mood & Sleep details */}
                  {step5Data.moodSleepHabits && (
                    <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl mt-1.5 space-y-1 text-[11px]">
                      <div className="font-semibold text-[#5B887E]">Estrés, sueño y rutina:</div>
                      {step5Data.moodSleepHabits.stressLevel !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Nivel de estrés:</span>
                          <span className="font-semibold text-[#C66A4D]">{step5Data.moodSleepHabits.stressLevel} / 10</span>
                        </div>
                      )}
                      {step5Data.moodSleepHabits.bedtime && step5Data.moodSleepHabits.wakeTime && (
                        <div className="flex justify-between">
                          <span className="text-[#5C6E68]">Horario de descanso:</span>
                          <span className="font-medium text-[#2E3A36]">
                            {step5Data.moodSleepHabits.bedtime} a {step5Data.moodSleepHabits.wakeTime} ({step5Data.moodSleepHabits.calculatedSleepHours || 0}h sueño)
                          </span>
                        </div>
                      )}
                      {step5Data.moodSleepHabits.dailyRoutineDescription && (
                        <div className="pt-1">
                          <span className="text-[#5C6E68]">Día cotidiano:</span>
                          <p className="text-[#2E3A36] italic mt-0.5">"{step5Data.moodSleepHabits.dailyRoutineDescription}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  {step5Data.additionalNotes && (
                    <div className="bg-[#FAF6F0]/80 p-2 rounded-xl mt-1 space-y-0.5">
                      <span className="text-[#5C6E68] text-[11px] font-medium">Notas adicionales:</span>
                      <p className="text-[#2E3A36] italic text-xs">"{step5Data.additionalNotes}"</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 6 Summary */}
            {step6Data && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E2D8] space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs font-bold">
                      6
                    </div>
                    <span className="font-semibold text-xs text-[#2E3A36]">
                      Hablemos de tu alimentación
                    </span>
                  </div>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(6);
                      }}
                      className="text-xs text-[#5B887E] hover:text-[#2E3A36] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* Preferences */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Preferencias e intolerancias:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Más te gustan:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step6Data.favoriteFoods || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Menos te gustan:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step6Data.dislikedFoods || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Restricciones:</span>
                      <span className="font-medium text-[#2E3A36] text-right">
                        {step6Data.dietaryRestrictions?.join(', ') || 'Ninguna'}
                        {step6Data.dietaryRestrictionsOther ? ` (${step6Data.dietaryRestrictionsOther})` : ''}
                        {step6Data.dietaryAllergiesDetails ? ` (Alergia: ${step6Data.dietaryAllergiesDetails})` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Meals timeline count & summary */}
                  {step6Data.dailyMealsTimeline && step6Data.dailyMealsTimeline.length > 0 && (
                    <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1.5 text-[11px]">
                      <div className="font-semibold text-[#5B887E]">
                        Diario de un día ({step6Data.dailyMealsTimeline.length} momentos registrados):
                      </div>
                      <div className="space-y-1">
                        {step6Data.dailyMealsTimeline.map((meal, idx) => (
                          <div key={meal.id || idx} className="flex items-start justify-between gap-2 border-b border-[#E8E2D8]/50 pb-1 last:border-0 last:pb-0">
                            <span className="font-medium text-[#2E3A36]">
                              {meal.name} ({meal.time}):
                            </span>
                            <span className="text-[#5C6E68] text-right max-w-[60%] truncate">
                              {meal.foodAndDrinks || 'Sin registrar'} {meal.location ? `• ${meal.location}` : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Daily habits & logistics */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Logística y frecuencia:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Resolución de comidas:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step6Data.mealPreparationStyle || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Comer por fuera:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step6Data.eatingOutFrequency || '—'}</span>
                    </div>
                  </div>

                  {/* Weak spots */}
                  {step6Data.nutritionWeakSpots && step6Data.nutritionWeakSpots.length > 0 && (
                    <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                      <div className="font-semibold text-[#C66A4D]">Puntos débiles identificados:</div>
                      <p className="text-[#2E3A36]">
                        {step6Data.nutritionWeakSpots.join(', ')}
                        {step6Data.nutritionWeakSpotsOther ? ` (${step6Data.nutritionWeakSpotsOther})` : ''}
                      </p>
                      {step6Data.nutritionWeakSpotsNotes && (
                        <p className="italic text-[#5C6E68] mt-1">"{step6Data.nutritionWeakSpotsNotes}"</p>
                      )}
                    </div>
                  )}

                  {/* Supplements */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Suplementación:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">¿Toma suplementos?:</span>
                      <span className="font-medium text-[#2E3A36]">{step6Data.takesSupplements || 'No'}</span>
                    </div>
                    {step6Data.takesSupplements === 'Sí' && step6Data.supplementDetails && (
                      <p className="text-[#2E3A36] pt-0.5">
                        <span className="text-[#5C6E68]">Detalles:</span> {step6Data.supplementDetails}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 7 Summary */}
            {step7Data && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E2D8] space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs font-bold">
                      7
                    </div>
                    <span className="font-semibold text-xs text-[#2E3A36]">
                      ¿Cómo te mueves en tu día a día?
                    </span>
                  </div>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(7);
                      }}
                      className="text-xs text-[#5B887E] hover:text-[#2E3A36] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  {/* Daily Movement / NEAT */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Movimiento cotidiano:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Actividad principal:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step7Data.dailyActivityType || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Uso de escaleras:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step7Data.takesStairsFrequency || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Caminar como transporte:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step7Data.walksForTransport || '—'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Tiempo sentada al día:</span>
                      <span className="font-medium text-[#2E3A36] text-right">{step7Data.dailySittingHours || '—'}</span>
                    </div>
                    {step7Data.dailyStepsApprox && (
                      <div className="flex justify-between gap-2">
                        <span className="text-[#5C6E68]">Pasos diarios aprox:</span>
                        <span className="font-medium text-[#2E3A36] text-right">{step7Data.dailyStepsApprox} pasos</span>
                      </div>
                    )}
                  </div>

                  {/* Structured Exercise */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Ejercicio estructurado:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">¿Hace ejercicio actualmente?:</span>
                      <span className="font-medium text-[#2E3A36]">{step7Data.doesStructuredExercise || 'No'}</span>
                    </div>
                    {step7Data.doesStructuredExercise === 'Sí' && (
                      <>
                        <div className="flex justify-between gap-2 pt-0.5">
                          <span className="text-[#5C6E68]">Tipo de ejercicio:</span>
                          <span className="font-medium text-[#2E3A36] text-right">
                            {step7Data.exerciseTypes?.join(', ') || '—'}
                            {step7Data.exerciseTypesOther ? ` (${step7Data.exerciseTypesOther})` : ''}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#5C6E68]">Frecuencia y duración:</span>
                          <span className="font-medium text-[#2E3A36] text-right">
                            {step7Data.exerciseWeeklyFrequency || '—'} • {step7Data.exerciseSessionDuration || '—'}
                          </span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-[#5C6E68]">Intensidad:</span>
                          <span className="font-medium text-[#2E3A36] text-right">{step7Data.exerciseIntensity || '—'}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Motivation */}
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="font-semibold text-[#5B887E]">Motivación y barreras:</div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Motivación ejercicio estructurado:</span>
                      <span className="font-bold text-[#5B887E]">{step7Data.motivationStructuredExercise || 3} / 5</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">Motivación movimiento diario:</span>
                      <span className="font-bold text-[#C66A4D]">{step7Data.motivationDailyMovement || 4} / 5</span>
                    </div>
                    {step7Data.movementBarriersOrConcerns && (
                      <div className="pt-1 border-t border-[#E8E2D8]/50">
                        <span className="text-[#5C6E68]">Freno o preocupaciones:</span>
                        <p className="text-[#2E3A36] italic mt-0.5">"{step7Data.movementBarriersOrConcerns}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 9 Summary */}
            {step9Data && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E2D8] space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs font-bold">
                      9
                    </div>
                    <span className="font-semibold text-xs text-[#2E3A36]">
                      Exámenes de laboratorio recientes
                    </span>
                  </div>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(9);
                      }}
                      className="text-xs text-[#5B887E] hover:text-[#2E3A36] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">¿Tiene exámenes del último año?:</span>
                      <span className="font-medium text-[#2E3A36]">{step9Data.hasRecentLabs || 'No'}</span>
                    </div>

                    {step9Data.hasRecentLabs === 'Sí' && step9Data.files && step9Data.files.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[#5B887E] font-semibold">
                          Archivos adjuntados ({step9Data.files.length}):
                        </span>
                        <div className="space-y-1">
                          {step9Data.files.map((file) => (
                            <div key={file.id} className="p-1.5 rounded-lg bg-white border border-[#E8E2D8] flex items-start justify-between gap-2">
                              <span className="font-medium text-[#2E3A36] truncate">{file.name}</span>
                              <span className="text-[#5C6E68] text-right text-[10px] shrink-0">
                                {file.description || 'Sin notas'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {step9Data.notesOrFindings && (
                      <div className="pt-1 border-t border-[#E8E2D8]/50 mt-1">
                        <span className="text-[#5C6E68]">Notas sobre resultados:</span>
                        <p className="text-[#2E3A36] italic mt-0.5">"{step9Data.notesOrFindings}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 10 InBody Summary */}
            {stepInBodyData && (
              <div className="bg-white rounded-2xl p-4 border border-[#E8E2D8] space-y-3">
                <div className="flex items-center justify-between border-b border-[#FAF6F0] pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center text-xs font-bold">
                      10
                    </div>
                    <span className="font-semibold text-xs text-[#2E3A36]">
                      Registro InBody / Composición corporal
                    </span>
                  </div>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(10);
                      }}
                      className="text-xs text-[#5B887E] hover:text-[#2E3A36] flex items-center gap-1 font-medium cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>

                <div className="space-y-2 text-xs">
                  <div className="bg-[#FAF6F0]/80 p-2.5 rounded-xl space-y-1 text-[11px]">
                    <div className="flex justify-between gap-2">
                      <span className="text-[#5C6E68]">¿Tiene registro InBody?:</span>
                      <span className="font-medium text-[#2E3A36]">{stepInBodyData.hasInBodyReport || 'No'}</span>
                    </div>

                    {stepInBodyData.hasInBodyReport === 'Sí' && stepInBodyData.files && stepInBodyData.files.length > 0 && (
                      <div className="pt-1 space-y-1">
                        <span className="text-[#5B887E] font-semibold">
                          Archivos adjuntados ({stepInBodyData.files.length}):
                        </span>
                        <div className="space-y-1">
                          {stepInBodyData.files.map((file) => (
                            <div key={file.id} className="p-1.5 rounded-lg bg-white border border-[#E8E2D8] flex items-start justify-between gap-2">
                              <span className="font-medium text-[#2E3A36] truncate">{file.name}</span>
                              <span className="text-[#5C6E68] text-right text-[10px] shrink-0">
                                {file.description || 'Sin notas'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {stepInBodyData.extractedMetrics && (
                      <div className="p-2.5 rounded-xl bg-white border border-[#AEC9C0] mt-1.5 space-y-1.5">
                        <span className="text-[11px] font-bold text-[#5B887E]">
                          Parámetros InBody extraídos:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                          {stepInBodyData.extractedMetrics.pesoKg != null && (
                            <div><span className="text-[#8E9E99]">Peso:</span> <strong className="text-[#2E3A36]">{stepInBodyData.extractedMetrics.pesoKg} kg</strong></div>
                          )}
                          {stepInBodyData.extractedMetrics.porcentajeGrasaCorporal != null && (
                            <div><span className="text-[#8E9E99]">% Grasa:</span> <strong className="text-[#C66A4D]">{stepInBodyData.extractedMetrics.porcentajeGrasaCorporal}%</strong></div>
                          )}
                          {stepInBodyData.extractedMetrics.masaMuscularEsqueleticaKg != null && (
                            <div><span className="text-[#8E9E99]">Masa Muscular:</span> <strong className="text-[#5B887E]">{stepInBodyData.extractedMetrics.masaMuscularEsqueleticaKg} kg</strong></div>
                          )}
                          {stepInBodyData.extractedMetrics.nivelGrasaVisceral != null && (
                            <div><span className="text-[#8E9E99]">Grasa Visceral:</span> <strong className="text-[#C66A4D]">Nivel {stepInBodyData.extractedMetrics.nivelGrasaVisceral}</strong></div>
                          )}
                        </div>
                      </div>
                    )}

                    {stepInBodyData.knownMetrics && (
                      <div className="pt-1 border-t border-[#E8E2D8]/50 mt-1">
                        <span className="text-[#5C6E68]">Datos / métricas conocidas:</span>
                        <p className="text-[#2E3A36] font-medium mt-0.5">{stepInBodyData.knownMetrics}</p>
                      </div>
                    )}

                    {stepInBodyData.notesOrGoals && (
                      <div className="pt-1 border-t border-[#E8E2D8]/50 mt-1">
                        <span className="text-[#5C6E68]">Comentarios adicionales:</span>
                        <p className="text-[#2E3A36] italic mt-0.5">"{stepInBodyData.notesOrGoals}"</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Doctor-only Red Flags clinical report */}
            {redFlagsReport.hasRedFlags && (
              <div className="bg-[#FFF8F6] rounded-2xl p-4 border border-[#F2A488] space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-[#C66A4D] font-semibold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Reporte clínico médico: Bandera roja — revisar con atención</span>
                </div>
                <p className="text-[11px] text-[#5C6E68]">
                  (Nota interna para la Dra. Lorena Castro en la consulta clínica)
                </p>
                <div className="space-y-1.5 pt-1">
                  {redFlagsReport.flags.map((flag) => (
                    <div key={flag.id} className="p-2 rounded-xl bg-white border border-[#F2A488]/40 space-y-0.5">
                      <div className="font-semibold text-[#C66A4D] text-[11px]">
                        {flag.symptom}
                      </div>
                      <div className="text-[11px] text-[#5C6E68]">
                        {flag.clinicalNote}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4 Summary */}
            {step4Data && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#AEC9C0]/30 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-1 border-b border-[#FAF6F0]">
                  <span className="font-semibold text-[#5B887E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    Paso 4: Tu mapa de salud
                  </span>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(4);
                      }}
                      className="text-[11px] text-[#6E9E93] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#5C6E68]">Patológicos:</span>
                    <span className="font-medium text-[#2E3A36] text-right truncate max-w-[200px]">
                      {step4Data.pathologicalHistory}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5C6E68]">Medicamentos:</span>
                    <span className="font-medium text-[#2E3A36] text-right truncate max-w-[200px]">
                      {step4Data.pharmacologicalHistory}
                    </span>
                  </div>
                  {step4Data.appliesGynecoObstetric === 'Sí' && (
                    <div className="bg-[#FAF6F0]/80 p-2 rounded-xl space-y-1 text-[11px]">
                      <div className="flex justify-between text-[#5B887E] font-semibold">
                        <span>Gineco-obstétricos:</span>
                        <span>
                          G:{step4Data.pregnanciesCount || '0'} P:{step4Data.vaginalDeliveriesCount || '0'} C:{step4Data.cesareanCount || '0'} A:{step4Data.lossesCount || '0'}
                        </span>
                      </div>
                      <div className="flex justify-between text-[#5C6E68]">
                        <span>Desarrollo / Menarquía:</span>
                        <span className="font-medium text-[#2E3A36]">{step4Data.menarcheAge ? `${step4Data.menarcheAge} años` : '-'}</span>
                      </div>
                      <div className="flex justify-between text-[#5C6E68]">
                        <span>Ciclos:</span>
                        <span className="font-medium text-[#2E3A36]">{step4Data.cycleRegularity || '-'}</span>
                      </div>
                      {step4Data.cycleDuration && (
                        <div className="flex justify-between text-[#5C6E68]">
                          <span>Duración:</span>
                          <span className="font-medium text-[#2E3A36] truncate max-w-[180px]">{step4Data.cycleDuration}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-[#5C6E68]">
                        <span>Climaterio:</span>
                        <span className="font-medium text-[#2E3A36]">{step4Data.menopauseStage || 'No'}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#5C6E68]">Antecedentes familiares:</span>
                    <span className="font-medium text-[#2E3A36] text-right">
                      {step4Data.familyHistory?.length > 0
                        ? step4Data.familyHistory.join(', ')
                        : 'Sin antecedentes marcados'}
                    </span>
                  </div>
                </div>
              </div>
            )}
            {/* Step 3 Summary */}
            {step3Data && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#AEC9C0]/30 space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-1 border-b border-[#FAF6F0]">
                  <span className="font-semibold text-[#5B887E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    Paso 3: Tu relación con el peso
                  </span>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(3);
                      }}
                      className="text-[11px] text-[#6E9E93] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-4 gap-2 bg-[#FAF6F0]/70 p-2.5 rounded-xl text-center">
                  <div>
                    <span className="text-[10px] text-[#8E9E99] block uppercase tracking-wider">
                      Actual
                    </span>
                    <span className="font-semibold text-[#2E3A36] text-sm">
                      {step3Data.currentWeightKg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E9E99] block uppercase tracking-wider">
                      Talla
                    </span>
                    <span className="font-semibold text-[#2E3A36] text-sm">
                      {step3Data.heightCm ? `${step3Data.heightCm} cm` : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E9E99] block uppercase tracking-wider">
                      Mínimo (&gt;18)
                    </span>
                    <span className="font-semibold text-[#2E3A36] text-sm">
                      {step3Data.lowestWeightSince18Kg} kg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#8E9E99] block uppercase tracking-wider">
                      Máximo (&gt;18)
                    </span>
                    <span className="font-semibold text-[#2E3A36] text-sm">
                      {step3Data.highestWeightSince18Kg} kg
                    </span>
                  </div>
                </div>

                {/* Weight Trajectory timeline summary */}
                {step3Data.weightTrajectoryMilestones && step3Data.weightTrajectoryMilestones.length > 0 && (
                  <div className="py-1 space-y-1.5 border-t border-[#FAF6F0] pt-2">
                    <span className="text-[#5C6E68] text-xs font-semibold flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Línea de tiempo de trayectoria ({step3Data.weightTrajectoryMilestones.length} momentos):
                    </span>
                    <div className="space-y-1.5 pl-1">
                      {step3Data.weightTrajectoryMilestones.map((m) => (
                        <div
                          key={m.id}
                          className="bg-[#FAF6F0]/80 p-2 rounded-xl border border-[#E8E2D8]/60 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#2E3A36]">{m.stageOrAge}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-white border border-[#D9D3C8] text-[#5C6E68]">
                              {m.shiftType === 'subida' ? '↗️ Subida' : m.shiftType === 'bajada' ? '↘️ Bajada' : m.shiftType === 'rebote' ? '🔄 Rebote' : '⏸️ Estable'} {m.approxWeightOrChange ? `(${m.approxWeightOrChange})` : ''}
                            </span>
                          </div>
                          <p className="text-[#5C6E68] italic text-[11px]">"{m.lifeContext}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Intentos previos summary */}
                <div className="py-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5C6E68] flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Intentos previos:
                    </span>
                    <span className="font-medium text-[#2E3A36]">
                      {step3Data.hasPreviousAttempts}
                      {step3Data.hasPreviousAttempts === 'Sí' && step3Data.fluctuationCount
                        ? ` (${step3Data.fluctuationCount})`
                        : ''}
                    </span>
                  </div>

                  {step3Data.hasPreviousAttempts === 'Sí' && step3Data.previousMethods && (
                    <p className="text-[11px] text-[#5C6E68] pl-5">
                      Métodos: {step3Data.previousMethods.join(', ')}
                    </p>
                  )}
                </div>

                {/* Medicamentos summary */}
                <div className="py-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5C6E68] flex items-center gap-1.5">
                      <Pill className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Medicamentos para peso:
                    </span>
                    <span className="font-medium text-[#2E3A36]">
                      {step3Data.usedWeightMedications}
                    </span>
                  </div>
                  {step3Data.usedWeightMedications === 'Sí' && step3Data.weightMedicationsNames && (
                    <p className="text-[11px] text-[#5C6E68] pl-5">
                      Fármacos: {step3Data.weightMedicationsNames}
                    </p>
                  )}
                </div>

                {/* Cirugía bariátrica summary */}
                <div className="py-1 flex items-center justify-between text-xs">
                  <span className="text-[#5C6E68] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#6E9E93]" />
                    Cirugía bariátrica:
                  </span>
                  <span className="font-medium text-[#2E3A36]">
                    {step3Data.hadBariatricSurgery}
                    {step3Data.hadBariatricSurgery === 'Sí' && step3Data.bariatricSurgeryTimeAgo
                      ? ` (${step3Data.bariatricSurgeryTimeAgo})`
                      : ''}
                  </span>
                </div>

                {/* Cirugía estética summary */}
                <div className="py-1 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#5C6E68] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Cirugía estética corporal:
                    </span>
                    <span className="font-medium text-[#2E3A36]">
                      {step3Data.hadAestheticSurgery || 'No'}
                    </span>
                  </div>
                  {step3Data.hadAestheticSurgery === 'Sí' && (
                    <p className="text-[11px] text-[#5C6E68] pl-5">
                      {step3Data.aestheticSurgeryDetails}{' '}
                      {step3Data.aestheticSurgeryTimeAgo && (
                        <span className="text-[#8E9E99]">
                          ({step3Data.aestheticSurgeryTimeAgo})
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2 Summary */}
            {step2Data && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#AEC9C0]/30 space-y-3 text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-1 border-b border-[#FAF6F0]">
                  <span className="font-semibold text-[#5B887E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    Paso 2: Motivo y Objetivos
                  </span>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(2);
                      }}
                      className="text-[11px] text-[#6E9E93] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[#5C6E68] font-medium flex items-center gap-1.5 text-xs">
                    <Compass className="w-3.5 h-3.5 text-[#6E9E93]" />
                    Motivo principal:
                  </span>
                  <p className="text-[#2E3A36] bg-[#FAF6F0]/60 p-2 rounded-xl italic line-clamp-2 text-xs">
                    "{step2Data.consultationReason}"
                  </p>
                </div>

                {step2Data.expectedGoals && (
                  <div className="space-y-1">
                    <span className="text-[#5C6E68] font-medium flex items-center gap-1.5 text-xs">
                      <Target className="w-3.5 h-3.5 text-[#6E9E93]" />
                      Objetivos esperados:
                    </span>
                    <p className="text-[#2E3A36] bg-[#FAF6F0]/60 p-2 rounded-xl text-xs">
                      {step2Data.expectedGoals}
                    </p>
                  </div>
                )}

                {step2Data.currentObstacles && (
                  <div className="space-y-1">
                    <span className="text-[#5C6E68] font-medium flex items-center gap-1.5 text-xs">
                      <Mountain className="w-3.5 h-3.5 text-[#F2A488]" />
                      Obstáculos identificados:
                    </span>
                    <p className="text-[#2E3A36] bg-[#FDEEE9]/50 p-2 rounded-xl text-xs">
                      {step2Data.currentObstacles}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 1 Summary */}
            {step1Data && (
              <div className="bg-white/80 rounded-2xl p-4 border border-[#AEC9C0]/30 space-y-2 text-xs sm:text-sm">
                <div className="flex items-center justify-between pb-1 border-b border-[#FAF6F0]">
                  <span className="font-semibold text-[#5B887E] flex items-center gap-1.5 text-xs uppercase tracking-wider">
                    Paso 1: Identidad
                  </span>
                  {onEditStep && (
                    <button
                      onClick={() => {
                        onClose();
                        onEditStep(1);
                      }}
                      className="text-[11px] text-[#6E9E93] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      Editar
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between py-0.5">
                  <span className="text-[#5C6E68] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#6E9E93]" />
                    Nombre:
                  </span>
                  <span className="font-medium text-[#2E3A36] text-right">
                    {step1Data.fullName}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp scheduling card inside modal */}
          <div className="p-4 rounded-2xl bg-[#EBF3F0]/90 border border-[#AEC9C0] text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#2E3A36] text-xs sm:text-sm flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#5B887E]" />
                ¿Lista para agendar tu consulta?
              </span>
              <span className="text-[10px] text-[#5B887E] font-medium bg-white px-2 py-0.5 rounded-full border border-[#AEC9C0]">
                WhatsApp oficial
              </span>
            </div>
            <p className="text-[11px] text-[#5C6E68] leading-relaxed">
              Como ya completaste tu cuestionario inicial, tu contexto clínico está listo para la Dra. Lorena. Escríbenos a nuestra línea de WhatsApp (+57 301 141 7555) para coordinar la fecha y hora de tu cita.
            </p>
            <a
              href="https://wa.me/573011417555?text=Hola%20equipo%20Vela%2C%20acabo%20de%20completar%20mi%20Cuestionario%20Inicial%20y%20me%20gustar%C3%ADa%20agendar%20mi%20cita%20m%C3%A9dica."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BA5A] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>Agendar cita médica vía WhatsApp (+57 301 141 7555)</span>
            </a>
          </div>

          {/* Action button */}
          <div className="pt-1">
            <button
              onClick={onClose}
              className="w-full py-3 px-6 rounded-xl bg-[#FAF6F0] hover:bg-[#E8E2D8] text-[#2E3A36] border border-[#D9D3C8] font-semibold text-xs sm:text-sm transition-colors shadow-2xs flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Cerrar resumen</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
