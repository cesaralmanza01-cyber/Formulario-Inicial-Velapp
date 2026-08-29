import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  ExternalLink,
  RefreshCw,
  FileText,
  UserCheck,
  Sparkles,
  Search,
  ArrowLeft,
  Lock,
  Check,
  Key,
  FolderOpen,
  Link2,
} from 'lucide-react';
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { VelaIcon } from './VelaIcon';
import {
  getDriveServerStatus,
  DriveServerStatus,
  testDriveServerConnection,
} from '../services/googleDriveService';

interface AdminPortalProps {
  onBackToApp: () => void;
}

const AUTHORIZED_EMAILS = ['comerconcalma@gmail.com', 'cesaralmanza01@gmail.com'];

export function AdminPortal({ onBackToApp }: AdminPortalProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Drive state
  const [driveStatus, setDriveStatus] = useState<DriveServerStatus | null>(null);
  const [isCheckingDrive, setIsCheckingDrive] = useState(false);
  const [isTestingDrive, setIsTestingDrive] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [testResultLink, setTestResultLink] = useState<string | null>(null);

  // Questionnaires list
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [isLoadingQuestionnaires, setIsLoadingQuestionnaires] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Listen to URL params for OAuth return status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('drive_connected') === 'true') {
      setActionSuccess('¡Google Drive conectado y autorizado exitosamente para la Dra. Lorena Castro!');
      // Clean up URL without reload
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('drive_error')) {
      const err = urlParams.get('drive_error');
      setActionError(`Error durante la autorización de Google Drive: ${err}`);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 2. Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userEmail = (user.email || '').toLowerCase().trim();
        const isAuthorized = AUTHORIZED_EMAILS.some((e) => e.toLowerCase() === userEmail);

        if (isAuthorized) {
          setCurrentUser(user);
          setAuthError(null);
        } else {
          // Unauthorized email
          signOut(auth);
          setCurrentUser(null);
          setAuthError(
            `El correo ${user.email} no tiene permisos de administración. Por favor ingresa con comerconcalma@gmail.com.`
          );
        }
      } else {
        setCurrentUser(null);
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  // 3. Fetch Drive status & recent questionnaires when authorized
  useEffect(() => {
    if (currentUser) {
      fetchDriveStatus();
      fetchQuestionnaires();
    }
  }, [currentUser]);

  const fetchDriveStatus = async () => {
    setIsCheckingDrive(true);
    try {
      const status = await getDriveServerStatus();
      setDriveStatus(status);
    } catch (err: any) {
      console.error('Error fetching drive status:', err);
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const fetchQuestionnaires = async () => {
    setIsLoadingQuestionnaires(true);
    try {
      const q = query(
        collection(db, 'cuestionarios_iniciales'),
        orderBy('updatedAt', 'desc'),
        limit(25)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setQuestionnaires(docs);
    } catch (err: any) {
      console.warn('Notice loading questionnaires from Firestore:', err);
    } finally {
      setIsLoadingQuestionnaires(false);
    }
  };

  // Google Auth login handler
  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = (result.user.email || '').toLowerCase().trim();
      const isAuthorized = AUTHORIZED_EMAILS.some((e) => e.toLowerCase() === email);

      if (!isAuthorized) {
        await signOut(auth);
        setAuthError(
          `La cuenta ${result.user.email} no está autorizada. Inicia sesión con la cuenta oficial: comerconcalma@gmail.com.`
        );
      }
    } catch (err: any) {
      console.error('Sign in error:', err);
      setAuthError(err?.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
  };

  // Initiate OAuth connect flow for Google Drive
  const handleConnectGoogleDrive = () => {
    window.location.href = '/api/auth/google/login';
  };

  // Test Drive Upload with stored refresh token
  const handleTestDriveUpload = async () => {
    setIsTestingDrive(true);
    setActionError(null);
    setActionSuccess(null);
    setTestResultLink(null);

    try {
      const result = await testDriveServerConnection();
      if (result.success && result.webViewLink) {
        setActionSuccess('¡Prueba de subida exitosa! El archivo PDF de prueba se subió directamente a tu Google Drive personal.');
        setTestResultLink(result.webViewLink);
      } else {
        setActionError(result.error || 'Falló la prueba de subida a Google Drive.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'Error en la prueba de subida.');
    } finally {
      setIsTestingDrive(false);
    }
  };

  // Filtered questionnaires
  const filteredQuestionnaires = questionnaires.filter((q) => {
    const name = (q.patientName || q.basicInfo?.fullName || '').toLowerCase();
    const docId = (q.id || '').toLowerCase();
    const term = searchTerm.toLowerCase().trim();
    return name.includes(term) || docId.includes(term);
  });

  // Loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-[#588377] animate-spin mb-4" />
        <p className="text-sm font-medium text-[#5C6E68]">Verificando permisos de administración médica...</p>
      </div>
    );
  }

  // Not authenticated screen
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#FAF6F0] flex flex-col justify-between p-4 sm:p-8">
        {/* Top bar */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <button
            onClick={onBackToApp}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#588377] hover:text-[#2E3A36] bg-white px-3.5 py-2 rounded-xl border border-[#AEC9C0]/40 shadow-xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Volver al Cuestionario
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white border border-[#AEC9C0]/40 flex items-center justify-center shadow-xs">
              <VelaIcon size={20} />
            </div>
            <span className="text-xs font-semibold text-[#2E3A36]">Vela — Portal Médico</span>
          </div>
        </header>

        {/* Login Box */}
        <main className="max-w-md w-full mx-auto my-auto py-12">
          <div className="bg-white rounded-3xl p-8 border border-[#AEC9C0]/40 shadow-sm text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F0F7F4] border border-[#588377]/20 flex items-center justify-center mx-auto mb-6 shadow-xs">
              <Lock className="w-8 h-8 text-[#588377]" />
            </div>

            <h1 className="text-xl font-bold text-[#2E3A36] mb-2 font-serif">
              Portal Médico — Dra. Lorena Castro
            </h1>
            <p className="text-xs text-[#5C6E68] mb-6 leading-relaxed">
              Área de administración médica para el seguimiento de cuestionarios de pacientes y estado de sincronización con Google Drive.
            </p>

            {authError && (
              <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">{authError}</p>
              </div>
            )}

            <button
              onClick={handleSignIn}
              disabled={isSigningIn}
              className="w-full flex items-center justify-center gap-3 bg-[#588377] hover:bg-[#476C62] active:bg-[#3D5C53] text-white font-semibold text-sm py-3.5 px-6 rounded-2xl shadow-sm hover:shadow transition-all disabled:opacity-60"
            >
              {isSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="currentColor"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="currentColor"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Iniciar sesión con Google</span>
                </>
              )}
            </button>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-[#8E9E99]">
              <ShieldCheck className="w-3.5 h-3.5 text-[#588377]" />
              <span>Protegido por Firebase Authentication</span>
            </div>
          </div>
        </main>

        <footer className="text-center text-[11px] text-[#8E9E99] py-4">
          Vela Medicina & Nutrición Integral — Dra. Lorena Castro
        </footer>
      </div>
    );
  }

  // Authenticated Doctor Dashboard
  return (
    <div className="min-h-screen bg-[#FAF6F0] flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#AEC9C0]/30 shadow-xs px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#F0F7F4] border border-[#588377]/30 flex items-center justify-center">
              <VelaIcon size={22} />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#2E3A36] leading-tight font-serif">
                Panel de Control Médico
              </h1>
              <p className="text-[11px] text-[#588377] font-medium">
                Dra. Lorena Castro — Vela
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-[#F0F7F4] rounded-full border border-[#588377]/20 text-xs text-[#2E3A36]">
              <UserCheck className="w-3.5 h-3.5 text-[#588377]" />
              <span className="font-medium">{currentUser.email}</span>
            </div>

            <button
              onClick={onBackToApp}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2E3A36] bg-[#FAF6F0] hover:bg-[#F0ECE4] px-3.5 py-2 rounded-xl border border-[#AEC9C0]/40 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cuestionario</span>
            </button>

            <button
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-3.5 py-2 rounded-xl border border-rose-200 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl w-full mx-auto p-4 sm:p-8 flex-1 space-y-8">
        {/* Banner Alert for Action Results */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-900 text-xs"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">{actionSuccess}</p>
                {testResultLink && (
                  <a
                    href={testResultLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-emerald-700 underline font-medium hover:text-emerald-800"
                  >
                    <span>Ver archivo de prueba en tu Google Drive</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
              <button
                onClick={() => setActionSuccess(null)}
                className="text-emerald-500 hover:text-emerald-700 text-xs font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}

          {actionError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-900 text-xs"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold">Atención:</p>
                <p className="mt-0.5">{actionError}</p>
              </div>
              <button
                onClick={() => setActionError(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section 1: Google Drive Integration Status & OAuth Button */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/40 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#AEC9C0]/20">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#F0F7F4] border border-[#588377]/20 flex items-center justify-center text-[#588377]">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-[#2E3A36] font-serif">
                  Conexión con Google Drive
                </h2>
                <p className="text-xs text-[#5C6E68]">
                  Sincronización automática de cuestionarios en la carpeta personal de la Dra. Lorena Castro
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchDriveStatus}
                disabled={isCheckingDrive}
                className="inline-flex items-center gap-1.5 text-xs text-[#5C6E68] hover:text-[#2E3A36] bg-[#FAF6F0] px-3 py-2 rounded-xl border border-[#AEC9C0]/30 transition-colors"
                title="Actualizar estado"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDrive ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* Drive Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/30 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8E9E99] uppercase tracking-wider">
                Estado de la Conexión
              </p>
              <div className="flex items-center gap-2">
                {driveStatus?.connected ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-emerald-700">Conectado y Autorizado</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-sm font-bold text-amber-700">Desconectado</span>
                  </>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/30 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8E9E99] uppercase tracking-wider">
                Cuenta de Google Vinculada
              </p>
              <p className="text-xs font-mono font-medium text-[#2E3A36] truncate" title={driveStatus?.authorizedEmail || 'comerconcalma@gmail.com'}>
                {driveStatus?.authorizedEmail || 'Pendiente de autorización'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#FAF6F0] border border-[#AEC9C0]/30 space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8E9E99] uppercase tracking-wider">
                Carpeta de Destino
              </p>
              <p className="text-sm font-bold text-[#588377] truncate">
                {driveStatus?.folderName || 'FORMULARIO CONSULTAS VELA'}
              </p>
            </div>
          </div>

          {/* Action Box */}
          <div className="p-5 rounded-2xl bg-[#F0F7F4] border border-[#588377]/20 space-y-4">
            <div className="flex items-start gap-3 text-xs text-[#2E3A36] leading-relaxed">
              <ShieldCheck className="w-5 h-5 text-[#588377] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-[#2E3A36] mb-1">
                  Autorización única del Administrador Médico (OAuth con Refresh Token)
                </p>
                <p className="text-[#5C6E68]">
                  Al presionar <strong>"Conectar Google Drive"</strong>, autorizas a la aplicación a subir archivos en tu cuenta de Google (<code className="bg-white/80 px-1.5 py-0.5 rounded border border-[#588377]/20 font-mono text-[11px]">comerconcalma@gmail.com</code>). El servidor guardará el token de actualización de forma segura en Firestore para que cuando cualquier paciente complete su formulario, el PDF se deposite automáticamente en tu carpeta sin que la paciente deba iniciar sesión.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={handleConnectGoogleDrive}
                className="inline-flex items-center gap-2 bg-[#588377] hover:bg-[#476C62] active:bg-[#3D5C53] text-white font-semibold text-xs py-3 px-5 rounded-xl shadow-xs transition-all"
              >
                <Link2 className="w-4 h-4" />
                <span>{driveStatus?.connected ? 'Reconectar / Cambiar Cuenta de Google Drive' : 'Conectar Google Drive de la Dra. Lorena'}</span>
              </button>

              {driveStatus?.connected && (
                <button
                  onClick={handleTestDriveUpload}
                  disabled={isTestingDrive}
                  className="inline-flex items-center gap-2 bg-white hover:bg-[#FAF6F0] active:bg-[#F0ECE4] text-[#588377] font-semibold text-xs py-3 px-5 rounded-xl border border-[#588377]/40 shadow-xs transition-all disabled:opacity-60"
                >
                  {isTestingDrive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Subiendo prueba a Google Drive...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Probar Subida a Google Drive</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Section 2: Recent Patient Questionnaires in Firestore */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-[#AEC9C0]/40 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#AEC9C0]/20">
            <div>
              <h2 className="text-lg font-bold text-[#2E3A36] font-serif">
                Expedientes y Cuestionarios Recientes
              </h2>
              <p className="text-xs text-[#5C6E68]">
                Registros almacenados en Firestore con su enlace de respaldo en Google Drive
              </p>
            </div>

            {/* Search Input */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-[#8E9E99] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar paciente o ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#FAF6F0] border border-[#AEC9C0]/40 rounded-xl text-xs text-[#2E3A36] focus:outline-none focus:ring-2 focus:ring-[#588377]/30"
              />
            </div>
          </div>

          {/* Table / List */}
          {isLoadingQuestionnaires ? (
            <div className="py-12 text-center text-xs text-[#5C6E68]">
              <Loader2 className="w-6 h-6 text-[#588377] animate-spin mx-auto mb-2" />
              <span>Cargando expedientes de Firestore...</span>
            </div>
          ) : filteredQuestionnaires.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8E9E99] bg-[#FAF6F0] rounded-2xl border border-dashed border-[#AEC9C0]/40">
              <FileText className="w-8 h-8 text-[#AEC9C0] mx-auto mb-2" />
              <p className="font-semibold text-[#5C6E68]">No se encontraron cuestionarios registrados</p>
              <p className="text-[11px] mt-1">Los cuestionarios completados por tus pacientes aparecerán aquí automáticamente.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#AEC9C0]/30 text-[#8E9E99] uppercase text-[10px] tracking-wider font-semibold">
                    <th className="py-3 px-3">Paciente</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Paso / Estado</th>
                    <th className="py-3 px-3">Google Drive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#AEC9C0]/20">
                  {filteredQuestionnaires.map((q) => {
                    const patientName =
                      q.patientName ||
                      q.basicInfo?.fullName ||
                      `Paciente (${q.patientId?.substring(0, 8) || q.id?.substring(0, 8)})`;
                    const dateStr = q.updatedAt
                      ? new Date(q.updatedAt).toLocaleDateString('es-CO', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Reciente';
                    const hasDriveLink = Boolean(q.driveLink || q.driveInfo?.webViewLink);
                    const driveUrl = q.driveLink || q.driveInfo?.webViewLink;

                    return (
                      <tr key={q.id} className="hover:bg-[#FAF6F0]/60 transition-colors">
                        <td className="py-3 px-3 font-semibold text-[#2E3A36]">
                          {patientName}
                          <div className="text-[10px] text-[#8E9E99] font-mono">
                            ID: {q.patientId || q.id}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-[#5C6E68] whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                              q.status === 'completed' || q.completedAt
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {q.status === 'completed' || q.completedAt ? (
                              <>
                                <Check className="w-3 h-3" />
                                Completado
                              </>
                            ) : (
                              `Paso ${q.currentStep || 1}`
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {hasDriveLink ? (
                            <a
                              href={driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#F0F7F4] text-[#588377] hover:bg-[#588377] hover:text-white border border-[#588377]/30 transition-all font-medium"
                            >
                              <HardDrive className="w-3.5 h-3.5" />
                              <span>Abrir en Drive</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-[#8E9E99] italic text-[11px]">
                              Pendiente de sincronizar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#AEC9C0]/30 py-6 px-4 text-center text-xs text-[#5C6E68]">
        <p className="font-semibold text-[#2E3A36]">Vela — Dirección Médica Dra. Lorena Castro</p>
        <p className="text-[11px] text-[#8E9E99] mt-1">
          Acceso protegido con autenticación de dos factores y reglas de seguridad de Firestore
        </p>
      </footer>
    </div>
  );
}
