import React, { useEffect, useRef } from 'react';

interface BatteryGaugeProps {
  maxMah?: number;
  getVoltage: () => number;
  getCurrent: () => number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({ maxMah = 1000, getCurrent }) => {
  const mahRef = useRef<number>(0);
  const textRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef<number>(performance.now());

  useEffect(() => {
    let animId: number;

    const loop = (now: number) => {
      const dt = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      const currentA = getCurrent();
      if (currentA > 0) {
        mahRef.current += currentA * (dt / 3600) * 1000;
      }

      const consumed = mahRef.current;
      const pct = Math.min(100, (consumed / maxMah) * 100);

      if (textRef.current) {
        textRef.current.textContent = `${consumed.toFixed(1)} / ${maxMah} mAh (${pct.toFixed(0)}%)`;
      }

      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
        barRef.current.style.backgroundColor = pct > 80 ? 'var(--color-danger)' : pct > 50 ? 'var(--brand-yellow)' : 'var(--color-success)';
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [maxMah, getCurrent]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--brand-ice)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
          Battery Used
        </span>
        <span ref={textRef} style={{ fontSize: '11px', fontWeight: 700, color: '#FFFFFF', fontVariantNumeric: 'tabular-nums' }}>
          0.0 / {maxMah} mAh (0%)
        </span>
      </div>

      <div style={{ height: '6px', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '3px', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: '0%', backgroundColor: 'var(--color-success)', transition: 'width 0.1s linear' }} />
      </div>
    </div>
  );
};