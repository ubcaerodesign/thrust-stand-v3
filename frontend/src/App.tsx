import React, { useState } from 'react';
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
import { TelemetryPlot } from './components/plots/TelemetryPlot';
import { PlotControls, ActivePlotTab } from './components/plots/PlotControls';

export default function App() {
  const { isConnected, latestPacket } = useTelemetryStream();
  const { triggerEStop } = useKeyboardEStop();

  const [plotTab, setPlotTab] = useState<ActivePlotTab>('thrust_time');
  const [clearTrigger, setClearTrigger] = useState<number>(0);

  const handleTare = async () => {
    try {
      await api.tare({ mask: 0x0f });
    } catch (err) {
      alert(`Tare failed: ${(err as Error).message}`);
    }
  };

  const isEstop = latestPacket.current?.estop ?? false;
  const voltage = latestPacket.current?.voltage_v ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'var(--bg-base)' }}>
      {/* Top Header */}
      <header
        style={{
          height: 'var(--header-height)',
          backgroundColor: 'var(--bg-surface)',
          borderBottom: 'var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/src/assets/logo-primary.png" alt="UBC AeroDesign" style={{ height: '36px', width: '36px' }} />
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', letterSpacing: '1px' }}>AEROTHRUST V3</h2>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>UBC AeroDesign Ground Station</span>
          </div>
        </div>

        <EStopButton onTrigger={triggerEStop} isEstopActive={isEstop} />
      </header>

      {/* Safety Alert Banner */}
      <SafetyBanner isEstop={isEstop} isConnected={isConnected} voltage={voltage} />

      {/* Connection & Setup Toolbar */}
      <div style={{ padding: '12px 24px 0 24px' }}>
        <ConnectionBar isConnected={isConnected} onTare={handleTare} />
      </div>

      {/* Main Ground Station Dashboard */}
      <main style={{ flex: 1, padding: '16px 24px', display: 'flex', gap: '20px', overflow: 'hidden' }}>
        {/* Left Column: Primary Telemetry Gauges */}
        <section style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <NumericCard
              title="Electric Power"
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

        {/* Center/Right Column: Plots & Actuation Controls */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Canvas Plot Container */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <PlotControls
              activeTab={plotTab}
              onTabChange={setPlotTab}
              onClear={() => setClearTrigger((prev) => prev + 1)}
            />
            <div style={{ flex: 1, position: 'relative' }}>
              <TelemetryPlot
                activeTab={plotTab}
                getLatestPacket={() => latestPacket.current}
                clearTrigger={clearTrigger}
              />
            </div>
          </div>

          {/* Test Session Recorder */}
          <SessionRecorder isConnected={isConnected} />

          {/* Throttle Actuation Bar */}
          <ThrottleSlider isConnected={isConnected} isEstop={isEstop} />
        </section>
      </main>
    </div>
  );
}