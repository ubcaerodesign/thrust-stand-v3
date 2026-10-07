import React from 'react';

interface SafetyBannerProps {
  isEstop: boolean;
  isConnected: boolean;
  voltage: number;
}

export const SafetyBanner: React.FC<SafetyBannerProps> = ({ isEstop, isConnected, voltage }) => {
  if (!isConnected) {
    return (
      <div style={{ backgroundColor: '#7f1d1d', color: '#fecaca', padding: '8px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
        HARDWARE DISCONNECTED — Connect via the control bar below to begin testing.
      </div>
    );
  }

  if (isEstop) {
    return (
      <div style={{ backgroundColor: '#ef4444', color: '#ffffff', padding: '10px 24px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        EMERGENCY STOP ENGAGED — Throttle locked to 0%. Reconnect to reset the watchdog.
      </div>
    );
  }

  // Low voltage warning (< 10.5V for 3S or < 14.0V for 4S under load)
  if (voltage > 0 && voltage < 10.5) {
    return (
      <div style={{ backgroundColor: '#78350f', color: '#fef3c7', padding: '8px 24px', textAlign: 'center', fontSize: '13px', fontWeight: 600 }}>
        WARNING: Severe battery voltage sag ({voltage.toFixed(2)} V). Recharge battery pack immediately.
      </div>
    );
  }

  return null;
};