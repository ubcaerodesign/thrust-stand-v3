import React from 'react';
import { EstopIcon } from '../common/Icons';

interface SafetyBannerProps {
  isEstop: boolean;
  isWsConnected: boolean;
  isHardwareStreaming: boolean;
  voltage: number;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({
  isEstop,
  isWsConnected,
  isHardwareStreaming,
  voltage,
}) => {
  if (!isWsConnected) {
    return (
      <div style={{ backgroundColor: '#7f1d1d', color: '#FFFFFF', padding: '6px 20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, letterSpacing: '0.8px' }}>
        BACKEND DAEMON OFFLINE — Launch 'python backend/run.py' in your terminal.
      </div>
    );
  }

  if (isEstop) {
    return (
      <div
        style={{
          backgroundColor: 'var(--brand-yellow)',
          color: '#000000',
          padding: '7px 20px',
          textAlign: 'center',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <EstopIcon size={14} color="#000000" />
        EMERGENCY STOP ENGAGED — Throttle forced to 0%. Reconnect hardware transport to clear safety latch.
      </div>
    );
  }

  if (!isHardwareStreaming) {
    return (
      <div
        style={{
          backgroundColor: 'var(--banner-standby-bg)',
          color: 'var(--banner-standby-text)',
          borderBottom: 'var(--border-subtle)',
          padding: '6px 20px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.6px',
        }}
      >
        STANDBY — Hardware transport disconnected. Select a transport below and click CONNECT.
      </div>
    );
  }

  if (voltage > 0 && voltage < 10.5) {
    return (
      <div
        style={{
          backgroundColor: 'var(--color-warning)',
          color: '#000000',
          padding: '6px 20px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 700,
        }}
      >
        CRITICAL BATTERY SAG: {voltage.toFixed(2)} V — Safe discharge threshold breached.
      </div>
    );
  }

  return null;
};