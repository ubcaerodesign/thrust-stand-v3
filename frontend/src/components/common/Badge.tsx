import React from 'react';

interface BadgeProps {
  label: string;
  variant?: 'success' | 'danger' | 'warning' | 'neutral' | 'accent';
}

const variantStyles: Record<string, { bg: string; color: string; border: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.4)' },
  danger: { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.4)' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)' },
  neutral: { bg: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  accent: { bg: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'neutral' }) => {
  const style = variantStyles[variant];

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        backgroundColor: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
      }}
    >
      {label}
    </span>
  );
};