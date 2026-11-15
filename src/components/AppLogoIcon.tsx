import React from 'react';

interface AppLogoIconProps {
  className?: string;
}

export const AppLogoIcon: React.FC<AppLogoIconProps> = ({ className = 'w-8 h-8' }) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ksBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="100%" stopColor="#090D16" />
        </linearGradient>
        <linearGradient id="ksOrange" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Rounded App Squircle */}
      <rect width="64" height="64" rx="15" fill="url(#ksBg)" />
      <rect
        x="1.5"
        y="1.5"
        width="61"
        height="61"
        rx="13.5"
        stroke="#334155"
        strokeOpacity="0.8"
        strokeWidth="1.5"
      />

      {/* Left: Low-res pixel grid representation */}
      <rect x="11" y="16" width="18" height="32" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
      <rect x="14.5" y="21" width="5" height="5" rx="1" fill="#38BDF8" fillOpacity="0.55" />
      <rect x="21" y="21" width="5" height="5" rx="1" fill="#38BDF8" fillOpacity="0.25" />
      <rect x="14.5" y="27.5" width="5" height="5" rx="1" fill="#38BDF8" fillOpacity="0.25" />
      <rect x="21" y="27.5" width="5" height="5" rx="1" fill="#38BDF8" fillOpacity="0.8" />

      {/* Right: Crisp 4K Upscaled Video Frame */}
      <rect x="32" y="13" width="21" height="38" rx="4.5" fill="url(#ksOrange)" />
      <rect x="34" y="15" width="17" height="34" rx="3" fill="#090D16" />
      <path d="M39.5 25.5L47.5 31L39.5 36.5V25.5Z" fill="url(#ksOrange)" />

      {/* Center Split Line & Handle */}
      <line x1="31" y1="10" x2="31" y2="54" stroke="#FB923C" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="31" cy="32" r="4" fill="#090D16" stroke="#FB923C" strokeWidth="2" />
    </svg>
  );
};
