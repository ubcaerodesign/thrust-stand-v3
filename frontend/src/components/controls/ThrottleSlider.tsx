import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { ProtocolMode } from '../../types/session';

interface ThrottleSliderProps {
  isHardwareStreaming: boolean;
  isEstop: boolean;
  isSequenceRunning?: boolean;
  isDshotEnabled?: boolean;
  isSoftLimitActive?: boolean;
}

export const ThrottleSlider: React.FC<ThrottleSliderProps> = ({
  isHardwareStreaming,
  isEstop,
  isSequenceRunning = false,
  isDshotEnabled = true,
  isSoftLimitActive = false,
}) => {
  const [throttle, setThrottle] = useState<number>(0);
  const [mode, setMode] = useState<ProtocolMode>('dshot');

  const lastSendTimeRef = useRef<number>(0);
  const pendingThrottleRef = useRef<number | null>(null);
  const throttleTimeoutRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const isDshotEnabledRef = useRef(isDshotEnabled);
  isDshotEnabledRef.current = isDshotEnabled;

  useEffect(() => {
    if (!isDshotEnabled) {
      setMode('pwm');
    }
  }, [isDshotEnabled]);

  useEffect(() => {
    if (isEstop) {
      setThrottle(0);
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      pendingThrottleRef.current = null;
    }
  }, [isEstop]);

  useEffect(() => {
    return () => {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
      }
    };
  }, []);

  const emitThrottleApi = async (val: number) => {
    if (!isHardwareStreaming || isEstop || isSequenceRunning) return;
    try {
      const activeMode = isDshotEnabledRef.current ? modeRef.current : 'pwm';
      await api.setThrottle({ throttle_pct: val, mode: activeMode });
    } catch (err) {
      console.error('Throttle command failed:', err);
    }
  };

  const sendThrottle = (val: number, immediate: boolean = false) => {
    const clamped = Math.max(0, Math.min(100, val));
    setThrottle(clamped);

    if (!isHardwareStreaming || isEstop || isSequenceRunning) return;

    if (immediate || clamped === 0) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      pendingThrottleRef.current = null;
      lastSendTimeRef.current = performance.now();
      emitThrottleApi(clamped);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastSendTimeRef.current;
    const THROTTLE_INTERVAL_MS = 100;

    if (elapsed >= THROTTLE_INTERVAL_MS) {
      if (throttleTimeoutRef.current) {
        clearTimeout(throttleTimeoutRef.current);
        throttleTimeoutRef.current = null;
      }
      lastSendTimeRef.current = now;
      emitThrottleApi(clamped);
    } else {
      pendingThrottleRef.current = clamped;
      if (!throttleTimeoutRef.current) {
        throttleTimeoutRef.current = window.setTimeout(() => {
          throttleTimeoutRef.current = null;
          if (pendingThrottleRef.current !== null) {
            const nextVal = pendingThrottleRef.current;
            pendingThrottleRef.current = null;
            lastSendTimeRef.current = performance.now();
            emitThrottleApi(nextVal);
          }
        }, THROTTLE_INTERVAL_MS - elapsed);
      }
    }
  };

  const isDisabled = !isHardwareStreaming || isEstop || isSequenceRunning;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            MANUAL ACTUATION
          </span>
          {isSequenceRunning && (
            <span style={{ fontSize: '11px', color: 'var(--brand-yellow)', fontWeight: 700 }}>
              (LOCKED: Auto-Sequence Running)
            </span>
          )}
          {isSoftLimitActive && !isSequenceRunning && (
            <span style={{ fontSize: '11px', color: 'var(--brand-yellow)', fontWeight: 700 }}>
              (CURRENT CAPPED: SCALE-BACK ACTIVE)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
            <span style={{ fontWeight: 700 }}>PROTOCOL:</span>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as ProtocolMode)}
              disabled={isSequenceRunning || !isDshotEnabled}
              style={{
                backgroundColor: 'var(--input-bg)',
                color: 'var(--input-text)',
                border: '1px solid var(--input-border)',
                borderRadius: '0px',
                padding: '2px 6px',
                fontSize: '11px',
                cursor: !isDshotEnabled ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="dshot" disabled={!isDshotEnabled}>
                {isDshotEnabled ? 'D-Shot Telemetry' : 'D-Shot (No Sensor)'}
              </option>
              <option value="pwm">Standard PWM</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <input
          type="range"
          min="0"
          max="100"
          step="0.5"
          value={throttle}
          onChange={(e) => sendThrottle(parseFloat(e.target.value), false)}
          disabled={isDisabled}
          style={{
            flex: 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            accentColor: 'var(--brand-yellow)',
            backgroundColor: 'var(--slider-track)',
            height: '6px',
            border: 'none',
          }}
        />
        <span style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '24px',
          fontWeight: 700,
          minWidth: '70px',
          textAlign: 'right',
          fontVariantNumeric: 'tabular-nums',
          color: isDisabled ? 'var(--text-secondary)' : 'var(--brand-yellow)'
        }}>
          {throttle.toFixed(1)}%
        </span>
      </div>

      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        <button onClick={() => sendThrottle(0, true)} disabled={isDisabled} style={btnStyle}>0% IDLE</button>
        <button onClick={() => sendThrottle(throttle - 5, true)} disabled={isDisabled} style={btnStyle}>-5%</button>
        <button onClick={() => sendThrottle(throttle - 1, true)} disabled={isDisabled} style={btnStyle}>-1%</button>
        <button onClick={() => sendThrottle(throttle + 1, true)} disabled={isDisabled} style={btnStyle}>+1%</button>
        <button onClick={() => sendThrottle(throttle + 5, true)} disabled={isDisabled} style={btnStyle}>+5%</button>
        <button onClick={() => sendThrottle(25, true)} disabled={isDisabled} style={btnStyle}>25%</button>
        <button onClick={() => sendThrottle(50, true)} disabled={isDisabled} style={btnStyle}>50%</button>
      </div>
    </div>
  );
};

const btnStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface-elevated)',
  color: 'var(--text-primary)',
  border: 'var(--border-subtle)',
  borderRadius: '0px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
};