import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { ProtocolMode } from '../../types/session';

interface ThrottleSliderProps {
  isHardwareStreaming: boolean;
  isEstop: boolean;
  isSequenceRunning?: boolean;
}

export const ThrottleSlider: React.FC<ThrottleSliderProps> = ({
  isHardwareStreaming,
  isEstop,
  isSequenceRunning = false,
}) => {
  const [throttle, setThrottle] = useState<number>(0);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [mode, setMode] = useState<ProtocolMode>('dshot');

  useEffect(() => {
    if (isEstop) {
      setThrottle(0);
      setIsArmed(false);
    }
  }, [isEstop]);

  const sendThrottle = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setThrottle(clamped);
    if (isHardwareStreaming && isArmed && !isEstop && !isSequenceRunning) {
      try {
        await api.setThrottle({ throttle_pct: clamped, mode });
      } catch (err) {
        console.error('Throttle command failed:', err);
      }
    }
  };

  const handleArmToggle = (armed: boolean) => {
    setIsArmed(armed);
    if (!armed) {
      sendThrottle(0);
    }
  };

  const isDisabled = !isHardwareStreaming || !isArmed || isEstop || isSequenceRunning;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-ice)', textTransform: 'uppercase' }}>
            Manual Actuation
          </span>
          {isSequenceRunning && (
            <span style={{ fontSize: '11px', color: 'var(--brand-yellow)', fontWeight: 700 }}>
              (LOCKED: Auto-Sequence Running)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--brand-ice)' }}>
            <span>PROTOCOL:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ProtocolMode)}
              disabled={isSequenceRunning}
              style={{ backgroundColor: 'var(--bg-base)', color: '#FFFFFF', border: '1px solid rgba(201, 214, 234, 0.3)', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}
            >
              <option value="dshot">D-Shot Telemetry</option>
              <option value="pwm">Standard PWM</option>
            </select>
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: isSequenceRunning ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 700, color: isArmed ? 'var(--color-success)' : 'var(--brand-ice)' }}>
            <input
              type="checkbox"
              checked={isArmed}
              onChange={(e) => handleArmToggle(e.target.checked)}
              disabled={!isHardwareStreaming || isEstop || isSequenceRunning}
            />
            {isArmed ? 'ARMED' : 'ARM MOTOR'}
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={throttle}
          onChange={(e) => sendThrottle(parseFloat(e.target.value))}
          disabled={isDisabled}
          style={{
            flex: 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            accentColor: 'var(--brand-yellow)',
            height: '6px',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '24px',
          fontWeight: 700,
          minWidth: '70px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: isDisabled ? 'var(--brand-ice)' : 'var(--brand-yellow)'
        }}>
          {throttle.toFixed(1)}%
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={() => sendThrottle(0)} disabled={isDisabled} style={btnStyle}>0% IDLE</button>
        <button onClick={() => sendThrottle(throttle - 5)} disabled={isDisabled} style={btnStyle}>-5%</button>
        <button onClick={() => sendThrottle(throttle - 1)} disabled={isDisabled} style={btnStyle}>-1%</button>
        <button onClick={() => sendThrottle(throttle + 1)} disabled={isDisabled} style={btnStyle}>+1%</button>
        <button onClick={() => sendThrottle(throttle + 5)} disabled={isDisabled} style={btnStyle}>+5%</button>
        <button onClick={() => sendThrottle(25)} disabled={isDisabled} style={btnStyle}>25%</button>
        <button onClick={() => sendThrottle(50)} disabled={isDisabled} style={btnStyle}>50%</button>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface-elevated)',
  color: 'var(--brand-ice)',
  border: '1px solid rgba(201, 214, 234, 0.2)',
  borderRadius: '4px',
  padding: '5px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
};