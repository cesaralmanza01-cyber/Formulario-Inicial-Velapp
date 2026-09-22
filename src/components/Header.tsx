import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { VelaLogo } from './VelaLogo';
import { VelaIcon } from './VelaIcon';
import { Heart, RotateCcw, Link2, Check, AlertTriangle, LogOut, User } from 'lucide-react';
import { getCleanNewPatientUrl } from '../utils/draftStorage';
import { AppUser } from '../types';

interface HeaderProps {
  onResetDraft?: () => void;
  currentUser?: AppUser | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetDraft, currentUser, onLogout }) => {
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyNewLink = async () => {
    const url = getCleanNewPatientUrl();
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleConfirmReset = () => {
    setShowConfirmModal(false);
    if (onResetDraft) {
      onResetDraft();
    }
  };

  return (
    <>
      <header className="w-full bg-[#FAF6F0] border-b border-[#AEC9C0]/25 py-3 sm:py-4 px-4 sm:px-8 relative z-20">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand Logo */}
          <div className="flex items-center shrink-0">
            <div className="py-1">
              <VelaLogo size="md" />
            </div>
          </div>

          {/* Right: Actions & Medical indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Botón para reiniciar cuestionario */}
            {onResetDraft && (
              <button
                type="button"
                id="btn-restart-questionnaire"
                onClick={() => setShowConfirmModal(true)}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium text-[#5C6E68] hover:text-[#C05646] bg-white/90 hover:bg-[#FDF2F0] border border-[#D9D3C8] hover:border-[#E8B4A6] transition-all duration-200 cursor-pointer shadow-2xs group"
                title="Reiniciar cuestionario (dejar todo en blanco para un nuevo paciente)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#8E9E99] group-hover:text-[#C05646] transition-colors" />
                <span className="hidden sm:inline">Reiniciar cuestionario</span>
                <span className="sm:hidden">Reiniciar</span>
              </button>
            )}

            {/* Botón para copiar enlace que siempre abre en blanco */}
            <button
              type="button"
              id="btn-copy-nuevo-link"
              onClick={handleCopyNewLink}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#588377] hover:text-[#2E3A36] bg-[#EBF3F0]/80 hover:bg-[#EBF3F0] border border-[#AEC9C0]/50 transition-all duration-200 cursor-pointer shadow-2xs"
              title="Copiar link para paciente nuevo (garantiza que siempre abre en blanco con ?nuevo=1)"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#588377]" />
                  <span className="hidden md:inline">¡Link en blanco copiado!</span>
                  <span className="md:hidden">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Link2 className="w-3.5 h-3.5 text-[#588377]" />
                  <span className="hidden md:inline">Link paciente nuevo (?nuevo=1)</span>
                  <span className="md:hidden">Link nuevo</span>
                </>
              )}
            </button>

            {/* Medical project indicator */}
            <div className="hidden lg:flex flex-col items-end text-right border-l border-[#AEC9C0]/30 pl-3">
              <span className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1">
                <Heart className="w-3 h-3 text-[#F2A488] fill-[#F2A488]" />
                Manejo Integral
              </span>
              <span className="text-[11px] text-[#5C6E68]">
                Sobrepeso & Obesidad
              </span>
            </div>

            {/* Patient session badge & Logout button */}
            {currentUser && onLogout && (
              <div className="flex items-center gap-2 pl-2 border-l border-[#AEC9C0]/30">
                <div className="hidden sm:flex flex-col items-end text-right">
                  <span className="text-xs font-bold text-[#1b3d36] max-w-[130px] truncate" title={currentUser.nombre}>
                    {currentUser.nombre.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-[#526a63]">Paciente</span>
                </div>
                <button
                  type="button"
                  id="btn-header-logout"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-[#5C6E68] hover:text-[#C05646] bg-white/90 hover:bg-[#FDF2F0] border border-[#D9D3C8] hover:border-[#E8B4A6] transition-all cursor-pointer shadow-2xs"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#8E9E99] hover:text-[#C05646]" />
                  <span className="hidden sm:inline">Cerrar sesión</span>
                </button>
              </div>
            )}

            <div
              title="Vela — Dra. Lorena Castro"
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-white border border-[#AEC9C0]/40 shadow-xs flex items-center justify-center transition-transform hover:scale-105 shrink-0"
            >
              <VelaIcon size={24} />
            </div>
          </div>
        </div>
      </header>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-restart-title"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-white rounded-3xl p-6 border border-[#D9D3C8] shadow-xl text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#FDF2F0] border border-[#E8B4A6]/60 flex items-center justify-center mx-auto text-[#C05646]">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3
                  id="confirm-restart-title"
                  className="text-base font-bold text-[#2E3A36] font-serif"
                >
                  ¿Reiniciar cuestionario?
                </h3>
                <p className="text-xs text-[#5C6E68] leading-relaxed">
                  ¿Confirmas que deseas reiniciar? Se perderá el progreso actual guardado en este navegador y el cuestionario volverá a comenzar en blanco desde el inicio.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF6F0] border border-[#E8E2D8] text-[11px] text-[#5C6E68] text-left">
                <p className="font-semibold text-[#2E3A36] mb-0.5">Nota importante:</p>
                <p>
                  Esto solo borra el borrador temporal en curso. Los cuestionarios completados y enviados con anterioridad no se verán afectados.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#D9D3C8] text-xs font-semibold text-[#5C6E68] hover:bg-[#FAF6F0] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  id="btn-confirm-restart-now"
                  onClick={handleConfirmReset}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#C05646] hover:bg-[#A84536] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Sí, reiniciar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

