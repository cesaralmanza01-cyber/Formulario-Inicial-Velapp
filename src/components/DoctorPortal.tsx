import React, { useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import {
  FirestoreQuestionnaireDocument,
} from '../types';
import {
  subscribeToQuestionnaires,
  getAllQuestionnaires,
} from '../services/questionnaireService';
import { VelaLogo } from './VelaLogo';
import { VelaIcon } from './VelaIcon';
import { DoctorPatientDetail } from './DoctorPatientDetail';
import {
  Search,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  FileText,
  User,
  Activity,
  CheckCircle2,
  Clock,
  RefreshCw,
  Lock,
  Stethoscope,
  AlertCircle,
  FileCheck2,
  ArrowLeft,
  X,
  Plus,
} from 'lucide-react';

interface DoctorPortalProps {
  onBackToApp: () => void;
}

// Authorized doctor emails (Dra. Lorena Castro and test account)
const AUTHORIZED_DOCTOR_EMAILS = ['comerconcalma@gmail.com', 'cesaralmanza01@gmail.com'];

export const DoctorPortal: React.FC<DoctorPortalProps> = ({ onBackToApp }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isDemoAccess, setIsDemoAccess] = useState<boolean>(() => {
    return localStorage.getItem('vela_doctor_demo_mode') === 'true';
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [customAuthorizedEmail, setCustomAuthorizedEmail] = useState<string>(() => {
    return localStorage.getItem('vela_doctor_authorized_email') || 'comerconcalma@gmail.com';
  });

  const [questionnaires, setQuestionnaires] = useState<FirestoreQuestionnaireDocument[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'completado' | 'en progreso' | 'red_flags'>('all');
  const [selectedPatient, setSelectedPatient] = useState<FirestoreQuestionnaireDocument | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [newAuthEmailInput, setNewAuthEmailInput] = useState('');

  // Check auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Determine if logged-in user is authorized
  const isUserAuthorized = (user: FirebaseUser | null): boolean => {
    if (isDemoAccess) return true;
    if (!user || !user.email) return false;
    const userEmail = user.email.toLowerCase().trim();

    if (AUTHORIZED_DOCTOR_EMAILS.includes(userEmail)) return true;
    if (customAuthorizedEmail && userEmail === customAuthorizedEmail.toLowerCase().trim()) return true;
    return false;
  };

  const loadQuestionnairesList = async () => {
    setIsLoadingData(true);
    try {
      const data = await getAllQuestionnaires();
      setQuestionnaires(data);
    } catch (err) {
      console.warn('Error loading questionnaires:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Subscribe to real-time questionnaires when authorized
  useEffect(() => {
    if (isUserAuthorized(currentUser)) {
      loadQuestionnairesList();
      const unsubscribe = subscribeToQuestionnaires((data) => {
        setQuestionnaires(data);
      });
      return () => unsubscribe();
    }
  }, [currentUser, isDemoAccess, customAuthorizedEmail]);

  // Keep selected patient updated with real-time updates
  useEffect(() => {
    if (selectedPatient) {
      const updated = questionnaires.find(
        (q) => (q.patientId || q.id) === (selectedPatient.patientId || selectedPatient.id)
      );
      if (updated) {
        setSelectedPatient(updated);
      }
    } else if (questionnaires.length > 0 && window.innerWidth >= 1024) {
      // Auto-select first patient on desktop if none selected
      setSelectedPatient(questionnaires[0]);
    }
  }, [questionnaires]);

  const handleGoogleLogin = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      setAuthError(error.message || 'Error al iniciar sesión con Google.');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setIsDemoAccess(false);
      localStorage.removeItem('vela_doctor_demo_mode');
    } catch (error) {
      console.error('Sign Out Error:', error);
    }
  };

  const handleEnableDemoMode = () => {
    setIsDemoAccess(true);
    localStorage.setItem('vela_doctor_demo_mode', 'true');
  };

  const handleSaveCustomEmail = () => {
    if (newAuthEmailInput.trim()) {
      const email = newAuthEmailInput.trim().toLowerCase();
      setCustomAuthorizedEmail(email);
      localStorage.setItem('vela_doctor_authorized_email', email);
      setShowConfigModal(false);
      setNewAuthEmailInput('');
    }
  };

  // Filter questionnaires
  const filteredQuestionnaires = questionnaires.filter((item) => {
    const nameMatch = (item.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const docMatch = (item.patientDocument || '').toLowerCase().includes(searchQuery.toLowerCase());
    const reasonMatch = (item.motivo_objetivos?.consultationReason || '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesSearch = nameMatch || docMatch || reasonMatch;
    if (!matchesSearch) return false;

    const isDone = item.isSavedByPatient || item.status === 'completado';
    if (selectedStatusFilter === 'completado') return isDone;
    if (selectedStatusFilter === 'en progreso') return !isDone;
    if (selectedStatusFilter === 'red_flags') return item.banderas_revisar && item.banderas_revisar.length > 0;

    return true;
  });

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'No registrado';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <VelaIcon size={40} className="animate-spin text-[#5B887E] mx-auto" />
          <p className="text-sm font-medium text-[#2E3A36]">Cargando Panel Médico de Vela...</p>
        </div>
      </div>
    );
  }

  // --- ACCESS CONTROL SCREEN ---
  const isAuthorized = isUserAuthorized(currentUser);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between p-4 sm:p-8">
        <header className="max-w-6xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VelaLogo height={36} />
            <div>
              <span
                className="text-lg font-medium text-[#2E3A36]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Vela
              </span>
              <span className="text-[10px] text-[#5B887E] block font-semibold uppercase tracking-wider">
                Panel Médico
              </span>
            </div>
          </div>

          <button
            onClick={onBackToApp}
            className="px-4 py-2 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al cuestionario</span>
          </button>
        </header>

        <main className="max-w-md w-full mx-auto my-12 bg-white rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/50 shadow-xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1
              className="text-2xl text-[#2E3A36] font-normal"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Acceso Restringido al Panel Médico
            </h1>
            <p className="text-xs text-[#5C6E68] leading-relaxed">
              Este espacio contiene historias clínicas confidenciales. Solo el personal médico autorizado de <strong>Vela (Dra. Lorena Castro)</strong> tiene permiso de consulta.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 rounded-2xl bg-[#FFF8F6] border border-[#F2A488] text-xs text-[#C66A4D] flex items-start gap-2 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {currentUser && !isAuthorized && (
            <div className="p-3.5 rounded-2xl bg-[#FAF0E6] border border-[#E8C5A5] text-xs text-[#8A4A1C] text-left space-y-1">
              <p className="font-semibold">Cuenta no autorizada:</p>
              <p className="text-[11px] truncate">{currentUser.email}</p>
              <p className="text-[10px] text-[#A2622D] pt-1">
                Para ingresar, inicia sesión con la cuenta de la Dra. Lorena (<code>comerconcalma@gmail.com</code>) o autoriza tu correo.
              </p>
            </div>
          )}

          <div className="space-y-3 pt-2">
            {!currentUser ? (
              <button
                id="btn-login-google"
                onClick={handleGoogleLogin}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#5B887E] hover:bg-[#477369] text-white font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-md cursor-pointer"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
                </svg>
                <span>Iniciar sesión con Google</span>
              </button>
            ) : (
              <button
                onClick={handleSignOut}
                className="w-full py-2.5 px-4 rounded-xl bg-white border border-[#E8E2D8] hover:bg-[#FAF6F0] text-[#5C6E68] text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar sesión actual</span>
              </button>
            )}

            {/* Quick Demo Access Mode */}
            <div className="pt-4 border-t border-[#E8E2D8]/60 space-y-2">
              <button
                onClick={handleEnableDemoMode}
                className="w-full py-2.5 px-3 rounded-xl bg-[#EBF3F0] hover:bg-[#D9EAE4] text-[#5B887E] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Ingresar en modo de prueba / demo</span>
              </button>

              <button
                onClick={() => setShowConfigModal(true)}
                className="text-[11px] text-[#8E9E99] hover:text-[#5B887E] underline"
              >
                Configurar correo de acceso médico
              </button>
            </div>
          </div>
        </main>

        <footer className="text-center text-xs text-[#8E9E99]">
          Vela • Plataforma Integral de Manejo Médico del Sobrepeso y la Obesidad
        </footer>

        {/* Modal: Config Email */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 border border-[#E8E2D8] shadow-xl">
              <h3 className="text-base font-semibold text-[#2E3A36]">Autorizar correo médico</h3>
              <p className="text-xs text-[#5C6E68]">
                Ingresa el correo de Google con el que deseas ingresar al panel médico:
              </p>
              <input
                type="email"
                placeholder="ejemplo@gmail.com"
                value={newAuthEmailInput}
                onChange={(e) => setNewAuthEmailInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#AEC9C0] text-xs text-[#2E3A36] focus:outline-none focus:ring-2 focus:ring-[#5B887E]"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-[#5C6E68] hover:bg-[#FAF6F0]"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveCustomEmail}
                  className="px-4 py-1.5 rounded-lg bg-[#5B887E] text-white text-xs font-semibold hover:bg-[#477369]"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- AUTHORIZED DOCTOR DASHBOARD ---
  const completedCount = questionnaires.filter((q) => q.isSavedByPatient || q.status === 'completado').length;
  const inProgressCount = questionnaires.filter((q) => !q.isSavedByPatient && q.status !== 'completado').length;
  const withRedFlagsCount = questionnaires.filter((q) => q.banderas_revisar && q.banderas_revisar.length > 0).length;

  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-[#E8E2D8] sticky top-0 z-30 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <VelaLogo height={34} />
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-base sm:text-lg font-medium text-[#2E3A36]"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Vela
                </span>
                <span className="px-2 py-0.5 rounded-full bg-[#EBF3F0] text-[#5B887E] text-[10px] font-bold uppercase tracking-wider border border-[#AEC9C0]/40">
                  Panel Médico
                </span>
              </div>
              <p className="text-[11px] text-[#5C6E68]">Dra. Lorena Castro • Cuestionarios Iniciales</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={loadQuestionnairesList}
              disabled={isLoadingData}
              title="Actualizar datos de Firestore"
              className="p-2 rounded-xl bg-[#FAF6F0] text-[#5B887E] hover:bg-[#EBF3F0] transition-colors border border-[#AEC9C0]/50 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onBackToApp}
              className="px-3.5 py-2 rounded-xl border border-[#AEC9C0] text-[#2E3A36] hover:bg-[#EBF3F0] text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ver Cuestionario Paciente</span>
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl text-[#5C6E68] hover:text-[#C66A4D] hover:bg-[#FFF8F6] transition-colors cursor-pointer"
              title="Cerrar sesión médica"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex-1 space-y-6">
        {/* Metric Quick Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] space-y-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#8E9E99]">Total Registros</span>
            <p className="text-xl sm:text-2xl font-bold text-[#2E3A36]">{questionnaires.length}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] space-y-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E7E48]">Cuestionarios Completos</span>
            <p className="text-xl sm:text-2xl font-bold text-[#1E7E48]">{completedCount}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E2D8] space-y-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#A2622D]">En Progreso</span>
            <p className="text-xl sm:text-2xl font-bold text-[#A2622D]">{inProgressCount}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#FFF8F6] border border-[#F2A488] space-y-1 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#C66A4D]">Con Banderas de Revisión</span>
            <p className="text-xl sm:text-2xl font-bold text-[#C66A4D]">{withRedFlagsCount}</p>
          </div>
        </div>

        {/* 2-Column Split: Patient List (5 cols) & Detailed View (7 cols) */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Left Column: Search & Patient List */}
          <div className={`col-span-12 lg:col-span-5 space-y-4 ${selectedPatient ? 'hidden lg:block' : 'block'}`}>
            {/* Search and Filters */}
            <div className="bg-white rounded-3xl p-4 border border-[#E8E2D8] shadow-2xs space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#8E9E99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar paciente por nombre o documento..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2.5 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] text-xs text-[#2E3A36] placeholder:text-[#8E9E99] focus:outline-none focus:ring-2 focus:ring-[#5B887E]"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8E9E99] hover:text-[#2E3A36]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'all'
                      ? 'bg-[#5B887E] text-white font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  Todas ({questionnaires.length})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('completado')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'completado'
                      ? 'bg-[#5B887E] text-white font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  Completadas ({completedCount})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('en progreso')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'en progreso'
                      ? 'bg-[#5B887E] text-white font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  En progreso ({inProgressCount})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('red_flags')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedStatusFilter === 'red_flags'
                      ? 'bg-[#F2A488] text-[#2E3A36] font-semibold'
                      : 'bg-[#FFF8F6] text-[#C66A4D] border border-[#F2A488]/40 hover:bg-[#FDEEE9]'
                  }`}
                >
                  <span>Revisar en consulta ({withRedFlagsCount})</span>
                </button>
              </div>
            </div>

            {/* List of Patients */}
            <div className="space-y-2.5 max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              {isLoadingData ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#5B887E] animate-spin mx-auto" />
                  <p className="text-xs text-[#5C6E68]">Cargando cuestionarios de Firestore...</p>
                </div>
              ) : filteredQuestionnaires.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-2">
                  <FileText className="w-6 h-6 text-[#8E9E99] mx-auto opacity-50" />
                  <p className="text-xs font-medium text-[#2E3A36]">No hay pacientes que coincidan con el filtro</p>
                  <p className="text-[11px] text-[#5C6E68]">Los registros aparecerán aquí automáticamente en tiempo real.</p>
                </div>
              ) : (
                filteredQuestionnaires.map((item) => {
                  const isSelected = selectedPatient?.patientId === item.patientId || selectedPatient?.id === item.id;
                  const hasRedFlags = item.banderas_revisar && item.banderas_revisar.length > 0;
                  const hasLabs = item.paraclinicos?.files && item.paraclinicos.files.length > 0;
                  const hasInBody = item.inbody?.files && item.inbody.files.length > 0;

                  return (
                    <div
                      key={item.patientId || item.id}
                      onClick={() => setSelectedPatient(item)}
                      className={`p-4 rounded-2xl border transition-all duration-150 cursor-pointer text-left space-y-2 ${
                        isSelected
                          ? 'bg-[#EBF3F0] border-[#5B887E] shadow-sm'
                          : 'bg-white border-[#E8E2D8] hover:border-[#AEC9C0]'
                      }`}
                    >
                      {/* Name & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-[#2E3A36] leading-snug">
                            {item.patientName || 'Paciente en registro'}
                          </p>
                          <p className="text-[11px] text-[#5C6E68]">
                            {item.identificacion?.documentType || 'CC'}: {item.patientDocument || 'Sin documento'}
                            {item.identificacion?.age ? ` • ${item.identificacion.age} años` : ''}
                          </p>
                        </div>

                        {/* Status badge */}
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              item.isSavedByPatient || item.status === 'completado'
                                ? 'bg-[#E5F7ED] text-[#1E7E48]'
                                : 'bg-[#FAF0E6] text-[#A2622D]'
                            }`}
                          >
                            {item.isSavedByPatient || item.status === 'completado'
                              ? '✓ Guardado'
                              : `Paso ${item.currentStep}/11`}
                          </span>

                          {/* Warm coral highlight for clinical review flag */}
                          {hasRedFlags && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FDEEE9] text-[#C66A4D] border border-[#F2A488] text-[10px] font-semibold"
                              title={`${item.banderas_revisar.length} hallazgo(s) sugerido(s) para revisar en consulta`}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#C66A4D]"></span>
                              <span>Revisar en consulta</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Consultation reason snippet */}
                      {item.motivo_objetivos?.consultationReason && (
                        <p className="text-[11px] text-[#5C6E68] line-clamp-1 italic bg-[#FAF6F0] p-1.5 rounded-lg border border-[#E8E2D8]/60">
                          "{item.motivo_objetivos.consultationReason}"
                        </p>
                      )}

                      {/* Footer tags (paraclinicos, inbody, timestamp) */}
                      <div className="flex items-center justify-between text-[10px] text-[#8E9E99] pt-1 border-t border-[#FAF6F0]">
                        <div className="flex items-center gap-2">
                          {hasLabs && (
                            <span className="text-[#5B887E] font-medium flex items-center gap-0.5">
                              <FileCheck2 className="w-3 h-3" /> Labs ({item.paraclinicos?.files.length})
                            </span>
                          )}
                          {hasInBody && (
                            <span className="text-[#5B887E] font-medium flex items-center gap-0.5">
                              <Activity className="w-3 h-3" /> InBody
                            </span>
                          )}
                        </div>
                        <span>Actualizado: {formatDate(item.updatedAt)}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Full Patient Details & PDF Download */}
          <div className={`col-span-12 lg:col-span-7 ${!selectedPatient ? 'hidden lg:block' : 'block'}`}>
            {selectedPatient ? (
              <DoctorPatientDetail
                patient={selectedPatient}
                onBackToList={() => setSelectedPatient(null)}
              />
            ) : (
              <div className="bg-white rounded-3xl p-12 border border-[#E8E2D8] text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center mx-auto shadow-2xs">
                  <User className="w-7 h-7" />
                </div>
                <h3
                  className="text-lg text-[#2E3A36] font-medium"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Selecciona una paciente
                </h3>
                <p className="text-xs text-[#5C6E68] max-w-sm mx-auto leading-relaxed">
                  Haz clic en cualquiera de las pacientes de la lista lateral para ver el desglose clínico completo de sus respuestas, banderas para revisar y descargar su historia clínica en PDF.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
