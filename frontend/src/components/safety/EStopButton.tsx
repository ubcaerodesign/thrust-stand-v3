import React from 'react';

interface EStopButtonProps {
  onTrigger: () => void;
  isEstopActive?: boolean;
}

export const EStopButton: React.FC<EStopButtonProps> = ({ onTrigger, isEstopActive = false }) => {
  return (
    <button
      onClick={onTrigger}
      style={{
        backgroundColor: isEstopActive ? 'var(--bg-base)' : 'var(--color-danger)',
        color: isEstopActive ? 'var(--color-danger)' : 'white',
        border: `2px solid var(--color-danger)`,
        padding: '12px 24px',
        borderRadius: '8px',
        fontSize: '16px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: isEstopActive ? 'none' : '0 0 15px rgba(239, 68, 68, 0.5)',
        transition: 'all 0.2s ease-in-out',
        textTransform: 'uppercase',
        letterSpacing: '1px'
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
    >
      {isEstopActive ? 'E-Stop Engaged' : 'Emergency Stop (Space)'}
    </button>
  );
};