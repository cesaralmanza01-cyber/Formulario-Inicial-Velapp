import React from 'react';

interface VelaLogoProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  height?: number;
}

export const VelaLogo: React.FC<VelaLogoProps> = ({
  className = '',
  size = 'md',
  height,
}) => {
  const heightMap: Record<string, number> = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 52,
    xl: 64,
  };

  let actualHeight = 40;
  if (typeof height === 'number' && !isNaN(height) && height > 0) {
    actualHeight = height;
  } else if (typeof size === 'number' && !isNaN(size) && size > 0) {
    actualHeight = size;
  } else if (typeof size === 'string' && heightMap[size]) {
    actualHeight = heightMap[size];
  }

  return (
    <div className={`inline-flex items-center shrink-0 overflow-visible select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Vela Medicina & Nutrición"
        style={{ height: `${actualHeight}px`, width: 'auto', objectFit: 'contain' }}
        className="block object-contain shrink-0 max-w-none"
      />
    </div>
  );
};

