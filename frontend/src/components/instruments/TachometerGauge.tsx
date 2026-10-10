import React, { useEffect, useRef } from 'react';

interface TachometerGaugeProps {
  getRPM: () => number;
  maxRPM?: number;
  isDshotEnabled?: boolean;
}

export const TachometerGauge: React.FC<TachometerGaugeProps> = ({
  getRPM,
  maxRPM = 18000,
  isDshotEnabled = true,
}) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (!isDshotEnabled) {
        if (textRef.current) textRef.current.textContent = 'N/A';
        if (barRef.current) barRef.current.style.width = '0%';
        animId = requestAnimationFrame(loop);
        return;
      }

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
  }, [getRPM, maxRPM, isDshotEnabled]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: '11px', color: 'var(--brand-ice)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
          {isDshotEnabled ? 'Motor RPM (D-Shot)' : 'Motor RPM (Legacy Hardware)'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--brand-ice)' }}>
          {isDshotEnabled ? `MAX: ${maxRPM.toLocaleString()}` : 'ANALOG PWM'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <span
          ref={textRef}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '26px',
            fontWeight: 700,
            color: isDshotEnabled ? 'var(--brand-yellow)' : 'var(--brand-ice)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {isDshotEnabled ? '0' : 'N/A'}
        </span>
        <span style={{ fontSize: '12px', color: 'var(--brand-ice)' }}>RPM</span>
      </div>

      <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: '0%', backgroundColor: 'var(--brand-yellow)', transition: 'width 0.05s linear' }} />
      </div>
    </div>
  );
};