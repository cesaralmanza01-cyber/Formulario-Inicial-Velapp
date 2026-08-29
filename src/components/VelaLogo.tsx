import React from 'react';

interface VelaLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  height?: number;
}

export const VelaLogo: React.FC<VelaLogoProps> = ({
  className = '',
  size = 'md',
  height,
}) => {
  const heightMap = {
    xs: 24,
    sm: 32,
    md: 42,
    lg: 56,
    xl: 72,
  };

  const actualHeight = height || heightMap[size];
  // Proportions matching the official "Velapp" logo with top coral dot
  const actualWidth = Math.round(actualHeight * 2.6);

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <svg
        width={actualWidth}
        height={actualHeight}
        viewBox="0 0 210 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Velapp Logo"
        className="overflow-visible"
      >
        {/* Coral / peach dot above the 'V' matching the exact brand asset */}
        <circle cx="21" cy="14" r="5.5" fill="#EE977B" />

        {/* Wordmark: Velapp in the exact brand typography (Fraunces serif) and color (#5C8377) */}
        <text
          x="1"
          y="64"
          fill="#5C8377"
          style={{
            fontFamily: "'Fraunces', Georgia, serif",
            fontWeight: 400,
            fontSize: '58px',
            letterSpacing: '-0.025em',
          }}
        >
          Velapp
        </text>
      </svg>
    </div>
  );
};

