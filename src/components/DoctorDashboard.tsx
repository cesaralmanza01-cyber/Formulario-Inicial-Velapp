import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VelaIcon } from './VelaIcon';
import { authService } from '../services/authService';
import { AppUser, PatientListItem, PatientClinicalStatus } from '../types';
import {
  Users,
  UserPlus,
  Copy,
  Check,
  Search,
  RefreshCw,
  LogOut,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileCheck2,
  Clock,
  Send,
  Sparkles,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import {
  getDriveServerStatus,
  DriveServerStatus,
  testDriveServerConnection,
} from '../services/googleDriveService';

interface DoctorDashboardProps {
  currentUser: AppUser;
  onLogout: () => void;
}

export function DoctorDashboard({ currentUser, onLogout }: DoctorDashboardProps) {
  const [patients, setPatients] = useState<PatientListItem[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState<boolean>(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);

  // New invitation form
  const [newPatientName, setNewPatientName] = useState<string>('');
  const [newPatientEmail, setNewPatientEmail] = useState<string>('');
  const [isCreatingInvite, setIsCreatingInvite] = useState<boolean>(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedInvite, setGeneratedInvite] = useState<{
    link: string;
    nombre: string;
    email: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // Search and filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'todos' | PatientClinicalStatus>('todos');

  // Copy feedback for patient rows
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);

  // Drive integration status
  const [showDrivePanel, setShowDrivePanel] = useState<boolean>(false);
  const [driveStatus, setDriveStatus] = useState<DriveServerStatus | null>(null);
  const [isCheckingDrive, setIsCheckingDrive] = useState<boolean>(false);
  const [isTestingDrive, setIsTestingDrive] = useState<boolean>(false);
  const [driveActionMsg, setDriveActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPatients = async () => {
    setIsLoadingPatients(true);
    setPatientsError(null);
    try {
      const res = await authService.getPatients();
      if (res.success) {
        setPatients(res.patients);
      } else {
        setPatientsError(res.error || 'No fue posible cargar el listado de pacientes.');
      }
    } catch (err: any) {
      setPatientsError('Error al conectar con el servidor.');
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, []);

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);

    const name = newPatientName.trim();
    const email = newPatientEmail.trim().toLowerCase();

    if (!name || !email) {
      setInviteError('Por favor ingresa el nombre y correo de la persona a invitar.');
      return;
    }

    setIsCreatingInvite(true);
    try {
      const res = await authService.createInvitation(name, email);
      if (res.success && res.inviteLink) {
        setGeneratedInvite({
          link: res.inviteLink,
          nombre: name,
          email,
        });
        setNewPatientName('');
        setNewPatientEmail('');
        // Reload list to include newly invited patient
        await loadPatients();
      } else {
        setInviteError(res.error || 'Error al generar la invitación.');
      }
    } catch (err: any) {
      setInviteError('Error de red al crear la invitación.');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyToClipboard = async (text: string, isMainModal = true, rowId?: string) => {
    try {
      await navigator.clipboard.writeText(text);
      if (isMainModal) {
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2500);
      }
      if (rowId) {
        setCopiedRowId(rowId);
        setTimeout(() => setCopiedRowId(null), 2500);
      }
    } catch (err) {
      console.warn('Clipboard write error:', err);
    }
  };

  // Check Drive Status
  const handleCheckDrive = async () => {
    setIsCheckingDrive(true);
    setDriveActionMsg(null);
    try {
      const status = await getDriveServerStatus();
      setDriveStatus(status);
    } catch (err: any) {
      setDriveActionMsg({ type: 'error', text: err?.message || 'Error consultando Google Drive' });
    } finally {
      setIsCheckingDrive(false);
    }
  };

  const handleTestDrive = async () => {
    setIsTestingDrive(true);
    setDriveActionMsg(null);
    try {
      const res = await testDriveServerConnection();
      if (res.success) {
        setDriveActionMsg({
          type: 'success',
          text: `¡Prueba exitosa! Archivo creado en Drive: "${res.fileName}"`,
        });
      } else {
        setDriveActionMsg({ type: 'error', text: res.error || 'Fallo en la prueba de Drive' });
      }
    } catch (err: any) {
      setDriveActionMsg({ type: 'error', text: err?.message || 'Error en prueba de Drive' });
    } finally {
      setIsTestingDrive(false);
    }
  };

  // Filtering patients
  const filteredPatients = patients.filter((p) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase().trim());

    const matchesStatus = statusFilter === 'todos' || p.clinicalStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const countTotal = patients.length;
  const countInvitados = patients.filter((p) => p.clinicalStatus === 'invitado').length;
  const countCuentaCreada = patients.filter((p) => p.clinicalStatus === 'cuenta creada').length;
  const countCompletados = patients.filter((p) => p.clinicalStatus === 'cuestionario completado').length;

  return (
    <div id="doctor_dashboard" className="min-h-screen bg-[#faf6f0] text-[#2d3748] font-sans pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-[#e2d9cd] sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#346a60] flex items-center justify-center text-white shadow-xs">
              <VelaIcon className="w-6 h-6 text-[#fdfbf7]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-[#1b3d36] text-base leading-tight">
                  Vela Medicina & Nutrición
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#e6f0ed] text-[#28554d] border border-[#cbe0d9]">
                  Panel Médico
                </span>
              </div>
              <p className="text-xs text-[#526a63]">Dra. Lorena Castro</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden md:inline-block text-xs text-[#6e857f]">
              {currentUser.email}
            </span>
            <button
              id="doctor_logout_btn"
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#d2c7b8] text-xs font-semibold text-[#405650] hover:bg-[#f4eee6] hover:text-[#1b3d36] transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border border-[#e2d9cd] shadow-xs">
            <p className="text-xs font-semibold text-[#6e857f] uppercase tracking-wider">Total Pacientes</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-serif font-bold text-[#1b3d36]">{countTotal}</p>
              <Users className="w-5 h-5 text-[#346a60]/60" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2d9cd] shadow-xs">
            <p className="text-xs font-semibold text-[#8b6914] uppercase tracking-wider">Invitaciones Pendientes</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-serif font-bold text-[#8b6914]">{countInvitados}</p>
              <Clock className="w-5 h-5 text-amber-500/60" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2d9cd] shadow-xs">
            <p className="text-xs font-semibold text-[#2563eb] uppercase tracking-wider">Cuenta Creada</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-serif font-bold text-[#2563eb]">{countCuentaCreada}</p>
              <ShieldCheck className="w-5 h-5 text-blue-500/60" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-[#e2d9cd] shadow-xs">
            <p className="text-xs font-semibold text-[#2e7d32] uppercase tracking-wider">Cuestionarios Listos</p>
            <div className="flex items-baseline justify-between mt-2">
              <p className="text-2xl font-serif font-bold text-[#2e7d32]">{countCompletados}</p>
              <FileCheck2 className="w-5 h-5 text-emerald-600/60" />
            </div>
          </div>
        </div>

        {/* Section: Create Patient Invitation */}
        <div className="bg-white p-6 rounded-2xl border border-[#e2d9cd] shadow-xs mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-4 border-b border-[#f0e7db]">
            <div>
              <h2 className="text-lg font-serif font-bold text-[#1b3d36] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#346a60]" />
                <span>Invitar a un Nuevo Paciente</span>
              </h2>
              <p className="text-xs text-[#526a63] mt-0.5">
                Genera un enlace único de invitación personalizado para que tu paciente cree su contraseña y responda el cuestionario clínico.
              </p>
            </div>
          </div>

          {inviteError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{inviteError}</span>
            </div>
          )}

          <form onSubmit={handleCreateInvitation} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label htmlFor="inv_patient_name" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Nombre Completo
              </label>
              <input
                id="inv_patient_name"
                type="text"
                required
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                placeholder="Ej: María Paula Gómez"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] transition"
              />
            </div>

            <div>
              <label htmlFor="inv_patient_email" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Correo Electrónico
              </label>
              <input
                id="inv_patient_email"
                type="email"
                required
                value={newPatientEmail}
                onChange={(e) => setNewPatientEmail(e.target.value)}
                placeholder="mariapaula@ejemplo.com"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] transition"
              />
            </div>

            <div>
              <button
                id="create_invitation_btn"
                type="submit"
                disabled={isCreatingInvite}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#346a60] hover:bg-[#28554d] transition shadow-xs disabled:opacity-60 cursor-pointer h-[42px]"
              >
                {isCreatingInvite ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Generando enlace...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generar Enlace de Invitación</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Success Banner when invitation is generated */}
          <AnimatePresence>
            {generatedInvite && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mt-6 p-5 rounded-xl bg-[#f2f8f6] border border-[#cbe4dc]"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#28554d]" />
                    <h3 className="text-sm font-bold text-[#1b3d36]">
                      ¡Invitación generada para {generatedInvite.nombre}!
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGeneratedInvite(null)}
                    className="text-xs text-[#6e857f] hover:text-[#1b3d36] cursor-pointer"
                  >
                    ✕ Cerrar aviso
                  </button>
                </div>

                <p className="text-xs text-[#405c54] mb-3">
                  Copia este enlace y envíaselo a tu paciente por WhatsApp, mensaje o el canal que prefieras:
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    id="generated_invite_link_input"
                    type="text"
                    readOnly
                    value={generatedInvite.link}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#bedcd2] rounded-lg text-[#1b3d36] select-all truncate"
                  />
                  <button
                    id="copy_generated_invite_btn"
                    type="button"
                    onClick={() => copyToClipboard(generatedInvite.link, true)}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#346a60] hover:bg-[#28554d] transition cursor-pointer shrink-0"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>¡Enlace Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar Enlace</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Section: Patients List */}
        <div className="bg-white rounded-2xl border border-[#e2d9cd] shadow-xs overflow-hidden">
          {/* List Header & Controls */}
          <div className="p-6 border-b border-[#f0e7db]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-serif font-bold text-[#1b3d36] flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#346a60]" />
                  <span>Listado de Pacientes</span>
                </h2>
                <p className="text-xs text-[#526a63] mt-0.5">
                  Visualiza el estado de cada paciente y copia el enlace de invitación de aquellos que aún no han completado el cuestionario.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="refresh_patients_btn"
                  type="button"
                  onClick={loadPatients}
                  disabled={isLoadingPatients}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#d2c7b8] text-xs font-semibold text-[#405650] hover:bg-[#f4eee6] transition cursor-pointer"
                  title="Actualizar listado"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingPatients ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* Search & Filter Tabs */}
            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#718580]">
                  <Search className="w-4 h-4" />
                </div>
                <input
                  id="search_patient_input"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nombre o correo..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-[#d2c7b8] bg-[#fdfbf7] focus:border-[#346a60] text-[#1b3d36]"
                />
              </div>

              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                {(['todos', 'invitado', 'cuenta creada', 'cuestionario completado'] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setStatusFilter(st)}
                    className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer capitalize ${
                      statusFilter === st
                        ? 'bg-[#346a60] text-white font-semibold'
                        : 'bg-[#f4ede2] text-[#61746f] hover:bg-[#ebe3d6]'
                    }`}
                  >
                    {st === 'todos' ? 'Todos' : st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* List Content */}
          {isLoadingPatients ? (
            <div className="p-12 text-center text-[#6e857f] flex flex-col items-center justify-center">
              <RefreshCw className="w-6 h-6 animate-spin mb-2 text-[#346a60]" />
              <p className="text-xs">Cargando pacientes de Vela...</p>
            </div>
          ) : patientsError ? (
            <div className="p-8 text-center text-red-600">
              <AlertCircle className="w-6 h-6 mx-auto mb-2" />
              <p className="text-xs">{patientsError}</p>
              <button
                type="button"
                onClick={loadPatients}
                className="mt-3 text-xs underline font-semibold text-[#346a60] cursor-pointer"
              >
                Reintentar
              </button>
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="p-12 text-center text-[#6e857f]">
              <Users className="w-8 h-8 mx-auto mb-2 text-[#b0bfba]" />
              <p className="text-sm font-serif text-[#1b3d36]">No se encontraron pacientes</p>
              <p className="text-xs mt-1 text-[#6e857f]">
                {searchTerm ? 'No hay resultados que coincidan con la búsqueda.' : 'Aún no has creado invitaciones para pacientes.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f9f5ee] border-b border-[#e2d9cd] text-[#526a63] font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Paciente</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4">Fecha Invitación</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f0e7db]">
                  {filteredPatients.map((p) => {
                    const isCopied = copiedRowId === p.id;
                    return (
                      <tr key={p.id} className="hover:bg-[#fcfaf7] transition">
                        <td className="py-3.5 px-4 font-semibold text-[#1b3d36] whitespace-nowrap">
                          {p.nombre}
                        </td>
                        <td className="py-3.5 px-4 text-[#526a63] whitespace-nowrap">
                          {p.email}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {p.clinicalStatus === 'invitado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Invitación pendiente (Sin activar)
                            </span>
                          )}
                          {p.clinicalStatus === 'cuenta creada' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Cuenta creada (Cuestionario pendiente)
                            </span>
                          )}
                          {p.clinicalStatus === 'cuestionario completado' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <FileCheck2 className="w-3 h-3 text-emerald-600" />
                              Cuestionario completado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#6e857f] whitespace-nowrap">
                          {p.fechaCreacion ? new Date(p.fechaCreacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {p.inviteLink && (
                            <button
                              type="button"
                              onClick={() => copyToClipboard(p.inviteLink!, false, p.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#bedcd2] bg-[#f2f8f6] hover:bg-[#e4f1ed] text-[#28554d] text-[11px] font-semibold transition cursor-pointer"
                              title="Copiar enlace de invitación"
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>¡Copiado!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copiar invitación</span>
                                </>
                              )}
                            </button>
                          )}

                          {p.cuestionarioDriveLink && (
                            <a
                              href={p.cuestionarioDriveLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 ml-2 px-2.5 py-1 rounded-lg border border-[#e2d9cd] bg-white hover:bg-[#f4ede2] text-[#1b3d36] text-[11px] font-semibold transition"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-[#346a60]" />
                              <span>Ver PDF / Drive</span>
                            </a>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Collapsible: Google Drive Integration Status */}
        <div className="mt-8 bg-white rounded-2xl border border-[#e2d9cd] p-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-[#346a60]" />
              <div>
                <h3 className="text-sm font-bold text-[#1b3d36]">Almacenamiento de Expedientes en Google Drive</h3>
                <p className="text-xs text-[#526a63]">Verifica la conexión con la carpeta de Google Drive donde se alojan los PDFs clínicos.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowDrivePanel(!showDrivePanel);
                if (!showDrivePanel && !driveStatus) {
                  handleCheckDrive();
                }
              }}
              className="text-xs font-semibold text-[#346a60] hover:underline cursor-pointer"
            >
              {showDrivePanel ? 'Ocultar detalles' : 'Ver estado de Google Drive'}
            </button>
          </div>

          {showDrivePanel && (
            <div className="mt-4 pt-4 border-t border-[#f0e7db]">
              {driveActionMsg && (
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    driveActionMsg.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}
                >
                  {driveActionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{driveActionMsg.text}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleCheckDrive}
                  disabled={isCheckingDrive}
                  className="px-3 py-1.5 rounded-lg border border-[#d2c7b8] text-xs font-semibold text-[#405650] hover:bg-[#f4eee6] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDrive ? 'animate-spin' : ''}`} />
                  <span>Consultar Estado</span>
                </button>

                <button
                  type="button"
                  onClick={handleTestDrive}
                  disabled={isTestingDrive}
                  className="px-3 py-1.5 rounded-lg bg-[#346a60] text-white text-xs font-semibold hover:bg-[#28554d] transition cursor-pointer inline-flex items-center gap-1.5"
                >
                  {isTestingDrive ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  <span>Probar Subida a Drive</span>
                </button>

                <a
                  href="/api/auth/google/login"
                  className="px-3 py-1.5 rounded-lg border border-[#346a60] text-[#346a60] text-xs font-semibold hover:bg-[#e6f0ed] transition inline-flex items-center gap-1.5"
                >
                  <span>Re-autorizar Google Drive</span>
                </a>
              </div>

              {driveStatus && (
                <div className="mt-3 p-3 bg-[#fdfbf7] rounded-xl border border-[#e8dfd2] text-xs text-[#526a63]">
                  <p><span className="font-semibold text-[#1b3d36]">Conectado:</span> {driveStatus.authorized ? 'Sí (Token Activo)' : 'No configurado'}</p>
                  {driveStatus.authorizedEmail && (
                    <p><span className="font-semibold text-[#1b3d36]">Cuenta autorizada:</span> {driveStatus.authorizedEmail}</p>
                  )}
                  {driveStatus.folderId && (
                    <p><span className="font-semibold text-[#1b3d36]">Carpeta destino:</span> {driveStatus.folderId}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
