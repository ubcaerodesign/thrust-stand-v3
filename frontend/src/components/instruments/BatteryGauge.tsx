import React, { useEffect, useRef } from 'react';

interface BatteryGaugeProps {
  maxMah?: number; // 1000 for Micro, 3000 for Advanced
  getVoltage: () => number;
  getCurrent: () => number;
}

export const BatteryGauge: React.FC<BatteryGaugeProps> = ({ maxMah = 1000, getVoltage, getCurrent }) => {
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
        // mAh = Amps * (hours) * 1000
        mahRef.current += currentA * (dt / 3600) * 1000;
      }

      const consumed = mahRef.current;
      const pct = Math.min(100, (consumed / maxMah) * 100);

      if (textRef.current) {
        textRef.current.textContent = `${consumed.toFixed(1)} / ${maxMah} mAh (${pct.toFixed(0)}%)`;
      }

      if (barRef.current) {
        barRef.current.style.width = `${pct}%`;
        barRef.current.style.backgroundColor = pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e';
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [maxMah, getCurrent]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Battery Capacity Used
        </span>
        <span ref={textRef} style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-accent)', fontVariantNumeric: 'tabular-nums' }}>
          0.0 / {maxMah} mAh (0%)
        </span>
      </div>

      <div style={{ height: '8px', width: '100%', backgroundColor: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
        <div ref={barRef} style={{ height: '100%', width: '0%', backgroundColor: '#22c55e', transition: 'width 0.1s linear' }} />
      </div>
    </div>
  );
};