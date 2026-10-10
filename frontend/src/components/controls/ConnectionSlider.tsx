import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { TransportMode } from '../../types/session';
import { RefreshIcon, SpinnerIcon, TuneIcon } from '../common/Icons';

interface ConnectionBarProps {
  isHardwareStreaming: boolean;
  onTareAll: () => void;
  onOpenCalibration: () => void;
}

export const ConnectionBar: React.FC<ConnectionBarProps> = ({
  isHardwareStreaming,
  onTareAll,
  onOpenCalibration,
}) => {
  const [mode, setMode] = useState<TransportMode>('simulator');
  const [port, setPort] = useState<string>('COM3');
  const [availablePorts, setAvailablePorts] = useState<string[]>([]);
  const [isManualPort, setIsManualPort] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshingPorts, setIsRefreshingPorts] = useState<boolean>(false);

  const refreshPorts = async () => {
    setIsRefreshingPorts(true);
    try {
      const res = await api.getAvailablePorts();
      if (res && Array.isArray(res.ports)) {
        setAvailablePorts(res.ports);
        if (res.ports.length > 0 && !res.ports.includes(port)) {
          setPort(res.ports[0]);
          setIsManualPort(false);
        } else if (res.ports.length === 0) {
          setIsManualPort(true);
        }
      }
    } catch {
      // Retain fallback port value
    } finally {
      setIsRefreshingPorts(false);
    }
  };

  useEffect(() => {
    refreshPorts();
  }, []);

  const handleModeChange = (newMode: TransportMode) => {
    setMode(newMode);
    if (newMode === 'serial' || newMode === 'legacy_serial') {
      refreshPorts();
    }
  };

  const handleToggleConnect = async () => {
    setIsLoading(true);
    try {
      if (isHardwareStreaming) {
        await api.disconnect();
      } else {
        await api.connect({
          mode,
          port: (mode === 'serial' || mode === 'legacy_serial') ? port : undefined,
          baudrate: mode === 'legacy_serial' ? 9600 : 115200,
        });
      }
    } catch (err) {
      alert(`Connection Error: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const isSerialMode = mode === 'serial' || mode === 'legacy_serial';

  return (
    <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '6px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--brand-ice)', letterSpacing: '0.8px' }}>
          HARDWARE TRANSPORT:
        </span>
        <select
          value={mode}
          onChange={(e) => handleModeChange(e.target.value as TransportMode)}
          disabled={isHardwareStreaming || isLoading}
          style={{
            backgroundColor: 'var(--bg-base)',
            color: 'var(--text-primary)',
            border: '1px solid rgba(201, 214, 234, 0.3)',
            borderRadius: '0px',
            padding: '4px 8px',
            fontSize: '11px',
            fontFamily: 'var(--font-body)',
          }}
        >
          <option value="simulator">Virtual Simulator (Built-in)</option>
          <option value="serial">Physical USB Serial (STM32 Controller - 115200 baud)</option>
          <option value="legacy_serial">Legacy Arduino Leonardo (V2 - 9600 baud)</option>
        </select>

        {isSerialMode && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {!isManualPort && availablePorts.length > 0 ? (
              <select
                value={port}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsManualPort(true);
                  } else {
                    setPort(e.target.value);
                  }
                }}
                disabled={isHardwareStreaming || isLoading}
                style={{
                  backgroundColor: 'var(--bg-base)',
                  color: 'var(--text-primary)',
                  border: '1px solid rgba(201, 214, 234, 0.3)',
                  borderRadius: '0px',
                  padding: '4px 8px',
                  fontSize: '11px',
                }}
              >
                {availablePorts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
                <option value="__custom__">Manual entry...</option>
              </select>
            ) : (
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
                  borderRadius: '0px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  width: '120px',
                }}
              />
            )}

            <button
              type="button"
              onClick={refreshPorts}
              disabled={isHardwareStreaming || isLoading || isRefreshingPorts}
              title="Scan and refresh available COM ports"
              style={{
                backgroundColor: 'transparent',
                color: 'var(--brand-ice)',
                border: '1px solid rgba(201, 214, 234, 0.3)',
                borderRadius: '0px',
                padding: '4px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {isRefreshingPorts ? <SpinnerIcon size={12} color="var(--brand-ice)" /> : <RefreshIcon size={12} color="var(--brand-ice)" />}
            </button>

            {isManualPort && availablePorts.length > 0 && (
              <button
                type="button"
                onClick={() => setIsManualPort(false)}
                title="Switch back to detected ports"
                style={{
                  backgroundColor: 'transparent',
                  color: 'var(--brand-ice)',
                  border: 'none',
                  fontSize: '11px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                List
              </button>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={onOpenCalibration}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--brand-ice)',
            border: '1px solid rgba(201, 214, 234, 0.3)',
            borderRadius: '0px',
            padding: '5px 12px',
            minWidth: '125px',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
          }}
          title="Open per-channel calibration and tare inspector"
        >
          <TuneIcon size={13} color="var(--brand-ice)" />
          CHANNELS...
        </button>

        <button
          onClick={onTareAll}
          disabled={!isHardwareStreaming}
          style={{
            backgroundColor: 'transparent',
            color: 'var(--brand-ice)',
            border: '1px solid rgba(201, 214, 234, 0.3)',
            borderRadius: '0px',
            padding: '5px 12px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: isHardwareStreaming ? 'pointer' : 'not-allowed',
            opacity: isHardwareStreaming ? 1 : 0.4,
          }}
          title="Master tare for all 4 channels (0x0F)"
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
            borderRadius: '0px',
            padding: '5px 16px',
            fontSize: '11px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
        >
          {isLoading ? 'SYNCING...' : isHardwareStreaming ? 'DISCONNECT' : 'CONNECT'}
        </button>
      </div>
    </div>
  );
};