import React from 'react';

interface VelaIconProps {
  className?: string;
  size?: number;
  showCircleBackground?: boolean;
  color?: string;
  dotColor?: string;
}

export const VelaIcon: React.FC<VelaIconProps> = ({
  className = '',
  size = 40,
  showCircleBackground = false,
  color = '#588377',
  dotColor = '#E76F51',
}) => {
  const validSize = typeof size === 'number' && !isNaN(size) && size > 0 ? size : 40;

  const svgContent = (
    <svg
      width={validSize}
      height={validSize}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vela Icono Oficial"
    >
      {/* Top coral dot above the vertical mast */}
      <circle cx="46.5" cy="24.5" r="2.2" fill={dotColor} />

      {/* Vertical mast line */}
      <line
        x1="46.5"
        y1="28"
        x2="46.5"
        y2="70"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="butt"
      />

      {/* Horizontal base / hull line */}
      <line
        x1="33"
        y1="70"
        x2="62"
        y2="70"
        stroke={color}
        strokeWidth="2.4"
        strokeLinecap="round"
      />

      {/* Sail: vertical left edge, flat bottom, smooth convex outer arch */}
      <path
        d="M 50 30.5 C 51.5 35 63.8 48.5 63.8 66.8 L 50 66.8 Z"
        fill={color}
      />
    </svg>
  );

  if (showCircleBackground) {
    return (
      <div
        className="inline-flex items-center justify-center rounded-full bg-[#FAF6F0] border border-[#AEC9C0]/40 shadow-xs p-1"
      >
        {svgContent}
      </div>
    );
  }

  return svgContent;
};

