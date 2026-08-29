import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShieldCheck,
  Check,
  ArrowRight,
  Heart,
  FileCheck,
  Sparkles,
} from 'lucide-react';
import { VelaIcon } from './VelaIcon';

interface StepZeroConsentProps {
  onAccept: () => void;
}

export const StepZeroConsent: React.FC<StepZeroConsentProps> = ({ onAccept }) => {
  const [acceptedDataTreatment, setAcceptedDataTreatment] = useState<boolean>(() => {
    return localStorage.getItem('vela_consent_data') === 'true';
  });
  const [acceptedMedicalScope, setAcceptedMedicalScope] = useState<boolean>(() => {
    return localStorage.getItem('vela_consent_scope') === 'true';
  });

  const canProceed = acceptedDataTreatment && acceptedMedicalScope;

  const handleStart = () => {
    if (!canProceed) return;
    localStorage.setItem('vela_consent_data', 'true');
    localStorage.setItem('vela_consent_scope', 'true');
    localStorage.setItem('vela_consent_accepted', 'true');
    onAccept();
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto pt-2">
      {/* Header Banner */}
      <div className="space-y-3 text-center sm:text-left border-b border-[#E8E2D8] pb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF3F0] text-[#6E9E93] text-xs font-semibold self-start border border-[#6E9E93]/20 shadow-2xs">
          <VelaIcon size={14} />
          <span>Vela • Dra. Lorena Castro</span>
        </div>

        <div className="space-y-1.5">
          <h1
            className="text-3xl sm:text-4xl text-[#2E3A36] font-normal leading-tight"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Bienvenida a tu espacio de cuidado
          </h1>
          <p className="text-base sm:text-lg text-[#5C6E68] leading-relaxed">
            Consentimiento informado y preparación de tu primera consulta médica.
          </p>
        </div>
      </div>

      {/* Main Consent & Intro Card */}
      <div className="bg-white/80 rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/40 shadow-xs space-y-6">
        {/* Doctor greeting message */}
        <div className="flex items-start gap-4 p-4 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8]">
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#AEC9C0]/40 flex items-center justify-center shrink-0 shadow-2xs text-[#6E9E93]">
            <Heart className="w-5 h-5 fill-[#F2A488] text-[#F2A488]" />
          </div>
          <div className="space-y-1 text-xs sm:text-sm text-[#2E3A36] leading-relaxed">
            <p className="font-semibold text-[#2E3A36]">
              Un mensaje de la Dra. Lorena Castro:
            </p>
            <p className="text-[#5C6E68]">
              "Diseñé este cuestionario inicial con el objetivo de conocer tu historia en profundidad: tu trayectoria con el peso, antecedentes, sensaciones corporales y ritmo de vida. Cada respuesta me permite preparar tu cita de manera personalizada y sin afanes."
            </p>
          </div>
        </div>

        {/* Protection & Confidentiality terms */}
        <div className="space-y-3 text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
          <div className="flex items-center gap-2 text-[#2E3A36] font-semibold text-sm">
            <ShieldCheck className="w-4 h-4 text-[#6E9E93]" />
            <span>Confidencialidad y protección de datos en salud</span>
          </div>
          <p>
            La información y los documentos que compartas a través de este cuestionario están protegidos por el secreto profesional médico y la normativa vigente de protección de datos personales en salud. Serán utilizados de forma exclusiva por la Dra. Lorena Castro y su equipo clínico para tu atención médica integral.
          </p>
        </div>

        {/* Confidentiality and calm pacing note */}
        <div
          id="confidentiality-pacing-note"
          className="p-4 sm:p-5 rounded-2xl bg-[#F4F9F7] border border-[#AEC9C0]/70 flex items-start gap-3.5 shadow-2xs"
        >
          <div className="p-2 rounded-xl bg-white text-[#6E9E93] shrink-0 mt-0.5 shadow-2xs">
            <ShieldCheck className="w-5 h-5 text-[#6E9E93]" />
          </div>
          <div className="text-xs sm:text-sm text-[#2E3A36] leading-relaxed space-y-1">
            <p className="font-semibold text-[#2E3A36]">
              Un espacio de escucha y calma
            </p>
            <p className="text-[#5C6E68]">
              Te recomendamos buscar un momento tranquilo para responder a tu propio ritmo. Cada respuesta permite a la <strong>Dra. Lorena Castro</strong> preparar una guía clínica adaptada a tu biología e historia. Tus respuestas se guardan automáticamente para que puedas continuar cuando lo desees.
            </p>
          </div>
        </div>

        {/* Consent Checkboxes */}
        <div className="space-y-3.5 pt-2 border-t border-[#E8E2D8]">
          <p className="text-xs font-semibold text-[#2E3A36] uppercase tracking-wider">
            Para continuar, por favor confirma tu consentimiento:
          </p>

          {/* Checkbox 1 */}
          <label
            htmlFor="consent-data-treatment"
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              acceptedDataTreatment
                ? 'bg-[#EBF3F0]/60 border-[#6E9E93]'
                : 'bg-[#FAF6F0]/50 border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          >
            <div className="pt-0.5">
              <input
                id="consent-data-treatment"
                type="checkbox"
                checked={acceptedDataTreatment}
                onChange={(e) => setAcceptedDataTreatment(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                  acceptedDataTreatment
                    ? 'bg-[#6E9E93] text-white'
                    : 'border-2 border-[#C8C2B7] bg-white'
                }`}
              >
                {acceptedDataTreatment && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs sm:text-sm text-[#2E3A36] leading-relaxed select-none">
              Autorizo el tratamiento confidencial de mis datos personales y de salud para fines exclusivos de mi atención médica con la Dra. Lorena Castro. <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>

          {/* Checkbox 2 */}
          <label
            htmlFor="consent-medical-scope"
            className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer ${
              acceptedMedicalScope
                ? 'bg-[#EBF3F0]/60 border-[#6E9E93]'
                : 'bg-[#FAF6F0]/50 border-[#D9D3C8] hover:border-[#AEC9C0]'
            }`}
          >
            <div className="pt-0.5">
              <input
                id="consent-medical-scope"
                type="checkbox"
                checked={acceptedMedicalScope}
                onChange={(e) => setAcceptedMedicalScope(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all ${
                  acceptedMedicalScope
                    ? 'bg-[#6E9E93] text-white'
                    : 'border-2 border-[#C8C2B7] bg-white'
                }`}
              >
                {acceptedMedicalScope && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </div>
            <span className="text-xs sm:text-sm text-[#2E3A36] leading-relaxed select-none">
              Entiendo que este cuestionario es una herramienta previa para orientar mi consulta médica y no reemplaza la valoración médica directa. <strong className="text-[#C66A4D]">*</strong>
            </span>
          </label>
        </div>

        {/* Action Button */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-[#E8E2D8]">
          <div className="flex items-center gap-2 text-xs text-[#5C6E68]">
            <Sparkles className="w-4 h-4 text-[#6E9E93]" />
            <span>Tus respuestas se guardan automáticamente</span>
          </div>

          <button
            type="button"
            id="btn-start-questionnaire"
            disabled={!canProceed}
            onClick={handleStart}
            className={`w-full sm:w-auto min-w-[220px] px-8 py-4 rounded-2xl font-semibold text-white shadow-md flex items-center justify-center gap-2.5 transition-all duration-300 ${
              canProceed
                ? 'bg-[#6E9E93] hover:bg-[#5B887E] active:bg-[#4B736A] hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5'
                : 'bg-[#6E9E93]/40 text-white/80 cursor-not-allowed shadow-none'
            }`}
          >
            <span>Comenzar cuestionario</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
