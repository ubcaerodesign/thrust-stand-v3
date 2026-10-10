import React from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 20, 31, 0.85)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '480px',
          maxWidth: '90vw',
          backgroundColor: '#11273B',
          border: '1px solid var(--brand-ice)',
          borderRadius: '0px',
          padding: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid rgba(201, 214, 234, 0.15)', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px',
            }}
          >
            <CloseIcon size={14} color="var(--brand-ice)" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};