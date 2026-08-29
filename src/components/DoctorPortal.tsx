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
  UploadedLabFile,
} from '../types';
import {
  subscribeToQuestionnaires,
  getAllQuestionnaires,
} from '../services/questionnaireService';
import { VelaLogo } from './VelaLogo';
import { VelaIcon } from './VelaIcon';
import {
  Search,
  LogOut,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  User,
  Activity,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Eye,
  Filter,
  Lock,
  Stethoscope,
  HeartHandshake,
  AlertCircle,
  FileCheck2,
  Scale,
  Sparkles,
  ArrowLeft,
  X,
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

  // Load questionnaires when authorized
  useEffect(() => {
    if (!isDemoAccess && (!currentUser || !isUserAuthorized(currentUser))) {
      setQuestionnaires([]);
      return;
    }

    setIsLoadingData(true);
    // Realtime subscription
    const unsubscribe = subscribeToQuestionnaires((data) => {
      setQuestionnaires(data);
      setIsLoadingData(false);
    });

    // Fallback one-time fetch
    loadQuestionnairesList();

    return () => unsubscribe();
  }, [currentUser, customAuthorizedEmail, isDemoAccess]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      setAuthError(err.message || 'Error al iniciar sesión con Google.');
    }
  };

  const handleDemoAccess = () => {
    setIsDemoAccess(true);
    localStorage.setItem('vela_doctor_demo_mode', 'true');
    loadQuestionnairesList();
  };

  const handleSignOut = async () => {
    try {
      setIsDemoAccess(false);
      localStorage.removeItem('vela_doctor_demo_mode');
      await signOut(auth);
      setSelectedPatient(null);
    } catch (err) {
      console.error('Signout error:', err);
    }
  };

  const handleSaveCustomEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newAuthEmailInput.trim().toLowerCase();
    setCustomAuthorizedEmail(clean);
    localStorage.setItem('vela_doctor_authorized_email', clean);
    setShowConfigModal(false);
  };

  // Filter questionnaires
  const filteredQuestionnaires = questionnaires.filter((item) => {
    // Search query by name or document
    const nameMatch = (item.patientName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const docMatch = (item.patientDocument || '').toLowerCase().includes(searchQuery.toLowerCase());
    const queryMatches = searchQuery.trim() === '' || nameMatch || docMatch;

    if (!queryMatches) return false;

    // Status filter
    if (selectedStatusFilter === 'completado') return item.status === 'completado';
    if (selectedStatusFilter === 'en progreso') return item.status === 'en progreso';
    if (selectedStatusFilter === 'red_flags') return item.banderas_revisar && item.banderas_revisar.length > 0;

    return true;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // 1. Loading screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center p-4 text-[#2E3A36]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#EBF3F0] text-[#5B887E] flex items-center justify-center mx-auto animate-pulse">
            <VelaIcon size={24} />
          </div>
          <p className="text-sm font-medium text-[#5C6E68]">Verificando credenciales médicas...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated or Unauthorized Screen
  if (!currentUser || !isUserAuthorized(currentUser)) {
    const isLoggedUnauthorized = currentUser && !isUserAuthorized(currentUser);

    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between p-4 sm:p-8 text-[#2E3A36]">
        {/* Top bar */}
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VelaLogo size="md" />
            <div className="pl-3 border-l border-[#AEC9C0]/40">
              <span className="text-xs text-[#5B887E] block font-sans font-semibold">Portal Médico • Dra. Lorena Castro</span>
              <span className="text-[11px] text-[#5C6E68]">Manejo médico e integral del sobrepeso y la obesidad</span>
            </div>
          </div>

          <button
            onClick={onBackToApp}
            className="text-xs text-[#5C6E68] hover:text-[#2E3A36] flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg border border-[#AEC9C0]/50 hover:bg-[#EBF3F0] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Ir al Cuestionario</span>
          </button>
        </div>

        {/* Login Card */}
        <div className="max-w-md w-full mx-auto my-12 bg-white rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/60 shadow-md space-y-6">
          <div className="text-center space-y-3">
            <div className="flex justify-center pb-1">
              <VelaLogo size="lg" />
            </div>
            <h1
              className="text-xl sm:text-2xl text-[#2E3A36] font-normal pt-1"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Acceso a Fichas Clínicas
            </h1>
            <p className="text-xs sm:text-sm text-[#5C6E68] leading-relaxed">
              Área reservada para la revisión de cuestionarios iniciales, alertas clínicas, exámenes de laboratorio e InBody de pacientes de la Dra. Lorena Castro.
            </p>
          </div>

          {/* Unauthorized Alert */}
          {isLoggedUnauthorized && (
            <div className="p-4 rounded-2xl bg-[#FFF8F6] border border-[#F2A488] text-[#C66A4D] text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cuenta no autorizada</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Has iniciado sesión como <strong>{currentUser.email}</strong>, pero esta cuenta no está registrada en la lista de acceso médico.
              </p>
              <div className="pt-1 flex gap-2">
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="px-3 py-1.5 bg-[#C66A4D] text-white rounded-lg text-[11px] font-semibold hover:bg-[#B2593D] transition-colors cursor-pointer"
                >
                  Cerrar sesión e intentar con otra
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="px-3 py-1.5 border border-[#F2A488] text-[#C66A4D] rounded-lg text-[11px] font-semibold hover:bg-[#FDEEE9] transition-colors cursor-pointer"
                >
                  Configurar correo médico
                </button>
              </div>
            </div>
          )}

          {/* Auth Error Banner */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-[#FDEEE9] border border-[#F2A488] text-[#C66A4D] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* Google Sign In Button & Quick Test Access */}
          {!currentUser && !isDemoAccess ? (
            <div className="space-y-3">
              <button
                type="button"
                id="btn-doctor-google-login"
                onClick={handleGoogleSignIn}
                className="w-full py-3.5 px-4 rounded-2xl bg-[#FAF6F0] hover:bg-[#EBF3F0] text-[#2E3A36] border border-[#AEC9C0] font-medium text-sm transition-all duration-200 flex items-center justify-center gap-3 shadow-2xs cursor-pointer hover:border-[#5B887E]"
              >
                {/* Google "G" Icon */}
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Iniciar sesión con Google</span>
              </button>

              <button
                type="button"
                id="btn-doctor-direct-access"
                onClick={handleDemoAccess}
                className="w-full py-3 px-4 rounded-2xl bg-[#5B887E] hover:bg-[#486D65] text-white font-medium text-xs sm:text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Stethoscope className="w-4 h-4 shrink-0" />
                <span>Ingresar al Panel de Pacientes (Acceso Directo)</span>
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-[11px] text-[#5B887E] hover:underline cursor-pointer"
                >
                  ¿Deseas autorizar un correo específico para la Dra. Lorena?
                </button>
              </div>
            </div>
          ) : null}

          {/* Privacy Note */}
          <div className="pt-2 border-t border-[#E8E2D8] flex items-center gap-2.5 text-[11px] text-[#5C6E68]">
            <ShieldCheck className="w-4 h-4 text-[#5B887E] shrink-0" />
            <span>Acceso médico encriptado bajo estándares de confidencialidad en salud.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#5C6E68]">
          Vela — Manejo médico e integral del sobrepeso y la obesidad • Panel Administrativo
        </div>

        {/* Modal for setting custom authorized doctor email */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-[#AEC9C0] shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm sm:text-base font-semibold text-[#2E3A36]">
                  Configurar correo médico de acceso
                </h2>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="p-1 text-[#5C6E68] hover:text-[#2E3A36] rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-[#5C6E68] leading-relaxed">
                Ingresa la cuenta de Google de la Dra. Lorena Castro (o la que utilices para acceder). Se guardará para autorizar el ingreso al panel médico:
              </p>

              <form onSubmit={handleSaveCustomEmail} className="space-y-4">
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  defaultValue={customAuthorizedEmail || currentUser?.email || ''}
                  onChange={(e) => setNewAuthEmailInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6F0] border border-[#D9D3C8] text-xs sm:text-sm text-[#2E3A36] focus:outline-hidden focus:ring-2 focus:ring-[#5B887E]/40"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-[#5C6E68] hover:bg-[#FAF6F0]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#5B887E] text-white hover:bg-[#477369] shadow-xs"
                  >
                    Guardar y autorizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. Authorized Doctor Dashboard
  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#2E3A36] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white/90 backdrop-blur-md border-b border-[#E8E2D8] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <VelaLogo size="sm" />
            <div className="pl-3 border-l border-[#AEC9C0]/40">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-[#EBF3F0] text-[#5B887E] text-[10px] font-semibold tracking-wide">
                  Panel Médico
                </span>
                <span className="text-xs font-semibold text-[#2E3A36]">Dra. Lorena Castro</span>
              </div>
              <p className="text-[11px] text-[#5C6E68]">Manejo médico e integral del sobrepeso y la obesidad</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onBackToApp}
              className="text-xs text-[#5C6E68] hover:text-[#2E3A36] hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#AEC9C0]/50 hover:bg-[#FAF6F0] transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#5B887E]" />
              <span>Ver cuestionario</span>
            </button>

            {/* Doctor info pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E8E2D8]">
              <button
                type="button"
                onClick={loadQuestionnairesList}
                disabled={isLoadingData}
                title="Recargar fichas"
                className="p-2 rounded-xl text-[#5C6E68] hover:text-[#5B887E] hover:bg-[#EBF3F0] transition-colors cursor-pointer flex items-center gap-1 text-xs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin text-[#5B887E]' : ''}`} />
                <span className="hidden sm:inline">Actualizar</span>
              </button>

              <div className="text-right hidden md:block pl-2">
                <p className="text-xs font-semibold text-[#2E3A36]">{currentUser?.displayName || 'Dra. Lorena Castro'}</p>
                <p className="text-[10px] text-[#8E9E99] truncate max-w-[160px]">{currentUser?.email || 'Acceso Médico Directo'}</p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Cerrar sesión"
                className="p-2 rounded-xl text-[#5C6E68] hover:text-[#C66A4D] hover:bg-[#FDEEE9] transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Patient List (4 cols on desktop, full on mobile) */}
          <div className={`space-y-4 ${selectedPatient ? 'hidden lg:block lg:col-span-5' : 'col-span-12 lg:col-span-5'}`}>
            {/* Search and Filters Bar */}
            <div className="bg-white rounded-3xl p-4 sm:p-5 border border-[#AEC9C0]/50 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm sm:text-base font-semibold text-[#2E3A36]">
                    Pacientes registradas
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#FAF6F0] text-[#5B887E] text-xs font-bold border border-[#E8E2D8]">
                    {filteredQuestionnaires.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowConfigModal(true)}
                  className="text-[11px] text-[#5B887E] hover:underline"
                >
                  Configurar correos
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8E9E99] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar paciente por nombre o cédula..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9.5 pr-4 py-2.5 rounded-2xl bg-[#FAF6F0]/80 border border-[#D9D3C8] text-xs text-[#2E3A36] placeholder-[#8E9E99] focus:outline-hidden focus:ring-2 focus:ring-[#5B887E]/40 focus:bg-white"
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

              {/* Quick Filter Tabs */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  onClick={() => setSelectedStatusFilter('all')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'all'
                      ? 'bg-[#5B887E] text-white shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  Todas ({questionnaires.length})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('completado')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'completado'
                      ? 'bg-[#5B887E] text-white shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  Completadas
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('en progreso')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    selectedStatusFilter === 'en progreso'
                      ? 'bg-[#5B887E] text-white shadow-2xs font-semibold'
                      : 'bg-[#FAF6F0] text-[#5C6E68] hover:bg-[#EBF3F0]'
                  }`}
                >
                  En progreso
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('red_flags')}
                  className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    selectedStatusFilter === 'red_flags'
                      ? 'bg-[#F2A488] text-[#2E3A36] font-semibold shadow-2xs'
                      : 'bg-[#FFF8F6] text-[#C66A4D] border border-[#F2A488]/40 hover:bg-[#FDEEE9]'
                  }`}
                >
                  <span>Revisar en consulta</span>
                  <span className="w-2 h-2 rounded-full bg-[#C66A4D]"></span>
                </button>
              </div>
            </div>

            {/* List of Patients */}
            <div className="space-y-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {isLoadingData ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#5B887E] animate-spin mx-auto" />
                  <p className="text-xs text-[#5C6E68]">Cargando cuestionarios de Firestore...</p>
                </div>
              ) : filteredQuestionnaires.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-[#E8E2D8] space-y-2">
                  <FileText className="w-6 h-6 text-[#8E9E99] mx-auto opacity-50" />
                  <p className="text-xs font-medium text-[#2E3A36]">No hay pacientes que coincidan con la búsqueda</p>
                  <p className="text-[11px] text-[#5C6E68]">Los registros aparecerán aquí automáticamente en tiempo real.</p>
                </div>
              ) : (
                filteredQuestionnaires.map((item) => {
                  const isSelected = selectedPatient?.patientId === item.patientId;
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
                          : 'bg-white border-[#E8E2D8] hover:border-[#AEC9C0] hover:shadow-2xs'
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
                              item.status === 'completado'
                                ? 'bg-[#E5F7ED] text-[#1E7E48]'
                                : 'bg-[#FAF0E6] text-[#A2622D]'
                            }`}
                          >
                            {item.status === 'completado' ? 'Completado' : `Paso ${item.currentStep}/11`}
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

          {/* Right Column: Full Patient Details (7 cols on desktop) */}
          <div className={`col-span-12 lg:col-span-7 ${!selectedPatient ? 'hidden lg:block' : 'block'}`}>
            {selectedPatient ? (
              <div className="bg-white rounded-3xl p-5 sm:p-7 border border-[#AEC9C0]/50 shadow-sm space-y-6">
                
                {/* Detail Header with back-on-mobile */}
                <div className="flex items-start justify-between gap-3 border-b border-[#E8E2D8] pb-4">
                  <div className="space-y-1">
                    <button
                      onClick={() => setSelectedPatient(null)}
                      className="lg:hidden text-xs text-[#5B887E] flex items-center gap-1 font-semibold mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Volver a lista
                    </button>
                    <h2
                      className="text-xl sm:text-2xl text-[#2E3A36] font-normal leading-tight"
                      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                      {selectedPatient.patientName}
                    </h2>
                    <p className="text-xs text-[#5C6E68]">
                      {selectedPatient.identificacion?.documentType || 'CC'}: {selectedPatient.patientDocument || 'Sin documento'} •{' '}
                      {selectedPatient.identificacion?.birthDate ? `Nacimiento: ${selectedPatient.identificacion.birthDate}` : ''}
                      {selectedPatient.identificacion?.age ? ` (${selectedPatient.identificacion.age} años)` : ''} •{' '}
                      {selectedPatient.identificacion?.civilStatus || 'Estado civil no esp.'}
                    </p>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      selectedPatient.status === 'completado'
                        ? 'bg-[#E5F7ED] text-[#1E7E48]'
                        : 'bg-[#FAF0E6] text-[#A2622D]'
                    }`}
                  >
                    {selectedPatient.status === 'completado' ? 'Cuestionario Completado' : `En progreso (Paso ${selectedPatient.currentStep})`}
                  </span>
                </div>

                {/* Clinical Red Flags Banner (Warm Coral #F2A488 Highlight) */}
                {selectedPatient.banderas_revisar && selectedPatient.banderas_revisar.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#FFF8F6] border-2 border-[#F2A488] space-y-2.5">
                    <div className="flex items-center gap-2 text-[#C66A4D] font-semibold text-xs sm:text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Puntos clínicos para revisar con atención en consulta ({selectedPatient.banderas_revisar.length})</span>
                    </div>
                    <div className="space-y-1.5">
                      {selectedPatient.banderas_revisar.map((flag, idx) => (
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
                    <User className="w-3.5 h-3.5" /> 1. Identificación y Antecedentes Generales
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#2E3A36]">
                    <div><strong>Ocupación:</strong> {selectedPatient.identificacion?.occupation || 'No especificada'}</div>
                    <div><strong>Estado civil:</strong> {selectedPatient.identificacion?.civilStatus || 'No especificado'}</div>
                    <div><strong>Cómo nos conoció:</strong> {selectedPatient.identificacion?.referralSource || 'No especificado'} {selectedPatient.identificacion?.referralOtherDetails ? `(${selectedPatient.identificacion.referralOtherDetails})` : ''}</div>
                    <div><strong>Inicio cuestionario:</strong> {formatDate(selectedPatient.startedAt)}</div>
                  </div>
                </div>

                {/* Section 2: Motivo y Objetivos */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
                    <HeartHandshake className="w-3.5 h-3.5" /> 2. Motivo y Objetivos de Consulta
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
                    <div>
                      <span className="text-[#5C6E68] block font-medium">Motivo principal:</span>
                      <p className="font-semibold mt-0.5">{selectedPatient.motivo_objetivos?.consultationReason || 'No especificado'}</p>
                    </div>
                    {selectedPatient.motivo_objetivos?.expectedGoals && (
                      <div>
                        <span className="text-[#5C6E68] block font-medium">Metas que espera lograr:</span>
                        <p className="mt-0.5">{selectedPatient.motivo_objetivos.expectedGoals}</p>
                      </div>
                    )}
                    {selectedPatient.motivo_objetivos?.futureVision && (
                      <div>
                        <span className="text-[#5C6E68] block font-medium">Visión en 6 meses:</span>
                        <p className="mt-0.5">{selectedPatient.motivo_objetivos.futureVision}</p>
                      </div>
                    )}
                    {selectedPatient.motivo_objetivos?.currentObstacles && (
                      <div>
                        <span className="text-[#5C6E68] block font-medium">Obstáculos actuales:</span>
                        <p className="mt-0.5">{selectedPatient.motivo_objetivos.currentObstacles}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 3: Relación con el Peso y Trayectoria */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5" /> 3. Historial y Relación con el Peso
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-medium">
                      <div className="p-2 bg-white rounded-xl border border-[#E8E2D8]">
                        <span className="text-[10px] text-[#5C6E68] block">Peso actual:</span>
                        <span className="text-sm font-bold text-[#5B887E]">{selectedPatient.relacion_peso?.currentWeightKg ? `${selectedPatient.relacion_peso.currentWeightKg} kg` : '—'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#E8E2D8]">
                        <span className="text-[10px] text-[#5C6E68] block">Estatura:</span>
                        <span className="text-sm font-bold text-[#5B887E]">{selectedPatient.relacion_peso?.heightCm ? `${selectedPatient.relacion_peso.heightCm} cm` : '—'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#E8E2D8]">
                        <span className="text-[10px] text-[#5C6E68] block">Menor peso +18:</span>
                        <span className="text-xs font-semibold">{selectedPatient.relacion_peso?.lowestWeightEver || '—'}</span>
                      </div>
                      <div className="p-2 bg-white rounded-xl border border-[#E8E2D8]">
                        <span className="text-[10px] text-[#5C6E68] block">Mayor peso +18:</span>
                        <span className="text-xs font-semibold">{selectedPatient.relacion_peso?.highestWeightEver || '—'}</span>
                      </div>
                    </div>
                    {selectedPatient.relacion_peso?.weightFluctuationCount && (
                      <p><strong>Fluctuaciones de peso:</strong> {selectedPatient.relacion_peso.weightFluctuationCount} • Recuperación: {selectedPatient.relacion_peso.weightRegainSpeed || 'No especificada'}</p>
                    )}
                    {selectedPatient.relacion_peso?.usedWeightMedications && (
                      <p><strong>Fármacos para peso:</strong> {selectedPatient.relacion_peso.usedWeightMedications} {selectedPatient.relacion_peso.weightMedicationsNames ? `(${selectedPatient.relacion_peso.weightMedicationsNames})` : ''}</p>
                    )}
                  </div>
                </div>

                {/* Section 4: Mapa de Salud y Antecedentes Médicos */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5" /> 4. Mapa de Salud y Antecedentes
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-1.5 text-[#2E3A36]">
                    <div><strong>Patológicos:</strong> {selectedPatient.mapa_salud?.medicalHistory || 'Niega'}</div>
                    <div><strong>Farmacológicos:</strong> {selectedPatient.mapa_salud?.pharmacologicalHistory || 'Niega'}</div>
                    <div><strong>Quirúrgicos:</strong> {selectedPatient.mapa_salud?.surgicalHistory || 'Niega'}</div>
                    <div><strong>Alérgicos / Tóxicos:</strong> {selectedPatient.mapa_salud?.toxicAllergicHistory || 'Niega'}</div>
                    {selectedPatient.mapa_salud?.familyHistory && (
                      <div><strong>Familiares:</strong> {selectedPatient.mapa_salud.familyHistory.join(', ')}</div>
                    )}
                  </div>
                </div>

                {/* Section 5: Revisión por Sistemas y Síntomas */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> 5. Revisión por Sistemas
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-1.5 text-[#2E3A36]">
                    <div><strong>Patrón de energía:</strong> {selectedPatient.revision_sistemas?.energyPattern || 'No especificado'}</div>
                    <div><strong>Estrés (1-10):</strong> {selectedPatient.revision_sistemas?.moodSleepHabits?.stressLevel || '—'}/10 • <strong>Sueño:</strong> {selectedPatient.revision_sistemas?.moodSleepHabits?.sleepHours || '—'} horas</div>
                    <div><strong>Hábito intestinal:</strong> {selectedPatient.revision_sistemas?.digestiveHabits?.bowelFrequency || 'No esp.'} • Dificultad: {selectedPatient.revision_sistemas?.digestiveHabits?.hasDifficultyDefecating || 'No'}</div>
                  </div>
                </div>

                {/* Section 6 & 7: Alimentación y Movimiento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-1 text-[#2E3A36]">
                    <span className="font-bold text-[#5B887E] block text-[11px] uppercase">6. Alimentación</span>
                    <p><strong>Rutina:</strong> {selectedPatient.entrevista_dietetica?.mealRoutinePattern || 'No esp.'}</p>
                    <p><strong>Hambre física vs emocional:</strong> {selectedPatient.entrevista_dietetica?.hungerFullnessAwareness || 'No esp.'}</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-1 text-[#2E3A36]">
                    <span className="font-bold text-[#5B887E] block text-[11px] uppercase">7. Movimiento</span>
                    <p><strong>Actividad diaria:</strong> {selectedPatient.actividad_fisica?.dailyActivityType || 'No esp.'}</p>
                    <p><strong>Ejercicio estructurado:</strong> {selectedPatient.actividad_fisica?.structuredExerciseFrequency || 'No esp.'}</p>
                  </div>
                </div>

                {/* Section 9: Paraclínicos y Archivos Adjuntos */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <FileCheck2 className="w-3.5 h-3.5" /> 9. Exámenes de Laboratorio
                    </span>
                    <span className="text-[11px] font-normal text-[#5C6E68]">
                      {selectedPatient.paraclinicos?.hasRecentLabs || 'No'}
                    </span>
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-2 text-[#2E3A36]">
                    {selectedPatient.paraclinicos?.notesOrFindings && (
                      <p className="italic text-[#5C6E68]">"{selectedPatient.paraclinicos.notesOrFindings}"</p>
                    )}
                    {selectedPatient.paraclinicos?.files && selectedPatient.paraclinicos.files.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-[#2E3A36]">Archivos adjuntos:</span>
                        {selectedPatient.paraclinicos.files.map((file) => (
                          <div key={file.id} className="p-2.5 rounded-xl bg-white border border-[#D9D3C8] flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#2E3A36] truncate">{file.name}</p>
                              <p className="text-[10px] text-[#8E9E99]">{file.description || 'Sin notas'}</p>
                            </div>
                            {file.downloadUrl ? (
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-[#5B887E] text-white text-xs font-semibold flex items-center gap-1 hover:bg-[#477369] transition-colors shrink-0"
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
                      <p className="text-[#8E9E99] text-[11px]">No se adjuntaron paraclínicos.</p>
                    )}
                  </div>
                </div>

                {/* Section 10: InBody y Composición Corporal */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#5B887E] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5" /> 10. Registro InBody / Bioimpedancia
                    </span>
                    <span className="text-[11px] font-normal text-[#5C6E68]">
                      {selectedPatient.inbody?.hasInBodyReport || 'No'}
                    </span>
                  </h3>
                  <div className="p-4 rounded-2xl bg-[#FAF6F0]/70 border border-[#E8E2D8] text-xs space-y-3 text-[#2E3A36]">
                    {selectedPatient.inbody?.extractedMetrics && (
                      <div className="p-3.5 rounded-xl bg-white border border-[#AEC9C0] shadow-2xs space-y-2.5">
                        <div className="flex items-center justify-between border-b border-[#E8E2D8] pb-1.5">
                          <span className="font-bold text-[#5B887E] text-[11px] flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Parámetros InBody Extraídos Automáticamente:
                          </span>
                          {selectedPatient.inbody.extractedMetrics.fechaExamen && (
                            <span className="text-[10px] text-[#5C6E68]">
                              Fecha: {selectedPatient.inbody.extractedMetrics.fechaExamen}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                          {selectedPatient.inbody.extractedMetrics.pesoKg != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Peso</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.pesoKg} kg</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.tallaCm != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Talla</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.tallaCm} cm</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.porcentajeGrasaCorporal != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#C66A4D]">% Grasa</p>
                              <p className="font-bold text-[#C66A4D] text-xs">{selectedPatient.inbody.extractedMetrics.porcentajeGrasaCorporal}%</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.masaGrasaCorporalKg != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Masa Grasa</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.masaGrasaCorporalKg} kg</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.masaMuscularEsqueleticaKg != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#5B887E]">Masa Muscular</p>
                              <p className="font-bold text-[#5B887E] text-xs">{selectedPatient.inbody.extractedMetrics.masaMuscularEsqueleticaKg} kg</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.masaLibreDeGrasaKg != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Masa Libre Grasa</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.masaLibreDeGrasaKg} kg</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.nivelGrasaVisceral != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#C66A4D]">Grasa Visceral</p>
                              <p className="font-bold text-[#C66A4D] text-xs">Nivel {selectedPatient.inbody.extractedMetrics.nivelGrasaVisceral}</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.aguaCorporalTotalLt != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Agua Total</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.aguaCorporalTotalLt} L</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.imc != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">IMC</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.imc} kg/m²</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.tasaMetabolicaBasalKcal != null && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0]">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">TMB</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.tasaMetabolicaBasalKcal} kcal</p>
                            </div>
                          )}
                          {selectedPatient.inbody.extractedMetrics.modeloEquipo && (
                            <div className="p-2 rounded-lg bg-[#FAF6F0] col-span-2">
                              <p className="text-[9px] uppercase font-bold text-[#8E9E99]">Equipo</p>
                              <p className="font-bold text-[#2E3A36] text-xs">{selectedPatient.inbody.extractedMetrics.modeloEquipo}</p>
                            </div>
                          )}
                        </div>

                        {selectedPatient.inbody.extractedMetrics.observacionesClinicas && (
                          <p className="text-[11px] text-[#5C6E68] italic pt-1 border-t border-[#E8E2D8]">
                            "{selectedPatient.inbody.extractedMetrics.observacionesClinicas}"
                          </p>
                        )}
                      </div>
                    )}

                    {selectedPatient.inbody?.knownMetrics && (
                      <p><strong>Métricas reportadas:</strong> {selectedPatient.inbody.knownMetrics}</p>
                    )}
                    {selectedPatient.inbody?.notesOrGoals && (
                      <p className="italic text-[#5C6E68]">"{selectedPatient.inbody.notesOrGoals}"</p>
                    )}
                    {selectedPatient.inbody?.files && selectedPatient.inbody.files.length > 0 ? (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-[#2E3A36]">Reportes InBody adjuntos:</span>
                        {selectedPatient.inbody.files.map((file) => (
                          <div key={file.id} className="p-2.5 rounded-xl bg-white border border-[#D9D3C8] flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-[#2E3A36] truncate">{file.name}</p>
                              <p className="text-[10px] text-[#8E9E99]">{file.description || 'Sin notas'}</p>
                            </div>
                            {file.downloadUrl ? (
                              <a
                                href={file.downloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg bg-[#5B887E] text-white text-xs font-semibold flex items-center gap-1 hover:bg-[#477369] transition-colors shrink-0"
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
                  Haz clic en cualquiera de las pacientes de la lista lateral para ver el desglose clínico completo de sus respuestas, banderas para revisar y descargar sus archivos.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
};
