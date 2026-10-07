import React, { useEffect, useRef } from 'react';

interface NumericCardProps {
  title: string;
  unit: string;
  getValue: () => number | string;
  precision?: number;
}

export const NumericCard: React.FC<NumericCardProps> = ({ title, unit, getValue, precision = 2 }) => {
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let lastValue: string = '';

    const renderLoop = () => {
      const rawValue = getValue();
      let displayValue = '---';

      if (typeof rawValue === 'number' && !isNaN(rawValue)) {
        displayValue = rawValue.toFixed(precision);
      } else if (typeof rawValue === 'string') {
        displayValue = rawValue;
      }

      if (valueRef.current && displayValue !== lastValue) {
        valueRef.current.textContent = displayValue;
        lastValue = displayValue;
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [getValue, precision]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '12px' }}>
      <span style={{ fontSize: '11px', color: 'var(--brand-ice)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          ref={valueRef}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '26px',
            fontWeight: 700,
            color: '#FFFFFF',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          ---
        </span>
        <span style={{ fontSize: '12px', color: 'var(--brand-ice)', fontWeight: 600 }}>
          {unit}
        </span>
      </div>
    </div>
  );
};