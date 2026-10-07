import React from 'react';

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
        border: isEstopActive ? '2px solid var(--brand-yellow)' : '2px solid rgba(255, 255, 255, 0.4)',
        padding: '10px 22px',
        borderRadius: '6px',
        fontFamily: 'var(--font-heading)',
        fontSize: '14px',
        fontWeight: 700,
        letterSpacing: '1px',
        cursor: 'pointer',
        boxShadow: isEstopActive ? '0 0 15px rgba(236, 235, 42, 0.6)' : '0 0 12px var(--color-danger-glow)',
        transition: 'all 0.15s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      <span style={{ fontSize: '16px' }}>🛑</span>
      {isEstopActive ? 'E-STOP ACTIVE (RESET)' : 'EMERGENCY STOP (SPACE)'}
    </button>
  );
};