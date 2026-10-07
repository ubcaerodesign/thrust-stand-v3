import React, { useState } from 'react';
import { api } from '../../services/api';
import { TransportMode } from '../../types/session';

interface ConnectionBarProps {
  isConnected: boolean;
  onTare: () => void;
}

export const ConnectionBar: React.FC<ConnectionBarProps> = ({ isConnected, onTare }) => {
  const [mode, setMode] = useState<TransportMode>('simulator');
  const [port, setPort] = useState<string>('COM3');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleConnect = async () => {
    setIsLoading(true);
    try {
      if (isConnected) {
        await api.disconnect();
      } else {
        await api.connect({
          mode,
          port: mode === 'serial' ? port : undefined,
          baudrate: 115200,
        });
      }
    } catch (err) {
      alert(`Connection failed: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '10px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>TRANSPORT:</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as TransportMode)}
          disabled={isConnected || isLoading}
          style={{
            backgroundColor: '#0f172a',
            color: 'var(--text-primary)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '6px 12px',
            fontSize: '13px',
          }}
        >
          <option value="simulator">Virtual Simulator (TCP :8765)</option>
          <option value="serial">Physical USB Serial (STM32)</option>
        </select>

        {mode === 'serial' && (
          <input
            type="text"
            value={port}
            onChange={(e) => setPort(e.target.value)}
            placeholder="e.g. COM3 or /dev/ttyUSB0"
            disabled={isConnected || isLoading}
            style={{
              backgroundColor: '#0f172a',
              color: 'var(--text-primary)',
              border: '1px solid #334155',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '13px',
              width: '130px',
            }}
          />
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onTare}
          disabled={!isConnected}
          style={{
            backgroundColor: '#334155',
            color: '#f8fafc',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 16px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: isConnected ? 'pointer' : 'not-allowed',
            opacity: isConnected ? 1 : 0.5,
          }}
        >
          TARE ALL
        </button>

        <button
          onClick={handleConnect}
          disabled={isLoading}
          style={{
            backgroundColor: isConnected ? '#ef4444' : '#0284c7',
            color: '#ffffff',
            border: 'none',
            borderRadius: '6px',
            padding: '7px 20px',
            fontSize: '13px',
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          {isLoading ? 'WORKING...' : isConnected ? 'DISCONNECT' : 'CONNECT'}
        </button>
      </div>
    </div>
  );
};