import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/Header';
import { WizardProgress } from './components/WizardProgress';
import { StepZeroConsent } from './components/StepZeroConsent';
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
import { LoginScreen } from './components/LoginScreen';
import { InvitationActivationScreen } from './components/InvitationActivationScreen';
import { DoctorDashboard } from './components/DoctorDashboard';
import { VelaIcon } from './components/VelaIcon';
import { saveQuestionnaireToFirestore } from './services/questionnaireService';
import { authService } from './services/authService';
import { checkAndHandleNuevoParam, clearDraftStorage } from './utils/draftStorage';
import { rehydrateUploadedFiles } from './utils/fileMemoryStore';
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
  AppUser,
} from './types';
import { ShieldCheck, Heart, Lock } from 'lucide-react';

/**
 * =========================================================================
 * BANDERA DE CONTROL: AUTENTICACIÓN DEL PACIENTE EN EL CUESTIONARIO
 * =========================================================================
 * - false (ACTUAL / MODO PRUEBAS DIRECTAS): El paciente accede directamente
 *   al cuestionario por link sin requerir registro, usuario ni contraseña.
 * - true: Exige inicio de sesión o creación de cuenta previa para responder
 *   el cuestionario del paciente.
 *
 * CÓMO REVERTIR:
 * Cambia esta constante a `true` cuando desees volver a exigir login/registro
 * al paciente en producción.
 *
 * SEGURIDAD MÉDICA:
 * El Panel de Control / Portal Médico de la Doctora (Dra. Lorena Castro)
 * SIEMPRE exige inicio de sesión seguro con sus credenciales médicas,
 * independientemente del valor de esta bandera.
 * =========================================================================
 */
export const REQUIRE_PATIENT_LOGIN = false;

export default function App() {
  // Check if ?nuevo=1 or ?nuevo=true is in the URL to start with a pristine, blank questionnaire.
  // Runs synchronously before state initializers evaluate localStorage.
  checkAndHandleNuevoParam();

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  // Check for invitation token in URL query (e.g. ?invitacion=XYZ or ?token=XYZ)
  const [invitationToken, setInvitationToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('invitacion') || params.get('token') || null;
  });

  // Track invited patient metadata when accessing by invitation link without login
  const [invitedPatientData, setInvitedPatientData] = useState<{
    id?: string;
    email?: string;
    nombre?: string;
  } | null>(null);

  const [isAdminView, setIsAdminView] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.location.hash === '#admin' ||
      window.location.pathname === '/admin' ||
      window.location.search.includes('admin=true')
    );
  });

  useEffect(() => {
    let isMounted = true;
    authService
      .checkCurrentSession()
      .then(({ authenticated, user }) => {
        if (isMounted) {
          if (authenticated && user) {
            setCurrentUser(user);
          }
          setIsAuthChecking(false);
        }
      })
      .catch(() => {
        if (isMounted) setIsAuthChecking(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const handleHashChange = () => {
      const isHashAdmin = window.location.hash === '#admin';
      setIsAdminView(isHashAdmin);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // When patient login is not required, automatically prefill patient name if arriving via invite link
  useEffect(() => {
    if (!REQUIRE_PATIENT_LOGIN && invitationToken) {
      let isMounted = true;
      authService
        .getInvitationDetails(invitationToken)
        .then((details) => {
          if (isMounted && details.valid && details.nombre) {
            setInvitedPatientData({
              id: details.id,
              email: details.email,
              nombre: details.nombre,
            });
            setStep1Data((prev) => {
              if (!prev || !prev.fullName) {
                return {
                  fullName: details.nombre,
                  documentType: prev?.documentType || 'CC',
                  documentNumber: prev?.documentNumber || '',
                  birthDate: prev?.birthDate || '',
                  age: prev?.age || '',
                  sex: prev?.sex || '',
                  phone: prev?.phone || '',
                  email: prev?.email || details.email || '',
                  occupation: prev?.occupation || '',
                  civilStatus: prev?.civilStatus || '',
                  referralSource: prev?.referralSource || '',
                  referralOtherDetails: prev?.referralOtherDetails || '',
                };
              }
              return prev;
            });
          }
        })
        .catch((err) => {
          console.warn('Notice loading invitation details:', err);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [invitationToken]);

  const [currentStep, setCurrentStep] = useState<number>(() => {
    const savedStep = localStorage.getItem('vela_current_step');
    if (savedStep !== null) {
      const parsed = parseInt(savedStep, 10);
      if (parsed === 0) return 1;
      return isNaN(parsed) ? 1 : parsed;
    }
    const hasAcceptedConsent = localStorage.getItem('vela_consent_accepted') === 'true';
    return hasAcceptedConsent ? 2 : 1;
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

  // Rehydrate any missing file dataUrls from IndexedDB on initial mount
  useEffect(() => {
    let isMounted = true;
    if (step9Data?.files && step9Data.files.some((f) => !f.dataUrl)) {
      rehydrateUploadedFiles(step9Data.files).then((restored) => {
        if (isMounted) {
          setStep9Data((prev) => (prev ? { ...prev, files: restored } : prev));
        }
      });
    }
    if (stepInBodyData?.files && stepInBodyData.files.some((f) => !f.dataUrl)) {
      rehydrateUploadedFiles(stepInBodyData.files).then((restored) => {
        if (isMounted) {
          setStepInBodyData((prev) => (prev ? { ...prev, files: restored } : prev));
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, []);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Sync to Firestore whenever state changes or step advances without causing unneeded re-renders
  const syncProgressToFirestore = useCallback(async (overrides?: {
    step?: number;
    isComplete?: boolean;
    isSavedByPatient?: boolean;
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
      const targetStep = overrides?.step ?? currentStep;
      const isSaved = overrides?.isSavedByPatient ?? (localStorage.getItem('vela_patient_has_saved') === 'true');
      await saveQuestionnaireToFirestore({
        currentStep: targetStep,
        userId: currentUser?.id || invitedPatientData?.id,
        userEmail: currentUser?.email || invitedPatientData?.email,
        isComplete: overrides?.isComplete ?? isSaved,
        isSavedByPatient: isSaved,
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
    }
  }, [
    currentUser,
    invitedPatientData,
    currentStep,
    step1Data,
    step2Data,
    step3Data,
    step4Data,
    step5Data,
    step6Data,
    step7Data,
    step9Data,
    stepInBodyData,
  ]);

  useEffect(() => {
    localStorage.setItem('vela_current_step', currentStep.toString());
    syncProgressToFirestore({ step: currentStep });
  }, [currentStep]);

  // Navigation Handlers with instant Firestore autosync
  const handleStepOneBack = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepOneContinue = (data: PatientBasicInfo) => {
    setStep1Data(data);
    setCurrentStep(3);
    syncProgressToFirestore({ step: 3, step1: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepTwoBack = () => {
    setCurrentStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepTwoContinue = (data: PatientMotivationInfo) => {
    setStep2Data(data);
    setCurrentStep(4);
    syncProgressToFirestore({ step: 4, step2: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepThreeBack = () => {
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepThreeContinue = (data: PatientWeightHistoryInfo) => {
    setStep3Data(data);
    setCurrentStep(5);
    syncProgressToFirestore({ step: 5, step3: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFourBack = () => {
    setCurrentStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFourContinue = (data: PatientHealthMapInfo) => {
    setStep4Data(data);
    setCurrentStep(6);
    syncProgressToFirestore({ step: 6, step4: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFiveBack = () => {
    setCurrentStep(5);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepFiveContinue = (data: PatientBodySymptomsInfo) => {
    setStep5Data(data);
    setCurrentStep(7);
    syncProgressToFirestore({ step: 7, step5: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSixBack = () => {
    setCurrentStep(6);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSixContinue = (data: PatientNutritionInfo) => {
    setStep6Data(data);
    setCurrentStep(8);
    syncProgressToFirestore({ step: 8, step6: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSevenBack = () => {
    setCurrentStep(7);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepSevenContinue = (data: PatientPhysicalActivityInfo) => {
    setStep7Data(data);
    setCurrentStep(9);
    syncProgressToFirestore({ step: 9, step7: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStepNineBack = () => {
    setCurrentStep(8);
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
    syncProgressToFirestore({ step: 11, stepInBody: data });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveStepInBodyResponses = async (data: PatientInBodyInfo) => {
    setStepInBodyData(data);
    localStorage.setItem('vela_patient_has_saved', 'true');
    await syncProgressToFirestore({
      step: 10,
      isSavedByPatient: true,
      stepInBody: data,
    });
  };

  const handleStepClosureBack = () => {
    setCurrentStep(10);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveQuestionnaire = async () => {
    await syncProgressToFirestore({
      step: 11,
      isComplete: true,
      isSavedByPatient: true,
    });
  };

  // Pre-fill patient name from authenticated account if not yet entered
  useEffect(() => {
    if (currentUser && currentUser.rol === 'paciente' && currentUser.nombre) {
      setStep1Data((prev) => {
        if (!prev || !prev.fullName) {
          return {
            fullName: currentUser.nombre,
            documentType: prev?.documentType || 'CC',
            documentNumber: prev?.documentNumber || '',
            birthDate: prev?.birthDate || '',
            age: prev?.age || '',
            occupation: prev?.occupation || '',
            civilStatus: prev?.civilStatus || '',
            referralSource: prev?.referralSource || '',
            referralOtherDetails: prev?.referralOtherDetails || '',
          };
        }
        return prev;
      });
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await authService.logout();
    setCurrentUser(null);
    setIsAdminView(false);
    window.location.hash = '';
  };

  const handleResetDraft = () => {
    clearDraftStorage();
    setCurrentStep(1);
    setStep1Data(null);
    setStep2Data(null);
    setStep3Data(null);
    setStep4Data(null);
    setStep5Data(null);
    setStep6Data(null);
    setStep7Data(null);
    setStep9Data(null);
    setStepInBodyData(null);
    if (currentUser?.nombre) {
      setStep1Data({
        fullName: currentUser.nombre,
        documentType: 'CC',
        documentNumber: '',
        birthDate: '',
        age: '',
        occupation: '',
        civilStatus: '',
        referralSource: '',
        referralOtherDetails: '',
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 1. Initial Auth Check (Gentle loading state)
  if (isAuthChecking) {
    return (
      <div id="auth_checking_container" className="min-h-screen bg-[#faf6f0] flex flex-col justify-center items-center px-4 font-sans text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#346a60] flex items-center justify-center shadow-md mb-4 animate-pulse">
          <VelaIcon className="w-10 h-10 text-[#fdfbf7]" />
        </div>
        <h2 className="text-xl font-serif text-[#1b3d36] mb-1">Vela Medicina & Nutrición</h2>
        <p className="text-xs text-[#526a63]">Cargando espacio clínico...</p>
      </div>
    );
  }

  // 2. Doctor Portal / Dashboard Access
  // Medical Panel strictly requires doctor credentials and role
  if (isAdminView || (currentUser && currentUser.rol === 'doctora')) {
    if (!currentUser || currentUser.rol !== 'doctora') {
      return (
        <LoginScreen
          onLoginSuccess={(user) => {
            setCurrentUser(user);
          }}
          defaultRole="doctora"
        />
      );
    }

    return (
      <DoctorDashboard
        currentUser={currentUser}
        onLogout={handleLogout}
        onBackToApp={() => {
          setIsAdminView(false);
          window.location.hash = '';
        }}
      />
    );
  }

  // 3. Patient Authentication (Controlled by REQUIRE_PATIENT_LOGIN flag)
  // When false (temporary testing / direct-link mode), patients access the questionnaire
  // directly without login, password creation, or registration.
  if (REQUIRE_PATIENT_LOGIN && !currentUser) {
    // If an invitation token is present, show invitation activation screen
    if (invitationToken) {
      return (
        <InvitationActivationScreen
          token={invitationToken}
          onActivationSuccess={(user) => {
            setCurrentUser(user);
            setInvitationToken(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('invitacion');
              url.searchParams.delete('token');
              window.history.replaceState({}, '', url.pathname);
            } catch {
              // non-blocking
            }
          }}
          onGoToLogin={() => {
            setInvitationToken(null);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('invitacion');
              url.searchParams.delete('token');
              window.history.replaceState({}, '', url.pathname);
            } catch {
              // non-blocking
            }
          }}
        />
      );
    }

    // Otherwise show login screen for patient
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
        defaultRole="paciente"
      />
    );
  }

  // 4. Patient Questionnaire (Directly accessible without login when REQUIRE_PATIENT_LOGIN is false)
  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col selection:bg-[#AEC9C0]/40 selection:text-[#2E3A36]">
      {/* Brand Header with Patient Info & Doctor Login Access */}
      <Header
        onResetDraft={handleResetDraft}
        currentUser={currentUser}
        onLogout={handleLogout}
        onDoctorLoginClick={() => {
          setIsAdminView(true);
          window.location.hash = '#admin';
        }}
      />

      {/* Multi-step Wizard Progress Bar */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={11}
        onStepClick={(step) => {
          setCurrentStep(step);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area with smooth step transitions */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepZeroConsent
                onAccept={() => {
                  setCurrentStep(2);
                  localStorage.setItem('vela_current_step', '2');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <StepOneForm
                initialData={step1Data || undefined}
                onBack={handleStepOneBack}
                onContinue={handleStepOneContinue}
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
              <StepTwoForm
                initialData={step2Data || undefined}
                onBack={handleStepTwoBack}
                onContinue={handleStepTwoContinue}
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
              <StepThreeForm
                initialData={step3Data || undefined}
                onBack={handleStepThreeBack}
                onContinue={handleStepThreeContinue}
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
              <StepFourForm
                initialData={step4Data || undefined}
                patientSex={step1Data?.sex}
                onBack={handleStepFourBack}
                onContinue={handleStepFourContinue}
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
              <StepFiveForm
                initialData={step5Data || undefined}
                onBack={handleStepFiveBack}
                onContinue={handleStepFiveContinue}
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
              <StepSixForm
                initialData={step6Data || undefined}
                onBack={handleStepSixBack}
                onContinue={handleStepSixContinue}
              />
            </motion.div>
          )}

          {currentStep === 8 && (
            <motion.div
              key="step-8"
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
                onAutoSave={(data) => setStep9Data(data)}
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
                onSaveResponses={handleSaveStepInBodyResponses}
                onAutoSave={(data) => setStepInBodyData(data)}
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
                onSaveQuestionnaire={handleSaveQuestionnaire}
                onJumpToStep={(step) => {
                  setCurrentStep(step);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
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

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-[#8E9E99]">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#6E9E93]" />
              Protección de datos médicos
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Heart className="w-3 h-3 text-[#F2A488] fill-[#F2A488]" />
              Enfoque humano y sereno
            </span>
            <span>•</span>
            <button
              onClick={() => {
                setIsAdminView(true);
                window.location.hash = '#admin';
              }}
              className="inline-flex items-center gap-1 text-[#588377] hover:text-[#2E3A36] font-medium transition-colors cursor-pointer"
            >
              <Lock className="w-3 h-3" />
              Portal Médico
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
