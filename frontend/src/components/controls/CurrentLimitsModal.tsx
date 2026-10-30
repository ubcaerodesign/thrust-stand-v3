import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { TelemetryPacket } from '../../types/telemetry';
import { BoltIcon, CheckIcon, CloseIcon } from '../common/Icons';

interface CurrentLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  getLatestPacket: () => TelemetryPacket | null;
  isHardwareStreaming: boolean;
}

export const CurrentLimitsModal: React.FC<CurrentLimitsModalProps> = ({
  isOpen,
  onClose,
  getLatestPacket,
}) => {
  const [softLimit, setSoftLimit] = useState<number>(40.0);
  const [hardLimit, setHardLimit] = useState<number>(55.0);
  const [softEnabled, setSoftEnabled] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ text: string; success: boolean } | null>(null);

  const currentRef = useRef<HTMLSpanElement>(null);
  const voltageRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLSpanElement>(null);

  // Fetch current settings on open
  useEffect(() => {
    if (isOpen) {
      api.getCurrentLimits()
        .then((res) => {
          setSoftLimit(res.soft_current_a);
          setHardLimit(res.hard_current_a);
          setSoftEnabled(res.soft_limit_enabled);
        })
        .catch((err) => {
          console.warn('Could not load current limits:', err);
        });
    }
  }, [isOpen]);

  // Live telemetry loop
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const loop = () => {
      const pkt = getLatestPacket();
      if (pkt) {
        if (currentRef.current) currentRef.current.textContent = `${pkt.current_a.toFixed(2)} A`;
        if (voltageRef.current) voltageRef.current.textContent = `${pkt.voltage_v.toFixed(2)} V`;
        if (powerRef.current) powerRef.current.textContent = `${pkt.power_w.toFixed(1)} W`;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, getLatestPacket]);

  const handleSave = async () => {
    if (softLimit >= hardLimit) {
      setFeedback({ text: 'Soft limit must be strictly less than hard cutoff limit.', success: false });
      return;
    }

    setIsSaving(true);
    try {
      await api.setCurrentLimits({
        soft_current_a: softLimit,
        hard_current_a: hardLimit,
        soft_limit_enabled: softEnabled,
      });
      setFeedback({ text: 'Current limit thresholds saved successfully.', success: true });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ text: `Failed to save limits: ${(err as Error).message}`, success: false });
    } finally {
      setIsSaving(false);
    }
  };

  const applyPreset = (soft: number, hard: number) => {
    setSoftLimit(soft);
    setHardLimit(hard);
  };

  return (
    <Modal isOpen={isOpen} title="Current Limiting & ESC Protection" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
          Protect motors, ESCs, and batteries against thermal overload. The <strong>Soft Limiter</strong> rolls back throttle to stay below the target cap, while the <strong>Hard Limiter</strong> cuts throttle immediately if current exceeds the fail-safe threshold.
        </p>

        {/* Live Telemetry Bar */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: 'var(--border-subtle)',
        }}>
          <div>
            <span style={labelStyle}>Live Current</span>
            <span ref={currentRef} style={{ ...valStyle, color: 'var(--brand-yellow)' }}>0.00 A</span>
          </div>
          <div>
            <span style={labelStyle}>Bus Voltage</span>
            <span ref={voltageRef} style={valStyle}>0.00 V</span>
          </div>
          <div>
            <span style={labelStyle}>Power</span>
            <span ref={powerRef} style={valStyle}>0.0 W</span>
          </div>
        </div>

        {/* Threshold Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>
                Soft Current Limit (Amps) — Throttle Rollback
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={softEnabled}
                  onChange={(e) => setSoftEnabled(e.target.checked)}
                  style={{ accentColor: 'var(--brand-yellow)' }}
                />
                Enabled
              </label>
            </div>
            <input
              type="number"
              step="0.5"
              min="1"
              max="150"
              value={softLimit}
              disabled={!softEnabled}
              onChange={(e) => setSoftLimit(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Automatically scales back throttle command if current stays above this threshold for &gt;60ms.
            </span>
          </div>

          <div>
            <label style={labelStyle}>
              Hard Over-Current Limit (Amps) — Emergency Cutoff
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="150"
              value={hardLimit}
              onChange={(e) => setHardLimit(parseFloat(e.target.value) || 0)}
              style={{ width: '100%', padding: '6px 8px', fontSize: '12px' }}
            />
            <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
              Triggers an instant Emergency Stop (E-Stop) if current breaches this cap for &gt;80ms (or &gt;140% instant).
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div>
          <span style={labelStyle}>Competition Powertrain Presets</span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => applyPreset(25.0, 35.0)}
              style={presetBtnStyle}
            >
              Micro Class 3S (25A / 35A)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(45.0, 55.0)}
              style={presetBtnStyle}
            >
              Advanced Class 4S (45A / 55A)
            </button>
            <button
              type="button"
              onClick={() => applyPreset(60.0, 80.0)}
              style={presetBtnStyle}
            >
              Heavy Lift 6S (60A / 80A)
            </button>
          </div>
        </div>

        {feedback && (
          <div
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: feedback.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: feedback.success ? 'var(--color-success)' : 'var(--color-danger)',
              border: feedback.success ? '1px solid var(--color-success)' : '1px solid var(--color-danger)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {feedback.success ? <CheckIcon size={13} color="var(--color-success)" /> : <CloseIcon size={13} color="var(--color-danger)" />}
            {feedback.text}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: 'var(--border-subtle)' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              color: 'var(--text-primary)',
              border: 'var(--border-subtle)',
              borderRadius: '0px',
              padding: '5px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              backgroundColor: 'var(--brand-blue)',
              color: '#FFFFFF',
              border: '1px solid var(--brand-ice)',
              borderRadius: '0px',
              padding: '5px 16px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BoltIcon size={11} color="#FFFFFF" />
            {isSaving ? 'SAVING...' : 'APPLY LIMITS'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: 'var(--text-secondary)',
  marginBottom: '3px',
  textTransform: 'uppercase',
  fontWeight: 700,
  letterSpacing: '0.4px',
};

const valStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: 'var(--font-heading)',
  fontSize: '16px',
  fontWeight: 700,
  color: 'var(--text-primary)',
  fontVariantNumeric: 'tabular-nums',
};

const presetBtnStyle: React.CSSProperties = {
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  border: 'var(--border-subtle)',
  borderRadius: '0px',
  padding: '4px 8px',
  fontSize: '10px',
  fontWeight: 700,
  cursor: 'pointer',
};