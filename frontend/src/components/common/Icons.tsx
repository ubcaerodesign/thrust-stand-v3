import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const EstopIcon: React.FC<IconProps> = ({ size = 16, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" fill="none" />
    <line x1="12" y1="7" x2="12" y2="13" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
    <rect x="11" y="16" width="2" height="2" fill={color} />
  </svg>
);

export const SunIcon: React.FC<IconProps> = ({ size = 14, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
    <line x1="12" y1="2" x2="12" y2="5" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="12" y1="19" x2="12" y2="22" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="2" y1="12" x2="5" y2="12" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="19" y1="12" x2="22" y2="12" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="4.93" y1="4.93" x2="7.05" y2="7.05" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="16.95" y1="16.95" x2="19.07" y2="19.07" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="4.93" y1="19.07" x2="7.05" y2="16.95" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="16.95" y1="7.05" x2="19.07" y2="4.93" stroke={color} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

export const MoonIcon: React.FC<IconProps> = ({ size = 14, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const RefreshIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polyline points="23 4 23 10 17 10" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <polyline points="1 20 1 14 7 14" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const SpinnerIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ ...style, animation: 'spin 1s linear infinite' }}>
    <circle cx="12" cy="12" r="9" stroke="rgba(201, 214, 234, 0.25)" strokeWidth="2.5" />
    <path d="M12 3a9 9 0 0 1 9 9" stroke={color} strokeWidth="2.5" strokeLinecap="square" />
  </svg>
);

export const TuneIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <line x1="4" y1="21" x2="4" y2="14" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="4" y1="10" x2="4" y2="3" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="12" y1="21" x2="12" y2="12" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="12" y1="8" x2="12" y2="3" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="20" y1="21" x2="20" y2="16" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="20" y1="12" x2="20" y2="3" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <rect x="2" y="10" width="4" height="4" stroke={color} strokeWidth="2" fill="none" />
    <rect x="10" y="8" width="4" height="4" stroke={color} strokeWidth="2" fill="none" />
    <rect x="18" y="12" width="4" height="4" stroke={color} strokeWidth="2" fill="none" />
  </svg>
);

export const PlayIcon: React.FC<IconProps> = ({ size = 12, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polygon points="5 3 19 12 5 21 5 3" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="miter" />
  </svg>
);

export const BoltIcon: React.FC<IconProps> = ({ size = 12, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="miter" />
  </svg>
);

export const DownloadIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <path d="M21 15v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-4" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <polyline points="7 10 12 15 17 10" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <line x1="12" y1="15" x2="12" y2="3" stroke={color} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

export const RecordDot: React.FC<IconProps> = ({ size = 10, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <rect x="4" y="4" width="16" height="16" fill={color} />
  </svg>
);

export const GripIcon: React.FC<IconProps> = ({ size = 12, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <circle cx="9" cy="5" r="1.5" fill={color} />
    <circle cx="15" cy="5" r="1.5" fill={color} />
    <circle cx="9" cy="12" r="1.5" fill={color} />
    <circle cx="15" cy="12" r="1.5" fill={color} />
    <circle cx="9" cy="19" r="1.5" fill={color} />
    <circle cx="15" cy="19" r="1.5" fill={color} />
  </svg>
);

export const CloseIcon: React.FC<IconProps> = ({ size = 14, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <line x1="18" y1="6" x2="6" y2="18" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <line x1="6" y1="6" x2="18" y2="18" stroke={color} strokeWidth="2" strokeLinecap="square" />
  </svg>
);

export const CheckIcon: React.FC<IconProps> = ({ size = 14, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polyline points="20 6 9 17 4 12" stroke={color} strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const SwapIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polyline points="17 8 21 12 17 16" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <line x1="3" y1="12" x2="21" y2="12" stroke={color} strokeWidth="2" strokeLinecap="square" />
    <polyline points="7 16 3 12 7 8" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);

export const ResetIcon: React.FC<IconProps> = ({ size = 13, color = 'currentColor', style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
    <polyline points="1 4 1 10 7 10" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" stroke={color} strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter" />
  </svg>
);