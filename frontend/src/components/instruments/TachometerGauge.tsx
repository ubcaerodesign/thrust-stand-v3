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
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '11px', color: 'var(--brand-ice)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
          Motor RPM (D-Shot)
        </span>
        <span style={{ fontSize: '10px', color: 'var(--brand-ice)' }}>MAX: {maxRPM.toLocaleString()}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span ref={textRef} style={{ fontFamily: 'var(--font-heading)', fontSize: '26px', fontWeight: 700, color: 'var(--brand-yellow)', fontVariantNumeric: 'tabular-nums' }}>
          0
        </span>
        <span style={{ fontSize: '12px', color: 'var(--brand-ice)' }}>RPM</span>
      </div>

      <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: '0%', backgroundColor: 'var(--brand-yellow)', transition: 'width 0.05s linear' }} />
      </div>
    </div>
  );
};