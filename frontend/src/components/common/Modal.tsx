import React, { useState } from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const MODAL_SCALE_KEY = 'aerothrust_modal_scale';
const MIN_SCALE = 0.8;
const MAX_SCALE = 1.6;
const SCALE_STEP = 0.1;

export const Modal: React.FC<ModalProps> = ({ isOpen, title, onClose, children }) => {
  const [scale, setScale] = useState<number>(() => {
    try {
      const saved = parseFloat(localStorage.getItem(MODAL_SCALE_KEY) || '1');
      if (!isNaN(saved) && saved >= MIN_SCALE && saved <= MAX_SCALE) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 1.0;
  });

  if (!isOpen) return null;

  const updateScale = (next: number) => {
    const clamped = Math.round(Math.max(MIN_SCALE, Math.min(MAX_SCALE, next)) * 10) / 10;
    setScale(clamped);
    try {
      localStorage.setItem(MODAL_SCALE_KEY, String(clamped));
    } catch {
      // ignore
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(10, 20, 31, 0.75)',
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
        style={
          {
            width: '500px',
            minWidth: '380px',
            minHeight: '200px',
            maxWidth: `calc(94vw / ${scale})`,
            maxHeight: `calc(92vh / ${scale})`,
            resize: 'both',
            overflow: 'auto',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-active)',
            borderRadius: '0px',
            padding: '20px',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.35)',
            zoom: scale,
          } as React.CSSProperties
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '14px',
            borderBottom: 'var(--border-subtle)',
            paddingBottom: '8px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.5px' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)' }}>
              <button
                type="button"
                onClick={() => updateScale(scale - SCALE_STEP)}
                disabled={scale <= MIN_SCALE}
                style={scaleBtnStyle(scale <= MIN_SCALE)}
                title="Decrease modal size"
                aria-label="Decrease modal size"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => updateScale(1.0)}
                style={{
                  background: 'none',
                  border: 'none',
                  borderLeft: 'var(--border-subtle)',
                  borderRight: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  cursor: 'pointer',
                  minWidth: '40px',
                }}
                title="Reset modal size to 100%"
              >
                {Math.round(scale * 100)}%
              </button>
              <button
                type="button"
                onClick={() => updateScale(scale + SCALE_STEP)}
                disabled={scale >= MAX_SCALE}
                style={scaleBtnStyle(scale >= MAX_SCALE)}
                title="Increase modal size"
                aria-label="Increase modal size"
              >
                +
              </button>
            </div>
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
              title="Close dialog"
            >
              <CloseIcon size={14} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
};

const scaleBtnStyle = (disabled: boolean): React.CSSProperties => ({
  background: 'none',
  border: 'none',
  color: 'var(--text-primary)',
  fontSize: '11px',
  fontWeight: 700,
  padding: '2px 7px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.35 : 1,
});