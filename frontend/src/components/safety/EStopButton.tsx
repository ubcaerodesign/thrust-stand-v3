import React from 'react';
import { EstopIcon } from '../common/Icons';

interface EStopButtonProps {
  onTrigger: () => void;
  isEstopActive: boolean;
}

export const EStopButton: React.FC<EStopButtonProps> = ({ onTrigger, isEstopActive }) => {
  return (
    <button
      onClick={onTrigger}
      style={{
        backgroundColor: isEstopActive ? '#7f1d1d' : 'var(--color-danger)',
        color: '#FFFFFF',
        border: isEstopActive ? '2px solid var(--brand-yellow)' : '1px solid rgba(255, 255, 255, 0.4)',
        padding: '8px 18px',
        borderRadius: '0px',
        fontFamily: 'var(--font-heading)',
        fontSize: '13px',
        fontWeight: 700,
        letterSpacing: '1px',
        cursor: 'pointer',
        boxShadow: isEstopActive ? '0 0 16px rgba(236, 235, 42, 0.6)' : '0 0 10px var(--color-danger-glow)',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <EstopIcon size={15} color="#FFFFFF" />
      {isEstopActive ? 'E-STOP ACTIVE (RESET)' : 'EMERGENCY STOP (SPACE)'}
    </button>
  );
};