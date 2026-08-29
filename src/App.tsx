import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { WizardProgress } from './components/WizardProgress';
import { StepOneForm } from './components/StepOneForm';
import { StepTwoForm } from './components/StepTwoForm';
import { StepThreeForm } from './components/StepThreeForm';
import { StepFourForm } from './components/StepFourForm';
import { StepFiveForm } from './components/StepFiveForm';
import { StepSixForm } from './components/StepSixForm';
import { StepSevenForm } from './components/StepSevenForm';
import { StepNineForm } from './components/StepNineForm';
import { StepInBodyForm } from './components/StepInBodyForm';
import { StepClosureScreen } from './components/StepClosureScreen';
import { StepCompletionModal } from './components/StepCompletionModal';
import { DoctorPortal } from './components/DoctorPortal';
import { VelaIcon } from './components/VelaIcon';
import { saveQuestionnaireToFirestore } from './services/questionnaireService';
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
} from './types';
import { ShieldCheck, Heart, CloudCheck } from 'lucide-react';

export default function App() {
  // Check if URL hash or path has #/admin or /admin or doctor portal mode
  const [isDoctorPortalActive, setIsDoctorPortalActive] = useState<boolean>(() => {
    return (
      window.location.hash.includes('admin') ||
      window.location.pathname.includes('/admin') ||
      window.location.search.includes('admin=true')
    );
  });

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const savedStep = localStorage.getItem('vela_current_step');
    return savedStep ? parseInt(savedStep, 10) || 1 : 1;
  });

  const [step1Data, setStep1Data] = useState<PatientBasicInfo | null>(() => {
    const saved = localStorage.getItem('vela_step1_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step2Data, setStep2Data] = useState<PatientMotivationInfo | null>(() => {
    const saved = localStorage.getItem('vela_step2_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step3Data, setStep3Data] = useState<PatientWeightHistoryInfo | null>(() => {
    const saved = localStorage.getItem('vela_step3_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step4Data, setStep4Data] = useState<PatientHealthMapInfo | null>(() => {
    const saved = localStorage.getItem('vela_step4_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step5Data, setStep5Data] = useState<PatientBodySymptomsInfo | null>(() => {
    const saved = localStorage.getItem('vela_step5_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step6Data, setStep6Data] = useState<PatientNutritionInfo | null>(() => {
    const saved = localStorage.getItem('vela_step6_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step7Data, setStep7Data] = useState<PatientPhysicalActivityInfo | null>(() => {
    const saved = localStorage.getItem('vela_step7_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [step9Data, setStep9Data] = useState<PatientLabExamsInfo | null>(() => {
    const saved = localStorage.getItem('vela_step9_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [stepInBodyData, setStepInBodyData] = useState<PatientInBodyInfo | null>(() => {
    const saved = localStorage.getItem('vela_step10_inbody_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);

  // Sync to Firestore whenever state changes or step advances
  const syncProgressToFirestore = async (overrides?: {
    step?: number;
    isComplete?: boolean;
    step1?: PatientBasicInfo | null;
    step2?: PatientMotivationInfo | null;
    step3?: PatientWeightHistoryInfo | null;
    step4?: PatientHealthMapInfo | null;
    step5?: PatientBodySymptomsInfo | null;
    step6?: PatientNutritionInfo | null;
    step7?: PatientPhysicalActivityInfo | null;
    step9?: PatientLabExamsInfo | null;
    stepInBody?: PatientInBodyInfo | null;
  }) => {
    try {
      setIsSyncingFirestore(true);
      const targetStep = overrides?.step ?? currentStep;
      await saveQuestionnaireToFirestore({
        currentStep: targetStep,
        isComplete: overrides?.isComplete ?? (targetStep === 11),
        step1Data: overrides?.step1 !== undefined ? overrides.step1 : step1Data,
        step2Data: overrides?.step2 !== undefined ? overrides.step2 : step2Data,
        step3Data: overrides?.step3 !== undefined ? overrides.step3 : step3Data,
        step4Data: overrides?.step4 !== undefined ? overrides.step4 : step4Data,
        step5Data: overrides?.step5 !== undefined ? overrides.step5 : step5Data,
        step6Data: overrides?.step6 !== undefined ? overrides.step6 : step6Data,
        step7Data: overrides?.step7 !== undefined ? overrides.step7 : step7Data,
        step9Data: overrides?.step9 !== undefined ? overrides.step9 : step9Data,
        stepInBodyData: overrides?.stepInBody !== undefined ? overrides.stepInBody : stepInBodyData,
      });
    } catch (e) {
      console.warn('Firestore autosync notice (data kept in local storage safely):', e);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  useEffect(() => {
    localStorage.setItem('vela_current_step', currentStep.toString());
    syncProgressToFirestore({ step: currentStep });
  }, [currentStep]);

  // Listen to hash change for #/admin
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash.includes('admin')) {
        setIsDoctorPortalActive(true);
      } else {
        setIsDoctorPortalActive(false);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Navigation Handlers with instant Firestore autosync
  const handleStepOneContinue = (data: PatientBasicInfo) => {
    setStep1Data(data);
    setCurrentStep(2);
    syncProgressToFirestore({ step: 2, step1: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepTwoBack = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepTwoContinue = (data: PatientMotivationInfo) => {
    setStep2Data(data);
    setCurrentStep(3);
    syncProgressToFirestore({ step: 3, step2: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepThreeBack = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepThreeContinue = (data: PatientWeightHistoryInfo) => {
    setStep3Data(data);
    setCurrentStep(4);
    syncProgressToFirestore({ step: 4, step3: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFourBack = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFourContinue = (data: PatientHealthMapInfo) => {
    setStep4Data(data);
    setCurrentStep(5);
    syncProgressToFirestore({ step: 5, step4: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFiveBack = () => {
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFiveContinue = (data: PatientBodySymptomsInfo) => {
    setStep5Data(data);
    setCurrentStep(6);
    syncProgressToFirestore({ step: 6, step5: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSixBack = () => {
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSixContinue = (data: PatientNutritionInfo) => {
    setStep6Data(data);
    setCurrentStep(7);
    syncProgressToFirestore({ step: 7, step6: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSevenBack = () => {
    setCurrentStep(6);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSevenContinue = (data: PatientPhysicalActivityInfo) => {
    setStep7Data(data);
    setCurrentStep(9);
    syncProgressToFirestore({ step: 9, step7: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepNineBack = () => {
    setCurrentStep(7);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepNineContinue = (data: PatientLabExamsInfo) => {
    setStep9Data(data);
    setCurrentStep(10);
    syncProgressToFirestore({ step: 10, step9: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepInBodyBack = () => {
    setCurrentStep(9);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepInBodyContinue = (data: PatientInBodyInfo) => {
    setStepInBodyData(data);
    setCurrentStep(11);
    syncProgressToFirestore({ step: 11, stepInBody: data, isComplete: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepClosureBack = () => {
    setCurrentStep(10);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDoctorPortal = () => {
    window.location.hash = '#/admin';
    setIsDoctorPortalActive(true);
  };

  const handleCloseDoctorPortal = () => {
    window.location.hash = '';
    setIsDoctorPortalActive(false);
  };

  const handleResetDraft = () => {
    if (window.confirm('¿Deseas reiniciar los campos de este cuestionario?')) {
      localStorage.removeItem('vela_step1_data');
      localStorage.removeItem('vela_step2_data');
      localStorage.removeItem('vela_step3_data');
      localStorage.removeItem('vela_step4_data');
      localStorage.removeItem('vela_step5_data');
      localStorage.removeItem('vela_step6_data');
      localStorage.removeItem('vela_step7_data');
      localStorage.removeItem('vela_step9_data');
      localStorage.removeItem('vela_step10_inbody_data');
      localStorage.removeItem('vela_current_step');
      window.location.reload();
    }
  };

  if (isDoctorPortalActive) {
    return <DoctorPortal onBackToApp={handleCloseDoctorPortal} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col selection:bg-[#AEC9C0]/40 selection:text-[#2E3A36]">
      {/* Brand Header */}
      <Header
        onResetDraft={handleResetDraft}
        onOpenDoctorPortal={handleOpenDoctorPortal}
      />

      {/* Multi-step Wizard Progress Bar (Screen 10 of 11) */}
      <WizardProgress currentStep={currentStep} totalSteps={11} />

      {/* Main Content Area with smooth step transitions */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepOneForm
                initialData={step1Data || undefined}
                onContinue={handleStepOneContinue}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepTwoForm
                initialData={step2Data || undefined}
                onBack={handleStepTwoBack}
                onContinue={handleStepTwoContinue}
              />
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepThreeForm
                initialData={step3Data || undefined}
                onBack={handleStepThreeBack}
                onContinue={handleStepThreeContinue}
              />
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepFourForm
                initialData={step4Data || undefined}
                onBack={handleStepFourBack}
                onContinue={handleStepFourContinue}
              />
            </motion.div>
          )}

          {currentStep === 5 && (
            <motion.div
              key="step-5"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepFiveForm
                initialData={step5Data || undefined}
                onBack={handleStepFiveBack}
                onContinue={handleStepFiveContinue}
              />
            </motion.div>
          )}

          {currentStep === 6 && (
            <motion.div
              key="step-6"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepSixForm
                initialData={step6Data || undefined}
                onBack={handleStepSixBack}
                onContinue={handleStepSixContinue}
              />
            </motion.div>
          )}

          {currentStep === 7 && (
            <motion.div
              key="step-7"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepSevenForm
                initialData={step7Data || undefined}
                onBack={handleStepSevenBack}
                onContinue={handleStepSevenContinue}
              />
            </motion.div>
          )}

          {currentStep === 9 && (
            <motion.div
              key="step-9"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepNineForm
                initialData={step9Data || undefined}
                onBack={handleStepNineBack}
                onContinue={handleStepNineContinue}
              />
            </motion.div>
          )}

          {currentStep === 10 && (
            <motion.div
              key="step-10"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepInBodyForm
                initialData={stepInBodyData || undefined}
                onBack={handleStepInBodyBack}
                onContinue={handleStepInBodyContinue}
              />
            </motion.div>
          )}

          {currentStep === 11 && (
            <motion.div
              key="step-11"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepClosureScreen
                basicInfo={step1Data}
                motivationInfo={step2Data}
                weightInfo={step3Data}
                healthMapInfo={step4Data}
                symptomsInfo={step5Data}
                nutritionInfo={step6Data}
                activityInfo={step7Data}
                labInfo={step9Data}
                inBodyInfo={stepInBodyData}
                onBack={handleStepClosureBack}
                onViewSummary={() => setIsModalOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Summary Modal upon completing form */}
      <StepCompletionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onEditStep={(step) => {
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        step1Data={step1Data}
        step2Data={step2Data}
        step3Data={step3Data}
        step4Data={step4Data}
        step5Data={step5Data}
        step6Data={step6Data}
        step7Data={step7Data}
        step9Data={step9Data}
        stepInBodyData={stepInBodyData}
      />

      {/* Compassionate Medical Footer */}
      <footer className="w-full border-t border-[#AEC9C0]/25 bg-[#FAF6F0] py-8 px-4 sm:px-8 mt-auto">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5C6E68]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-white border border-[#AEC9C0]/40 flex items-center justify-center shrink-0">
              <VelaIcon size={18} />
            </div>
            <div>
              <p className="font-semibold text-[#2E3A36]">Vela — Dra. Lorena Castro</p>
              <p className="text-[11px] text-[#8E9E99]">
                Manejo médico e integral del sobrepeso y la obesidad
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#8E9E99]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6E9E93]" />
              Protección de datos médicos
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-[#F2A488] fill-[#F2A488]" />
              Enfoque humano y sereno
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
