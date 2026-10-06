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
    let lastValue: string = "";

    const renderLoop = () => {
      const rawValue = getValue();
      
      let displayValue = "---";
      if (typeof rawValue === 'number' && !isNaN(rawValue)) {
        displayValue = rawValue.toFixed(precision);
      } else if (typeof rawValue === 'string') {
        displayValue = rawValue;
      }

      // Only touch the DOM if the value actually changed to save CPU cycles
      if (valueRef.current && displayValue !== lastValue) {
        valueRef.current.textContent = displayValue;
        lastValue = displayValue;
      }

      // Sync the next update with the monitor's refresh rate (usually 60Hz)
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    return () => cancelAnimationFrame(animationFrameId);
  }, [getValue, precision]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
        {title}
      </span>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span ref={valueRef} style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text-accent)', fontVariantNumeric: 'tabular-nums' }}>
          ---
        </span>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          {unit}
        </span>
      </div>
    </div>
  );
};