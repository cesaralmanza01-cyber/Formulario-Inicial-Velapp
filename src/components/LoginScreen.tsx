import React, { useState } from 'react';
import { motion } from 'motion/react';
import { VelaIcon } from './VelaIcon';
import { authService } from '../services/authService';
import { AppUser, UserRole } from '../types';
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck, UserCheck, Stethoscope } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: AppUser) => void;
  defaultRole?: UserRole;
  invitationTokenMessage?: string | null;
}

export function LoginScreen({ onLoginSuccess, defaultRole = 'paciente', invitationTokenMessage }: LoginScreenProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [email, setEmail] = useState<string>(() => (defaultRole === 'doctora' ? 'comerconcalma@gmail.com' : ''));
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(invitationTokenMessage || null);

  const handleRoleChange = (role: UserRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    if (role === 'doctora' && !email) {
      setEmail('comerconcalma@gmail.com');
    } else if (role === 'paciente' && email === 'comerconcalma@gmail.com') {
      setEmail('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMessage('Por favor completa tu correo electrónico y contraseña.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authService.login(cleanEmail, password);
      if (res.success && res.user) {
        onLoginSuccess(res.user);
      } else {
        setErrorMessage(res.error || 'Correo o contraseña incorrectos.');
      }
    } catch (err: any) {
      setErrorMessage('Ocurrió un error al intentar iniciar sesión. Intenta nuevamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login_screen_container" className="min-h-screen bg-[#faf6f0] flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 font-sans text-[#2d3748]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-2xl bg-[#346a60] flex items-center justify-center shadow-md shadow-[#346a60]/20">
            <VelaIcon className="w-10 h-10 text-[#fdfbf7]" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-serif text-[#1b3d36] tracking-tight">
          Vela Medicina & Nutrición
        </h1>
        <p className="mt-1 text-sm text-[#4a7268] font-medium">
          Dra. Lorena Castro · Medicina Funcional
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-sm border border-[#e2d9cd] rounded-2xl">
          {/* Role selector tabs */}
          <div className="flex rounded-xl bg-[#f4ede2] p-1 mb-6 border border-[#e6dcce]">
            <button
              id="role_tab_paciente"
              type="button"
              onClick={() => handleRoleChange('paciente')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedRole === 'paciente'
                  ? 'bg-white text-[#1b3d36] shadow-sm font-semibold'
                  : 'text-[#61746f] hover:text-[#1b3d36]'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Soy Paciente</span>
            </button>
            <button
              id="role_tab_doctora"
              type="button"
              onClick={() => handleRoleChange('doctora')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                selectedRole === 'doctora'
                  ? 'bg-white text-[#1b3d36] shadow-sm font-semibold'
                  : 'text-[#61746f] hover:text-[#1b3d36]'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>Soy Doctora</span>
            </button>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-serif text-[#1b3d36]">
              {selectedRole === 'paciente' ? 'Ingreso para Pacientes' : 'Acceso Dra. Lorena Castro'}
            </h2>
            <p className="text-xs text-[#526a63] mt-0.5">
              {selectedRole === 'paciente'
                ? 'Ingresa tus credenciales para acceder a tu cuestionario previo a la consulta.'
                : 'Ingresa al panel médico para gestionar pacientes y generar invitaciones.'}
            </p>
          </div>

          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login_email" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Correo electrónico
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718580]">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login_email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={selectedRole === 'doctora' ? 'comerconcalma@gmail.com' : 'tu-correo@ejemplo.com'}
                  autoComplete="email"
                  className="block w-full pl-10 pr-3 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] placeholder-[#9caea9] transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login_password" className="block text-xs font-semibold text-[#344843] mb-1.5 uppercase tracking-wider">
                Contraseña
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#718580]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login_password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border border-[#d2c7b8] focus:border-[#346a60] focus:ring-2 focus:ring-[#346a60]/20 bg-[#fdfbf7] text-[#1b3d36] placeholder-[#9caea9] transition"
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

            <button
              id="login_submit_btn"
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-semibold text-white bg-[#346a60] hover:bg-[#28554d] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#346a60] shadow-sm shadow-[#346a60]/30 transition disabled:opacity-60 cursor-pointer mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verificando credenciales...</span>
                </>
              ) : (
                <span>Iniciar Sesión</span>
              )}
            </button>
          </form>

          {/* Contextual notice */}
          <div className="mt-6 pt-5 border-t border-[#f0e7db] text-center">
            {selectedRole === 'paciente' ? (
              <div className="bg-[#f9f5ee] p-3 rounded-xl border border-[#e8ded0] text-left">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#346a60] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#526a63] leading-relaxed">
                    <span className="font-semibold text-[#1b3d36]">¿Nuevo paciente?</span> La Dra. Lorena Castro te enviará un enlace de invitación único para activar tu cuenta y configurar tu contraseña.
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[#6e857f]">
                Panel médico privado con sesión protegida y cifrada.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
