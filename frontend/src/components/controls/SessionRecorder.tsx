import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { StartSessionPayload, CompetitionClass } from '../../types/session';

interface SessionRecorderProps {
  isConnected: boolean;
}

export const SessionRecorder: React.FC<SessionRecorderProps> = ({ isConnected }) => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [lastExportUrl, setLastExportUrl] = useState<string | null>(null);

  // Form State
  const [form, setForm] = useState<StartSessionPayload>({
    name: 'Static_Thrust_Test',
    competition_class: 'MCR',
    motor_model: 'Sunnysky 2216 1250KV',
    propeller_model: 'APC 10x4.7 SF',
    battery_config: '3S 1000mAh',
    notes: '',
  });

  // Timer
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
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>RECORDING:</span>

        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '14px' }}>● REC [{activeRunId}]</span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, fontSize: '16px', color: 'var(--text-accent)' }}>
              {formatTime(elapsedSec)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>IDLE</span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {lastExportUrl && (
          <a
            href={lastExportUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: '#059669',
              color: '#ffffff',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            📥 DOWNLOAD CSV
          </a>
        )}

        {isRecording ? (
          <button
            onClick={handleStop}
            style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', borderRadius: '6px', padding: '7px 18px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            STOP RUN
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!isConnected}
            style={{
              backgroundColor: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '7px 18px',
              fontWeight: 'bold',
              cursor: isConnected ? 'pointer' : 'not-allowed',
              opacity: isConnected ? 1 : 0.5,
            }}
          >
            NEW TEST RUN
          </button>
        )}
      </div>

      {/* Metadata Configuration Modal */}
      <Modal isOpen={isModalOpen} title="Configure Test Run Metadata" onClose={() => setIsModalOpen(false)}>
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
              <label style={labelStyle}>Class</label>
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
                placeholder="e.g. 3S 1000mAh"
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
            <label style={labelStyle}>Propeller Geometry</label>
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button onClick={() => setIsModalOpen(false)} style={{ ...btnStyle, backgroundColor: '#334155' }}>
              Cancel
            </button>
            <button onClick={handleStart} style={{ ...btnStyle, backgroundColor: '#0284c7' }}>
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
  fontSize: '12px',
  color: 'var(--text-secondary)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '8px 10px',
  fontSize: '13px',
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '6px',
  padding: '8px 16px',
  fontSize: '13px',
  fontWeight: 600,
  color: '#ffffff',
  cursor: 'pointer',
};