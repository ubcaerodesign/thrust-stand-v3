import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { StartSessionPayload, CompetitionClass } from '../../types/session';

interface SessionRecorderProps {
  isHardwareStreaming: boolean;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({ isHardwareStreaming }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);

  const [form, setForm] = useState<StartSessionPayload>({
    name: 'Static_Thrust_Test',
    competition_class: 'MCR',
    motor_model: 'Sunnysky 2216 1250KV',
    propeller_model: 'APC 10x4.7 SF',
    battery_config: '3S 1000mAh',
    notes: '',
  });

  useEffect(() => {
    let interval: number;
    if (isRecording) {
      interval = window.setInterval(() => setElapsedSec((prev) => prev + 1), 1000);
    } else {
      setElapsedSec(0);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const handleStart = async () => {
    try {
      const res = await api.startSession(form);
      setActiveRunId(res.run_id);
      setIsRecording(true);
      setIsModalOpen(false);
      setLastExportUrl(null);
    } catch (err) {
      alert(`Could not start session: ${(err as Error).message}`);
    }
  };

  const handleStop = async () => {
    try {
      const res = await api.stopSession();
      setIsRecording(false);
      if (res.run_id) {
        setLastExportUrl(api.getExportUrl(res.run_id));
      }
      setActiveRunId(null);
    } catch (err) {
      alert(`Could not stop session: ${(err as Error).message}`);
    }
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '8px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-ice)' }}>DATA SESSION:</span>

        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ color: 'var(--color-danger)', fontWeight: 700, fontSize: '13px' }}>● REC [{activeRunId}]</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '15px', color: 'var(--brand-yellow)' }}>
              {formatTime(elapsedSec)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '12px', color: 'rgba(201, 214, 234, 0.5)' }}>STANDBY</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {lastExportUrl && (
          <a
            href={lastExportUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              padding: '5px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            📥 DOWNLOAD CSV
          </a>
        )}

        {isRecording ? (
          <button
            onClick={handleStop}
            style={{ backgroundColor: 'var(--color-danger)', color: '#FFFFFF', border: 'none', borderRadius: '4px', padding: '6px 16px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
          >
            STOP & EXPORT
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!isHardwareStreaming}
            style={{
              backgroundColor: 'var(--brand-blue)',
              color: '#FFFFFF',
              border: '1px solid var(--brand-ice)',
              borderRadius: '4px',
              padding: '6px 16px',
              fontWeight: 700,
              fontSize: '12px',
              cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
              opacity: isHardwareStreaming ? 1 : 0.4,
            }}
          >
            NEW TEST RUN
          </button>
        )}
      </div>

      <Modal isOpen={isModalOpen} title="Test Run Configuration" onClose={() => setIsModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Run Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Competition Class</label>
              <select
                value={form.competition_class}
                onChange={(e) => setForm({ ...form, competition_class: e.target.value as CompetitionClass })}
                style={inputStyle}
              >
                <option value="MCR">Micro Class (MCR)</option>
                <option value="ADV">Advanced Class (ADV)</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Battery Pack</label>
              <input
                type="text"
                value={form.battery_config}
                onChange={(e) => setForm({ ...form, battery_config: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Motor Model</label>
            <input
              type="text"
              value={form.motor_model}
              onChange={(e) => setForm({ ...form, motor_model: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Propeller Spec</label>
            <input
              type="text"
              value={form.propeller_model}
              onChange={(e) => setForm({ ...form, propeller_model: e.target.value })}
              style={inputStyle}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              style={{ ...inputStyle, resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ ...btnStyle, backgroundColor: '#334155' }}>
              Cancel
            </button>
            <button onClick={handleStart} style={{ ...btnStyle, backgroundColor: 'var(--brand-blue)', border: '1px solid var(--brand-ice)' }}>
              Start Recording
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: 'var(--brand-ice)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: 'var(--bg-base)',
  color: '#FFFFFF',
  border: '1px solid rgba(201, 214, 234, 0.25)',
  borderRadius: '4px',
  padding: '6px 8px',
  fontSize: '12px',
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '4px',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 700,
  color: '#FFFFFF',
  cursor: 'pointer',
};