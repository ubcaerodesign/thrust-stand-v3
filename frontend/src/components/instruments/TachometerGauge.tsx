import React, { useEffect, useRef } from 'react';

interface TachometerGaugeProps {
  getRPM: () => number;
  maxRPM?: number;
}

export const TachometerGauge: React.FC<TachometerGaugeProps> = ({ getRPM, maxRPM = 18000 }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const loop = () => {
      const rpm = getRPM();
      const pct = Math.min(100, Math.max(0, (rpm / maxRPM) * 100));

      if (textRef.current) {
        textRef.current.textContent = Math.round(rpm).toLocaleString();
      }

      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [getRPM, maxRPM]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Motor RPM (D-Shot)
        </span>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MAX: {maxRPM.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span ref={textRef} style={{ fontSize: '32px', fontWeight: 'bold', color: '#38bdf8', fontVariantNumeric: 'tabular-nums' }}>
          0
        </span>
        <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>RPM</span>
      </div>

      <div style={{ height: '6px', width: '100%', backgroundColor: '#0f172a', borderRadius: '3px', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: '0%', backgroundColor: '#38bdf8', transition: 'width 0.05s linear' }} />
      </div>
    </div>
  );
};