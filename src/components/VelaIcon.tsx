import React from 'react';

interface VelaIconProps {
  className?: string;
  size?: number;
  showCircleBackground?: boolean;
}

export const VelaIcon: React.FC<VelaIconProps> = ({
  className = '',
  size = 40,
  showCircleBackground = false,
}) => {
  const svgContent = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Vela Icono"
    >
      {/* Top coral dot matching the brand logo */}
      <circle cx="48" cy="22" r="7.5" fill="#EE977B" />

      {/* Brand monogram 'V' in Fraunces serif and brand sage #5C8377 */}
      <text
        x="50"
        y="84"
        textAnchor="middle"
        fill="#5C8377"
        style={{
          fontFamily: "'Fraunces', Georgia, serif",
          fontWeight: 400,
          fontSize: '66px',
        }}
      >
        V
      </text>
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

