import React from 'react';

interface AppLogoIconProps {
  className?: string;
}

export const AppLogoIcon: React.FC<AppLogoIconProps> = ({
  className = 'w-8 h-8',
}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="bareetBg"
          x1="0"
          y1="0"
          x2="64"
          y2="64"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#12152A" />
          <stop offset="100%" stopColor="#07080F" />
        </linearGradient>
        <linearGradient
          id="bareetSignal"
          x1="8"
          y1="8"
          x2="56"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#7DD9FF" />
          <stop offset="50%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#0284C7" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="16" fill="url(#bareetBg)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="14.5"
        stroke="#1B2040"
        strokeWidth="1.5"
      />

      {/* Video Frame Outline */}
      <rect
        x="13"
        y="15"
        width="38"
        height="34"
        rx="7"
        fill="#0B0D18"
        stroke="url(#bareetSignal)"
        strokeWidth="2.2"
      />

      {/* Lightning / Bareet Engine Bolt Inside Frame */}
      <path
        d="M34.5 19L23.5 33H31.5L29.5 45L40.5 31H32.5L34.5 19Z"
        fill="url(#bareetSignal)"
      />
    </svg>
  );
};
