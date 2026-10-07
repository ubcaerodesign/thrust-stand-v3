import React from 'react';

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
      <div style={{ backgroundColor: '#7f1d1d', color: '#FFFFFF', padding: '6px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>
        BACKEND DAEMON OFFLINE — Launch 'python backend/run.py' in your terminal.
      </div>
    );
  }

  if (isEstop) {
    return (
      <div style={{ backgroundColor: 'var(--brand-yellow)', color: '#000000', padding: '8px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>
        ⚠️ EMERGENCY STOP ENGAGED — Throttle forced to 0%. Reconnect hardware transport to clear the safety latch.
      </div>
    );
  }

  if (!isHardwareStreaming) {
    return (
      <div style={{ backgroundColor: 'var(--brand-blue)', color: 'var(--brand-ice)', padding: '6px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
        STANDBY — Hardware transport disconnected. Select a transport below and click CONNECT.
      </div>
    );
  }

  if (voltage > 0 && voltage < 10.5) {
    return (
      <div style={{ backgroundColor: '#b45309', color: '#FFFFFF', padding: '6px 20px', textAlign: 'center', fontSize: '12px', fontWeight: 700 }}>
        CRITICAL BATTERY SAG: {voltage.toFixed(2)} V — Safe discharge threshold breached.
      </div>
    );
  }

  return null;
};