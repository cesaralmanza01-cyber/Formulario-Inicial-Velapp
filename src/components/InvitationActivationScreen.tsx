import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { VelaIcon } from './VelaIcon';
import { authService } from '../services/authService';
import { AppUser, InvitationDetails } from '../types';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, UserCheck, ShieldCheck } from 'lucide-react';

interface InvitationActivationScreenProps {
  token: string;
  onActivationSuccess: (user: AppUser) => void;
  onGoToLogin: () => void;
}

export function InvitationActivationScreen({
  token,
  onActivationSuccess,
  onGoToLogin,
}: InvitationActivationScreenProps) {
  const [isVerifying, setIsVerifying] = useState<boolean>(true);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState<boolean>(false);

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function checkToken() {
      setIsVerifying(true);
      setVerifyError(null);
      try {
        const res = await authService.getInvitationDetails(token);
        if (!isMounted) return;

        if (res.valid) {
          setInvitation(res);
        } else {
          const failRes = res as { valid: false; error: string; alreadyRegistered?: boolean };
          setVerifyError(failRes.error || 'Invitación no válida.');
          if (failRes.alreadyRegistered) {
            setAlreadyRegistered(true);
          }
        }
      } catch (err: any) {
        if (!isMounted) return;
        setVerifyError('Error al conectar con el servidor.');
      } finally {
        if (isMounted) setIsVerifying(false);
      }
    }

    checkToken();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!password || !confirmPassword) {
      setSubmitError('Por favor completa ambos campos de contraseña.');
      return;
    }

    if (password.length < 6) {
      setSubmitError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Las contraseñas no coinciden. Por favor verifica que sean iguales.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authService.registerInvited(token, password);
      if (res.success && res.user) {
        onActivationSuccess(res.user);
      } else {
        setSubmitError(res.error || 'No fue posible activar tu cuenta. Intenta de nuevo.');
      }
    } catch (err: any) {
      setSubmitError('Error de conexión al activar la cuenta.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isVerifying) {
    return (
      <div id="invitation_loading" className="min-h-screen bg-[#faf6f0] flex flex-col justify-center items-center px-4 font-sans">
        <div className="w-16 h-16 rounded-2xl bg-[#346a60] flex items-center justify-center shadow-md mb-4 animate-pulse">
          <VelaIcon className="w-10 h-10 text-[#fdfbf7]" />
        </div>
        <h2 className="text-xl font-serif text-[#1b3d36] mb-2">Verificando tu invitación...</h2>
        <p className="text-xs text-[#526a63]">Preparando tu espacio personalizado en Vela</p>
      </div>
    );
  }

  if (verifyError || !invitation) {
    return (
      <div id="invitation_error" className="min-h-screen bg-[#faf6f0] flex flex-col justify-center py-12 px-4 sm:px-6 font-sans">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white p-8 rounded-2xl border border-[#e2d9cd] shadow-sm text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-serif text-[#1b3d36] mb-2">
            {alreadyRegistered ? 'Cuenta ya activada' : 'Invitación no válida'}
          </h2>
          <p className="text-xs text-[#526a63] mb-6 leading-relaxed">
            {verifyError || 'El enlace que estás utilizando no es válido o ha expirado.'}
          </p>

          <button
            id="go_to_login_btn"
            type="button"
            onClick={onGoToLogin}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#346a60] hover:bg-[#28554d] transition cursor-pointer"
          >
            Ir a Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="invitation_activation_screen" className="min-h-screen bg-[#faf6f0] flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans text-[#2d3748]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#346a60] flex items-center justify-center shadow-md shadow-[#346a60]/20">
            <VelaIcon className="w-10 h-10 text-[#fdfbf7]" />
          </div>
        </div>

        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#e6f0ed] text-[#28554d] mb-2 border border-[#cbe0d9]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Invitación de la Dra. Lorena Castro
        </span>

        <h1 className="text-2xl sm:text-3xl font-serif text-[#1b3d36] tracking-tight">
          ¡Te damos la bienvenida a Vela!
        </h1>
        <p className="mt-1 text-sm text-[#4a7268] font-medium">
          Activa tu cuenta de paciente para comenzar
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#e2d9cd] rounded-2xl">
          {/* Pre-filled Patient Details Banner */}
          <div className="mb-6 p-4 rounded-xl bg-[#f5ede0] border border-[#e4d7c5] text-left">
            <div className="flex items-center gap-2 mb-1">
              <UserCheck className="w-4 h-4 text-[#346a60]" />
              <span className="text-xs font-bold text-[#1b3d36] uppercase tracking-wide">
                Datos de tu invitación
              </span>
            </div>
            <p className="text-sm font-semibold text-[#1b3d36]">{invitation.nombre}</p>
            <p className="text-xs text-[#526a63]">{invitation.email}</p>
          </div>

          <div className="mb-5">
            <h2 className="text-base font-semibold text-[#1b3d36]">Crea tu contraseña de acceso</h2>
            <p className="text-xs text-[#6e857f] mt-0.5">
              Con esta contraseña podrás retomar o consultar tu cuestionario en cualquier momento.
            </p>
          </div>

          {submitError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register_password" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Nueva Contraseña
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718580]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#718580] hover:text-[#346a60] transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register_confirm_password" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Confirma tu Contraseña
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718580]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register_confirm_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Escribe la misma contraseña"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] transition"
                />
              </div>
            </div>

            <button
              id="activate_account_submit_btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#346a60] hover:bg-[#28554d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#346a60] shadow-sm shadow-[#346a60]/30 transition disabled:opacity-60 cursor-pointer mt-3"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Activando tu cuenta...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Activar mi cuenta y comenzar</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#f0e7db] text-center">
            <button
              type="button"
              onClick={onGoToLogin}
              className="text-xs text-[#346a60] hover:underline font-medium cursor-pointer"
            >
              ¿Ya habías creado tu contraseña? Inicia sesión aquí
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
