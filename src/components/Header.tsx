import React from 'react';
import { VelaLogo } from './VelaLogo';
import { VelaIcon } from './VelaIcon';
import { Heart } from 'lucide-react';

interface HeaderProps {
  onResetDraft?: () => void;
  onOpenDoctorPortal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onResetDraft, onOpenDoctorPortal }) => {
  return (
    <header className="w-full bg-[#FAF6F0] border-b border-[#AEC9C0]/25 py-4 px-4 sm:px-8">
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {/* Left: Brand Logo exact as provided */}
        <div className="flex items-center">
          <div className="py-1">
            <VelaLogo size="md" />
          </div>
        </div>

        {/* Right: Sailboat Icon Badge & Medical project indicator */}
        <div className="flex items-center gap-3">
          {onOpenDoctorPortal && (
            <button
              onClick={onOpenDoctorPortal}
              id="btn-open-doctor-portal"
              title="Acceso reservado para la Dra. Lorena Castro"
              className="text-[11px] font-semibold text-[#5B887E] hover:text-[#2E3A36] bg-white/80 hover:bg-white border border-[#AEC9C0]/60 px-2.5 py-1.5 rounded-xl transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <span>Acceso Dra. Lorena</span>
            </button>
          )}

          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-xs font-semibold text-[#2E3A36] flex items-center gap-1">
              <Heart className="w-3 h-3 text-[#F2A488] fill-[#F2A488]" />
              Manejo Integral
            </span>
            <span className="text-[11px] text-[#5C6E68]">
              Sobrepeso & Obesidad
            </span>
          </div>

          <div
            title="Vela — Dra. Lorena Castro"
            className="w-10 h-10 rounded-2xl bg-white border border-[#AEC9C0]/40 shadow-xs flex items-center justify-center transition-transform hover:scale-105"
          >
            <VelaIcon size={26} />
          </div>
        </div>
      </div>
    </header>
  );
};
