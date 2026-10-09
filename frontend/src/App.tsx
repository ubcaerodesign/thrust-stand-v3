import React, { useState, useEffect } from 'react';
import { useTelemetryStream } from './hooks/useTelemetryStream';
import { useKeyboardEStop } from './hooks/useKeyboardEStop';
import { api } from './services/api';

// Components
import { NumericCard } from './components/instruments/NumericCard';
import { TachometerGauge } from './components/instruments/TachometerGauge';
import { BatteryGauge } from './components/instruments/BatteryGauge';
import { EStopButton } from './components/safety/EStopButton';
import { SafetyBanner } from './components/safety/SafetyBanner';
import { ConnectionBar } from './components/controls/ConnectionSlider';
import { ThrottleSlider } from './components/controls/ThrottleSlider';
import { SessionRecorder } from './components/controls/SessionRecorder';
import { SequenceController } from './components/controls/SequenceController';
import { CalibrationModal } from './components/controls/CalibrationModal';
import { TelemetryPlot } from './components/plots/TelemetryPlot';
import { PlotControls, ActivePlotTab, LayoutMode } from './components/plots/PlotControls';

export default function App() {
  const { isWsConnected, isHardwareStreaming, isEstop, sequenceStatus, latestPacket } = useTelemetryStream();
  const { triggerEStop } = useKeyboardEStop();

  const [plotTab, setPlotTab] = useState<ActivePlotTab>('thrust_time');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
  const [clearTrigger, setClearTrigger] = useState<number>(0);
  const [isCalibrationOpen, setIsCalibrationOpen] = useState<boolean>(false);

  // Theme State: 'dark' (Flight Deck) vs 'light' (Airfield Sunlight)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('aerothrust_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aerothrust_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleTareAll = async () => {
    try {
      await api.tare({ mask: 0x0f });
    } catch (err) {
      alert(`Tare failed: ${(err as Error).message}`);
    }
  };

  const voltage = latestPacket.current?.voltage_v ?? 0;
  const isSequenceRunning = sequenceStatus?.is_running ?? false;

  return (
    <div
      data-theme={theme}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        backgroundColor: 'var(--bg-base)',
        overflow: 'hidden',
      }}
    >
      {/* Brand Header — Maintained in Navy (#11273B) per Brand Guidelines */}
      <header
        style={{
          height: 'var(--header-height)',
          backgroundColor: '#11273B',
          borderBottom: '1px solid rgba(201, 214, 234, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img
            src="/src/assets/logo_white_horizontal.svg"
            alt="UBC AeroDesign"
            style={{ height: '36px', maxWidth: '160px', objectFit: 'contain' }}
          />
          <div style={{ height: '24px', width: '1px', backgroundColor: 'rgba(201, 214, 234, 0.2)' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', letterSpacing: '1px', color: '#FFFFFF' }}>AEROTHRUST V3</h2>
            <span style={{ fontSize: '10px', color: '#C9D6EA', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Ground Propulsion Testing Core
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            style={{
              backgroundColor: 'transparent',
              color: '#C9D6EA',
              border: '1px solid rgba(201, 214, 234, 0.3)',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title="Toggle between Flight Deck (Dark) and Airfield Sunlight (Light) themes"
          >
            {theme === 'dark' ? '☀️ AIRFIELD (LIGHT)' : '🌙 FLIGHT DECK (DARK)'}
          </button>

          <div
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: isHardwareStreaming ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: isHardwareStreaming ? 'var(--color-success)' : 'var(--color-danger)',
              border: isHardwareStreaming ? '1px solid var(--color-success)' : '1px solid var(--color-danger)',
            }}
          >
            {isHardwareStreaming ? 'STREAMING ACTIVE' : 'OFFLINE'}
          </div>

          <EStopButton onTrigger={triggerEStop} isEstopActive={isEstop} />
        </div>
      </header>

      {/* Safety Alert Banner */}
      <SafetyBanner
        isEstop={isEstop}
        isWsConnected={isWsConnected}
        isHardwareStreaming={isHardwareStreaming}
        voltage={voltage}
      />

      {/* Hardware Transport Toolbar */}
      <div style={{ padding: '8px 16px 0 16px', flexShrink: 0 }}>
        <ConnectionBar
          isHardwareStreaming={isHardwareStreaming}
          onTareAll={handleTareAll}
          onOpenCalibration={() => setIsCalibrationOpen(true)}
        />
      </div>

      {/* Main Responsive Layout */}
      <main
        style={{
          flex: 1,
          padding: '12px 16px',
          display: 'flex',
          gap: '16px',
          minHeight: 0,
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        {/* Left Column: Primary Telemetry Cluster */}
        <section
          style={{
            width: '260px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            overflowY: 'auto',
            paddingRight: '4px',
          }}
        >
          <NumericCard
            title="Axial Thrust"
            unit="g"
            getValue={() => latestPacket.current?.thrust_g ?? 0}
            precision={0}
          />

          <TachometerGauge
            getRPM={() => latestPacket.current?.rpm ?? 0}
            maxRPM={18000}
          />

          <NumericCard
            title="Reaction Torque"
            unit="g"
            getValue={() => latestPacket.current?.torque_g ?? 0}
            precision={0}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <NumericCard
              title="Bus Voltage"
              unit="V"
              getValue={() => latestPacket.current?.voltage_v ?? 0}
              precision={2}
            />
            <NumericCard
              title="Bus Current"
              unit="A"
              getValue={() => latestPacket.current?.current_a ?? 0}
              precision={2}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <NumericCard
              title="Power"
              unit="W"
              getValue={() => latestPacket.current?.power_w ?? 0}
              precision={1}
            />
            <NumericCard
              title="Efficiency"
              unit="g/W"
              getValue={() => {
                const p = latestPacket.current;
                if (!p || p.power_w <= 0) return 0;
                return p.thrust_g / p.power_w;
              }}
              precision={2}
            />
          </div>

          <BatteryGauge
            maxMah={1000}
            getVoltage={() => latestPacket.current?.voltage_v ?? 0}
            getCurrent={() => latestPacket.current?.current_a ?? 0}
          />
        </section>

        {/* Center/Right Column: Plot, Automation & Actuation Controls */}
        <section
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: 0,
            minHeight: 0,
            overflow: 'hidden',
          }}
        >
          {/* Dynamic Resizing Canvas Container */}
          <div
            className="glass-panel"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            <PlotControls
              activeTab={plotTab}
              layoutMode={layoutMode}
              onTabChange={setPlotTab}
              onLayoutChange={setLayoutMode}
              onClear={() => setClearTrigger((prev) => prev + 1)}
            />
            <div
              style={{
                flex: 1,
                minHeight: 0,
                minWidth: 0,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <TelemetryPlot
                activeTab={plotTab}
                layoutMode={layoutMode}
                theme={theme}
                getLatestPacket={() => latestPacket.current}
                clearTrigger={clearTrigger}
              />
            </div>
          </div>

          {/* Test Session Recording Bar */}
          <div style={{ flexShrink: 0 }}>
            <SessionRecorder isHardwareStreaming={isHardwareStreaming} />
          </div>

          {/* Automated Test Sequencer Bar */}
          <div style={{ flexShrink: 0 }}>
            <SequenceController
              isHardwareStreaming={isHardwareStreaming}
              isEstop={isEstop}
              sequenceStatus={sequenceStatus}
            />
          </div>

          {/* Manual Throttle Actuation Interface */}
          <div style={{ flexShrink: 0 }}>
            <ThrottleSlider
              isHardwareStreaming={isHardwareStreaming}
              isEstop={isEstop}
              isSequenceRunning={isSequenceRunning}
            />
          </div>
        </section>
      </main>

      {/* Granular Channel Calibration & Tare Modal */}
      <CalibrationModal
        isOpen={isCalibrationOpen}
        onClose={() => setIsCalibrationOpen(false)}
        getLatestPacket={() => latestPacket.current}
        isHardwareStreaming={isHardwareStreaming}
      />
    </div>
  );
}