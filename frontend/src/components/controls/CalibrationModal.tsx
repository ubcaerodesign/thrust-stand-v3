import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { TelemetryPacket } from '../../types/telemetry';

interface CalibrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  getLatestPacket: () => TelemetryPacket | null;
  isHardwareStreaming: boolean;
}

interface ChannelConfig {
  id: number;
  mask: number;
  name: string;
  role: string;
  unit: string;
}

const CHANNELS: ChannelConfig[] = [
  { id: 1, mask: 0x01, name: 'Channel 1', role: 'Axial Thrust (Load Cell 1)', unit: 'g' },
  { id: 2, mask: 0x02, name: 'Channel 2', role: 'Reaction Torque (Load Cell 2)', unit: 'g' },
  { id: 3, mask: 0x04, name: 'Channel 3', role: 'Multi-Axis / Wind Tunnel Lift', unit: 'g' },
  { id: 4, mask: 0x08, name: 'Channel 4', role: 'Multi-Axis / Pitching Moment', unit: 'g' },
];

export const CalibrationModal: React.FC<CalibrationModalProps> = ({
  isOpen,
  onClose,
  getLatestPacket,
  isHardwareStreaming,
}) => {
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isTaring, setIsTaring] = useState<boolean>(false);

  // References for direct 60 FPS text updates inside the modal
  const ch1Ref = useRef<HTMLSpanElement>(null);
  const ch2Ref = useRef<HTMLSpanElement>(null);
  const ch3Ref = useRef<HTMLSpanElement>(null);
  const ch4Ref = useRef<HTMLSpanElement>(null);

  // High-speed render loop to show live net forces while zeroing
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;

    const loop = () => {
      const pkt = getLatestPacket();
      if (pkt) {
        if (ch1Ref.current) ch1Ref.current.textContent = `${pkt.thrust_g} g`;
        if (ch2Ref.current) ch2Ref.current.textContent = `${pkt.torque_g} g`;
        if (ch3Ref.current) ch3Ref.current.textContent = `${pkt.ch3_g} g`;
        if (ch4Ref.current) ch4Ref.current.textContent = `${pkt.ch4_g} g`;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isOpen, getLatestPacket]);

  const executeTare = async (mask: number, label: string) => {
    if (!isHardwareStreaming) return;
    setIsTaring(true);
    try {
      await api.tare({ mask });
      setFeedbackMsg(`✓ Successfully zeroed ${label}`);
      setTimeout(() => setFeedbackMsg(null), 3000);
    } catch (err) {
      setFeedbackMsg(`✕ Tare failed: ${(err as Error).message}`);
    } finally {
      setIsTaring(false);
    }
  };

  const getRefForChannel = (id: number) => {
    switch (id) {
      case 1: return ch1Ref;
      case 2: return ch2Ref;
      case 3: return ch3Ref;
      case 4: return ch4Ref;
      default: return ch1Ref;
    }
  };

  return (
    <Modal isOpen={isOpen} title="Strain Gauge Channel Calibration & Tare" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <p style={{ margin: 0, fontSize: '12px', color: 'var(--brand-ice)', lineHeight: 1.4 }}>
          Zero resting weight and aerodynamic balance offsets. You can tare individual load cells or trigger group tares.
        </p>

        {/* Live Channel Inspection Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {CHANNELS.map((ch) => (
            <div
              key={ch.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 12px',
                backgroundColor: 'var(--bg-base)',
                borderRadius: '6px',
                border: '1px solid rgba(201, 214, 234, 0.15)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}>{ch.name}</span>
                <span style={{ fontSize: '11px', color: 'var(--brand-ice)' }}>{ch.role}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span
                  ref={getRefForChannel(ch.id)}
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '18px',
                    fontWeight: 700,
                    color: 'var(--brand-yellow)',
                    minWidth: '70px',
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  0 g
                </span>

                <button
                  onClick={() => executeTare(ch.mask, ch.name)}
                  disabled={!isHardwareStreaming || isTaring}
                  style={{
                    backgroundColor: 'var(--brand-surface-elevated)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(201, 214, 234, 0.3)',
                    borderRadius: '4px',
                    padding: '5px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
                    opacity: isHardwareStreaming ? 1 : 0.4,
                  }}
                >
                  Tare
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Status / Feedback Banner */}
        {feedbackMsg && (
          <div
            style={{
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: feedbackMsg.startsWith('✓') ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: feedbackMsg.startsWith('✓') ? 'var(--color-success)' : 'var(--color-danger)',
              border: feedbackMsg.startsWith('✓') ? '1px solid var(--color-success)' : '1px solid var(--color-danger)',
              textAlign: 'center',
            }}
          >
            {feedbackMsg}
          </div>
        )}

        {/* Group Actions Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', paddingTop: '10px', borderTop: '1px solid rgba(201, 214, 234, 0.15)' }}>
          <button
            onClick={() => executeTare(0x03, 'Motor Channels (Ch1 + Ch2)')}
            disabled={!isHardwareStreaming || isTaring}
            style={{
              backgroundColor: 'transparent',
              color: 'var(--brand-ice)',
              border: '1px solid rgba(201, 214, 234, 0.3)',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
              opacity: isHardwareStreaming ? 1 : 0.4,
            }}
          >
            Zero Motor Pair (Ch 1+2)
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => executeTare(0x0f, 'All 4 Channels')}
              disabled={!isHardwareStreaming || isTaring}
              style={{
                backgroundColor: 'var(--brand-blue)',
                color: '#FFFFFF',
                border: '1px solid var(--brand-ice)',
                borderRadius: '4px',
                padding: '6px 16px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
                opacity: isHardwareStreaming ? 1 : 0.4,
              }}
            >
              Zero All (0x0F)
            </button>

            <button
              onClick={onClose}
              style={{
                backgroundColor: '#334155',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '4px',
                padding: '6px 14px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};