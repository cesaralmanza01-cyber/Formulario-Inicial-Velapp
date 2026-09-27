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
    md: 42,
    lg: 56,
    xl: 72,
  };

  let actualHeight = 42;
  if (typeof height === 'number' && !isNaN(height) && height > 0) {
    actualHeight = height;
  } else if (typeof size === 'number' && !isNaN(size) && size > 0) {
    actualHeight = size;
  } else if (typeof size === 'string' && heightMap[size]) {
    actualHeight = heightMap[size];
  }

  return (
    <div className={`inline-flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="Vela Medicina & Nutrición"
        style={{ height: `${actualHeight}px`, width: 'auto', objectFit: 'contain' }}
        className="block max-w-full"
      />
    </div>
  );
};

