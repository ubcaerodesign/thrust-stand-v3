import React, { useEffect, useRef, useState } from 'react';

interface EscTelemetryCardProps {
  getRPM: () => number;
  isDshotEnabled?: boolean;
  defaultPoles?: number;
}

export const EscTelemetryCard: React.FC<EscTelemetryCardProps> = ({
  getRPM,
  isDshotEnabled = true,
  defaultPoles = 14,
}) => {
  const [poles, setPoles] = useState<number>(defaultPoles);
  const rpmRef = useRef<HTMLSpanElement>(null);
  const freqRef = useRef<HTMLSpanElement>(null);
  const statusBadgeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let animId: number;

    const loop = () => {
      if (!isDshotEnabled) {
        if (rpmRef.current) rpmRef.current.textContent = 'N/A';
        if (freqRef.current) freqRef.current.textContent = '--- Hz';
        if (statusBadgeRef.current) {
          statusBadgeRef.current.textContent = 'NO TELEMETRY (PWM)';
          statusBadgeRef.current.style.color = '#64748b';
          statusBadgeRef.current.style.backgroundColor = 'rgba(148, 163, 184, 0.18)';
          statusBadgeRef.current.style.borderColor = 'rgba(148, 163, 184, 0.4)';
        }
        animId = requestAnimationFrame(loop);
        return;
      }

      const rpm = getRPM();
      const polePairs = poles / 2;
      const commutationHz = Math.round((rpm * polePairs) / 60);

      if (rpmRef.current) {
        rpmRef.current.textContent = Math.round(rpm).toLocaleString();
      }

      if (freqRef.current) {
        freqRef.current.textContent = rpm > 0 ? `${commutationHz.toLocaleString()} Hz` : '0 Hz';
      }

      if (statusBadgeRef.current) {
        if (rpm > 50) {
          statusBadgeRef.current.textContent = 'D-SHOT ACTIVE';
          statusBadgeRef.current.style.color = '#16a34a';
          statusBadgeRef.current.style.backgroundColor = 'rgba(22, 163, 74, 0.15)';
          statusBadgeRef.current.style.borderColor = 'rgba(22, 163, 74, 0.4)';
        } else {
          statusBadgeRef.current.textContent = 'D-SHOT IDLE';
          statusBadgeRef.current.style.color = 'var(--text-secondary)';
          statusBadgeRef.current.style.backgroundColor = 'rgba(148, 163, 184, 0.15)';
          statusBadgeRef.current.style.borderColor = 'rgba(148, 163, 184, 0.3)';
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [getRPM, isDshotEnabled, poles]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      {/* Header with Title and Link Status Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 700 }}>
          ESC Telemetry (D-Shot)
        </span>
        <span
          ref={statusBadgeRef}
          style={{
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '0px',
            border: 'var(--border-subtle)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            transition: 'all 0.2s ease',
          }}
        >
          {isDshotEnabled ? 'D-SHOT IDLE' : 'NO TELEMETRY (PWM)'}
        </span>
      </div>

      {/* Main Motor Speed Display */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span
            ref={rpmRef}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '26px',
              fontWeight: 700,
              color: isDshotEnabled ? 'var(--brand-yellow)' : 'var(--text-secondary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {isDshotEnabled ? '0' : 'N/A'}
          </span>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>RPM</span>
        </div>

        {/* Commutation Frequency Subtitle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1px' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', opacity: 0.85, textTransform: 'uppercase', fontWeight: 700 }}>
            Commutation
          </span>
          <span
            ref={freqRef}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '12px',
              fontWeight: 700,
              color: 'var(--text-primary)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            0 Hz
          </span>
        </div>
      </div>

      {/* Footer Details: Motor Pole Configuration */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: '6px',
          borderTop: 'var(--border-subtle)',
          fontSize: '11px',
          color: 'var(--text-secondary)',
        }}
      >
        <span style={{ fontWeight: 700 }}>Motor Poles:</span>
        <select
          value={poles}
          onChange={(e) => setPoles(Number(e.target.value))}
          disabled={!isDshotEnabled}
          style={{
            backgroundColor: 'var(--input-bg)',
            color: 'var(--input-text)',
            border: '1px solid var(--input-border)',
            borderRadius: '0px',
            padding: '1px 6px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: isDshotEnabled ? 'pointer' : 'not-allowed',
          }}
          title="Magnetic poles of the brushless motor (Sunnysky 2216 / 2814 are 14 poles = 7 pole pairs)"
        >
          <option value={14}>14 Poles (7 Pairs - Default)</option>
          <option value={12}>12 Poles (6 Pairs)</option>
          <option value={10}>10 Poles (5 Pairs)</option>
          <option value={8}>8 Poles (4 Pairs)</option>
          <option value={6}>6 Poles (3 Pairs)</option>
        </select>
      </div>
    </div>
  );
};