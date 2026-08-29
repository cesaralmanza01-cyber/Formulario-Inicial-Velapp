import React from 'react';
import { ShieldCheck, Clock } from 'lucide-react';
import { StepItem } from '../types';

interface WizardProgressProps {
  currentStep: number;
  totalSteps?: number;
  steps?: StepItem[];
}

export const defaultSteps: StepItem[] = [
  {
    id: 1,
    title: 'Datos personales',
    shortTitle: 'Identidad',
    description: 'Información básica para tu ficha clínica',
    status: 'current',
  },
  {
    id: 2,
    title: 'Motivo y objetivos',
    shortTitle: 'Objetivos',
    description: 'Qué te trae hoy a consulta',
    status: 'upcoming',
  },
  {
    id: 3,
    title: 'Tu relación con el peso',
    shortTitle: 'Peso',
    description: 'Trayectoria e historial con el peso',
    status: 'upcoming',
  },
  {
    id: 4,
    title: 'Tu mapa de salud',
    shortTitle: 'Salud',
    description: 'Antecedentes generales y familiares',
    status: 'upcoming',
  },
  {
    id: 5,
    title: '¿Cómo se siente tu cuerpo?',
    shortTitle: 'Tu cuerpo',
    description: 'Revisión por sistemas y sensaciones físicas',
    status: 'upcoming',
  },
  {
    id: 6,
    title: 'Hablemos de tu alimentación',
    shortTitle: 'Alimentación',
    description: 'Preferencias, rutina de comidas y hábitos',
    status: 'upcoming',
  },
  {
    id: 7,
    title: '¿Cómo te mueves en tu día a día?',
    shortTitle: 'Movimiento',
    description: 'Actividad física, ejercicio y motivación',
    status: 'upcoming',
  },
  {
    id: 8,
    title: 'Sueño y bienestar',
    shortTitle: 'Descanso',
    description: 'Calidad de sueño, estrés y descanso',
    status: 'upcoming',
  },
  {
    id: 9,
    title: '¿Tienes exámenes de laboratorio recientes?',
    shortTitle: 'Laboratorio',
    description: 'Exámenes de sangre y paraclínicos',
    status: 'upcoming',
  },
  {
    id: 10,
    title: '¿Tienes algún registro de InBody o composición corporal?',
    shortTitle: 'InBody',
    description: 'Bioimpedancia, grasa y masa muscular',
    status: 'upcoming',
  },
  {
    id: 11,
    title: 'Guardar y agendar cita',
    shortTitle: 'Finalizar',
    description: 'Guardar respuestas y agendar cita por WhatsApp',
    status: 'upcoming',
  },
];

export const WizardProgress: React.FC<WizardProgressProps> = ({
  currentStep = 1,
  totalSteps = 11,
  steps = defaultSteps,
}) => {
  const percentage = Math.max(5, Math.min(100, Math.round((currentStep / totalSteps) * 100)));

  // Calculate proportional estimated remaining time based on 20-30 minutes total
  const getTimeEstimate = () => {
    if (currentStep <= 1) return '20 a 30 min';
    if (currentStep >= totalSteps) return '~1 min';
    const remainingFraction = (totalSteps - currentStep + 1) / totalSteps;
    const estimatedMinutes = Math.max(2, Math.round(remainingFraction * 25));
    return `~${estimatedMinutes} min`;
  };

  const currentStepTitle =
    currentStep === 0
      ? 'Consentimiento informado'
      : steps.find((s) => s.id === currentStep)?.title || 'Datos personales';

  return (
    <div className="w-full bg-[#FAF6F0]/90 backdrop-blur-xs border-b border-[#AEC9C0]/30 py-4 px-4 sm:px-8 sticky top-0 z-30 transition-all">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider uppercase text-[#5B887E] bg-[#EBF3F0] px-2.5 py-1 rounded-full">
              {currentStep === 0 ? 'Paso previo' : `Paso ${currentStep} de ${totalSteps}`}
            </span>
            <span className="text-sm font-medium text-[#2E3A36]">
              {currentStepTitle}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#5C6E68]">
            <span className="inline-flex items-center gap-1 font-medium text-[#5B887E]">
              <Clock className="w-3.5 h-3.5 text-[#6E9E93]" />
              {getTimeEstimate()}
            </span>
            <span className="text-[#AEC9C0]">•</span>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6E9E93]" />
              Confidencial
            </span>
          </div>
        </div>

        {/* Progress track */}
        <div className="w-full bg-[#E8E2D8] h-1.5 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-linear-to-r from-[#AEC9C0] to-[#6E9E93] rounded-full transition-all duration-500 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Step dots for preview */}
        <div className="hidden sm:flex justify-between mt-2 px-0.5">
          {steps.map((step) => {
            const isCurrent = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div
                key={step.id}
                className="flex items-center gap-1.5"
                title={`${step.id}. ${step.title}: ${step.description}`}
              >
                <div
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? 'bg-[#F2A488] ring-3 ring-[#F2A488]/30 scale-110'
                      : isCompleted
                      ? 'bg-[#6E9E93]'
                      : 'bg-[#D3CDC3]'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium transition-colors ${
                    isCurrent
                      ? 'text-[#2E3A36] font-semibold'
                      : isCompleted
                      ? 'text-[#5B887E]'
                      : 'text-[#8E9E99]'
                  }`}
                >
                  {step.shortTitle}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
