import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { SequencePreset, SequenceStatus } from '../../types/sequence';

interface SequenceControllerProps {
  isHardwareStreaming: boolean;
  isEstop: boolean;
  sequenceStatus: SequenceStatus | null;
}

// Built-in presets ensure the dropdown is never empty, even before backend responds
const DEFAULT_PRESETS: SequencePreset[] = [
  {
    id: 'stepped_sweep_10_100',
    name: 'Stepped Sweep (10% to 100%, 2s Dwell)',
    description: 'Increments throttle from 10% to 100% in 10% steps, dwelling 2s per step.',
    total_duration_sec: 20.0,
    step_count: 10,
  },
  {
    id: 'fine_sweep_5_100',
    name: 'Fine Sweep (5% to 100%, 1.5s Dwell)',
    description: 'High-resolution sweep from 5% to 100% in 5% increments, dwelling 1.5s per step.',
    total_duration_sec: 30.0,
    step_count: 20,
  },
  {
    id: 'endurance_hold_70',
    name: 'Endurance Cruise Hold (70% for 60s)',
    description: 'Steps to 35% (3s), ramps to 70% cruise, and holds for 60s to test battery sag.',
    total_duration_sec: 63.0,
    step_count: 2,
  },
  {
    id: 'quick_validation',
    name: 'Quick Check (10%, 25%, 50% - 1s Dwell)',
    description: 'Rapid 3-point functional check to verify prop rotation and load cell polarity.',
    total_duration_sec: 3.5,
    step_count: 3,
  },
];

export const SequenceController: React.FC<SequenceControllerProps> = ({
  isHardwareStreaming,
  isEstop,
  sequenceStatus,
}) => {
  const [presets, setPresets] = useState<SequencePreset[]>(DEFAULT_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('stepped_sweep_10_100');
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Sync dynamic presets from backend on mount if available
  useEffect(() => {
    api.getSequencePresets()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPresets(data);
          setSelectedPresetId(data[0].id);
        }
      })
      .catch((err) => {
        // Silently keep default presets if backend is still spinning up
        console.warn('Using client-side default sequence presets:', err);
      });
  }, []);

  const isRunning = sequenceStatus?.is_running ?? false;

  const handleStart = async () => {
    if (!isHardwareStreaming || isEstop || isRunning) return;
    setIsStarting(true);
    try {
      await api.startSequence(selectedPresetId, 'dshot');
    } catch (err) {
      alert(`Could not start sequence: ${(err as Error).message}`);
    } finally {
      setIsStarting(false);
    }
  };

  const handleAbort = async () => {
    try {
      await api.abortSequence();
    } catch (err) {
      console.error('Failed to abort sequence:', err);
    }
  };

  const progressPct = isRunning && sequenceStatus && sequenceStatus.total_steps > 0
    ? (sequenceStatus.current_step / sequenceStatus.total_steps) * 100
    : 0;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-ice)', letterSpacing: '0.5px' }}>
            AUTO TEST SEQUENCE:
          </span>

          {isRunning ? (
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-yellow)' }}>
              ⚡ EXECUTING: {sequenceStatus?.preset_name}
            </span>
          ) : (
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              disabled={isRunning}
              style={{
                backgroundColor: 'var(--bg-base)',
                color: '#FFFFFF',
                border: '1px solid rgba(201, 214, 234, 0.3)',
                borderRadius: '4px',
                padding: '4px 8px',
                fontSize: '11px',
                fontFamily: 'var(--font-body)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {presets.map((p) => (
                <option
                  key={p.id}
                  value={p.id}
                  style={{ backgroundColor: '#11273B', color: '#FFFFFF' }}
                >
                  {p.name} ({p.total_duration_sec}s)
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isRunning ? (
            <button
              onClick={handleAbort}
              style={{
                backgroundColor: 'var(--color-danger)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ABORT SEQUENCE
            </button>
          ) : (
            <button
              onClick={handleStart}
              disabled={!isHardwareStreaming || isEstop || isStarting}
              style={{
                backgroundColor: 'var(--brand-blue)',
                color: '#FFFFFF',
                border: '1px solid var(--brand-ice)',
                borderRadius: '4px',
                padding: '5px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isHardwareStreaming && !isEstop ? 'pointer' : 'not-allowed',
                opacity: isHardwareStreaming && !isEstop ? 1 : 0.4,
              }}
            >
              {isStarting ? 'STARTING...' : '▶ RUN AUTOMATED SWEEP'}
            </button>
          )}
        </div>
      </div>

      {/* Progress & Dwell Indicator when running */}
      {isRunning && sequenceStatus && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '2px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--brand-ice)' }}>
            <span>
              Step <strong>{sequenceStatus.current_step}</strong> of {sequenceStatus.total_steps} (Target: <strong>{sequenceStatus.target_throttle_pct}%</strong>)
            </span>
            <span>
              Dwell Remaining: <strong>{sequenceStatus.dwell_remaining_sec.toFixed(1)}s</strong> (Total: {sequenceStatus.elapsed_sec.toFixed(1)}s)
            </span>
          </div>
          <div style={{ height: '4px', width: '100%', backgroundColor: 'var(--bg-base)', borderRadius: '2px', overflow: 'hidden' }}>
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                backgroundColor: 'var(--brand-yellow)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};