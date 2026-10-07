import React, { useState } from 'react';
import { api } from '../../services/api';
import { ProtocolMode } from '../../types/session';

interface ThrottleSliderProps {
  isConnected: boolean;
  isEstop: boolean;
}

export const ThrottleSlider: React.FC<ThrottleSliderProps> = ({ isConnected, isEstop }) => {
  const [throttle, setThrottle] = useState<number>(0);
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [mode, setMode] = useState<ProtocolMode>('dshot');

  const sendThrottle = async (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    setThrottle(clamped);
    if (isConnected && isArmed && !isEstop) {
      try {
        await api.setThrottle({ throttle_pct: clamped, mode });
      } catch (err) {
        console.error('Failed to command throttle:', err);
      }
    }
  };

  const handleArmToggle = (armed: boolean) => {
    setIsArmed(armed);
    if (!armed) {
      sendThrottle(0);
    }
  };

  const isDisabled = !isConnected || !isArmed || isEstop;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Motor Actuation
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* Protocol Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <span>PROTOCOL:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ProtocolMode)}
              style={{ backgroundColor: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '2px 6px', fontSize: '11px' }}
            >
              <option value="dshot">D-Shot</option>
              <option value="pwm">Standard PWM</option>
            </select>
          </div>

          {/* Safety Arm Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: isArmed ? '#22c55e' : '#94a3b8' }}>
            <input
              type="checkbox"
              checked={isArmed}
              onChange={(e) => handleArmToggle(e.target.checked)}
              disabled={!isConnected || isEstop}
            />
            {isArmed ? 'ARMED' : 'ARM MOTOR'}
          </label>
        </div>
      </div>

      {/* Main Throttle Slider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
            accentColor: 'var(--text-accent)',
            height: '8px',
          }}
        />
        <span style={{ fontSize: '28px', fontWeight: 'bold', minWidth: '85px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: isDisabled ? 'var(--text-secondary)' : 'var(--text-accent)' }}>
          {throttle.toFixed(1)}%
        </span>
      </div>

      {/* Stepping Quick Buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button onClick={() => sendThrottle(0)} disabled={isDisabled} style={btnStyle}>0% (IDLE)</button>
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
  backgroundColor: '#334155',
  color: '#f8fafc',
  border: 'none',
  borderRadius: '4px',
  padding: '6px 12px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
};