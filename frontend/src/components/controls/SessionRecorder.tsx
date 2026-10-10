import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Modal } from '../common/Modal';
import { StartSessionPayload, CompetitionClass } from '../../types/session';
import { DownloadIcon, RecordDot } from '../common/Icons';

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
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px' }}>
      {/* Header Row: Label & Status */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          Session Logger
        </span>

        {isRecording ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--color-danger)', fontWeight: 700, fontSize: '11px' }}>
              <RecordDot size={8} color="var(--color-danger)" />
              REC [{activeRunId}]
            </span>
            <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, fontSize: '13px', color: 'var(--brand-yellow)' }}>
              {formatTime(elapsedSec)}
            </span>
          </div>
        ) : (
          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px' }}>STANDBY</span>
        )}
      </div>

      {/* Action Buttons Row */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {isRecording ? (
          <button
            onClick={handleStop}
            style={{
              flex: 1,
              backgroundColor: 'var(--color-danger)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '0px',
              padding: '6px 10px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            STOP & EXPORT
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={!isHardwareStreaming}
            style={{
              flex: 1,
              backgroundColor: 'var(--brand-blue)',
              color: '#FFFFFF',
              border: '1px solid var(--brand-ice)',
              borderRadius: '0px',
              padding: '6px 10px',
              fontWeight: 700,
              fontSize: '11px',
              cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
              opacity: isHardwareStreaming ? 1 : 0.4,
            }}
          >
            NEW TEST RUN
          </button>
        )}

        {lastExportUrl && (
          <a
            href={lastExportUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              backgroundColor: '#059669',
              color: '#FFFFFF',
              padding: '6px 10px',
              borderRadius: '0px',
              fontSize: '11px',
              fontWeight: 700,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
            }}
            title="Download last exported CSV file"
          >
            <DownloadIcon size={12} color="#FFFFFF" />
            CSV
          </a>
        )}
      </div>

      <Modal isOpen={isModalOpen} title="Test Run Configuration" onClose={() => setIsModalOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div>
            <label style={labelStyle}>Run Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Competition Class</label>
              <select
                value={form.competition_class}
                onChange={(e) => setForm({ ...form, competition_class: e.target.value as CompetitionClass })}
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
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Motor Model</label>
            <input
              type="text"
              value={form.motor_model}
              onChange={(e) => setForm({ ...form, motor_model: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Propeller Spec</label>
            <input
              type="text"
              value={form.propeller_model}
              onChange={(e) => setForm({ ...form, propeller_model: e.target.value })}
            />
          </div>

          <div>
            <label style={labelStyle}>Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
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
  fontSize: '10px',
  color: 'var(--text-secondary)',
  marginBottom: '3px',
  textTransform: 'uppercase',
  fontWeight: 700,
};

const btnStyle: React.CSSProperties = {
  border: 'none',
  borderRadius: '0px',
  padding: '5px 12px',
  fontSize: '11px',
  fontWeight: 700,
  color: '#FFFFFF',
  cursor: 'pointer',
};