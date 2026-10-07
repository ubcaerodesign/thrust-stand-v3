import React, { useState } from 'react';
import { api } from '../../services/api';
import { TransportMode } from '../../types/session';

interface ConnectionBarProps {
  isHardwareStreaming: boolean;
  onTare: () => void;
}

export const ConnectionBar: React.FC<ConnectionBarProps> = ({ isHardwareStreaming, onTare }) => {
  const [mode, setMode] = useState<TransportMode>('simulator');
  const [port, setPort] = useState<string>('COM3');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleToggleConnect = async () => {
    setIsLoading(true);
    try {
      if (isHardwareStreaming) {
        await api.disconnect();
      } else {
        await api.connect({
          mode,
          port: mode === 'serial' ? port : undefined,
          baudrate: 115200,
        });
      }
    } catch (err) {
      alert(`Connection Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '8px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--brand-ice)', letterSpacing: '0.5px' }}>
          HARDWARE TRANSPORT:
        </span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as TransportMode)}
          disabled={isHardwareStreaming || isLoading}
          style={{
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(201, 214, 234, 0.3)',
            borderRadius: '4px',
            padding: '5px 10px',
            fontSize: '12px',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="simulator">Virtual Simulator (TCP :8765)</option>
          <option value="serial">Physical USB Serial (STM32 Controller)</option>
        </select>

        {mode === 'serial' && (
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="COM3 or /dev/ttyACM0"
            disabled={isHardwareStreaming || isLoading}
            style={{
              backgroundColor: 'var(--bg-base)',
              color: 'var(--text-primary)',
              border: '1px solid rgba(201, 214, 234, 0.3)',
              borderRadius: '4px',
              padding: '5px 8px',
              fontSize: '12px',
              width: '130px',
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onTare}
          disabled={!isHardwareStreaming}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--brand-ice)',
            border: '1px solid rgba(201, 214, 234, 0.3)',
            borderRadius: '4px',
            padding: '6px 14px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
            opacity: isHardwareStreaming ? 1 : 0.4,
          }}
        >
          TARE ALL
        </button>

        <button
          onClick={handleToggleConnect}
          disabled={isLoading}
          style={{
            backgroundColor: isHardwareStreaming ? '#7f1d1d' : 'var(--brand-blue)',
            color: '#FFFFFF',
            border: isHardwareStreaming ? '1px solid var(--color-danger)' : '1px solid var(--brand-ice)',
            borderRadius: '4px',
            padding: '6px 18px',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isLoading ? 'COMMUNICATING...' : isHardwareStreaming ? 'DISCONNECT' : 'CONNECT'}
        </button>
      </div>
    </div>
  );
};