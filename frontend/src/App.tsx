import { useTelemetryStream } from './hooks/useTelemetryStream';
import { useKeyboardEStop } from './hooks/useKeyboardEStop';
import { NumericCard } from './components/instruments/NumericCard';
import { EStopButton } from './components/safety/EStopButton';

export default function App() {
  const { isConnected, latestPacket } = useTelemetryStream();
  const { triggerEStop } = useKeyboardEStop();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* Header Zone */}
      <header style={{ 
        height: 'var(--header-height)', 
        backgroundColor: 'var(--bg-surface)',
        borderBottom: 'var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/src/assets/logo-primary.png" alt="UBC AeroDesign" style={{ height: '40px', width: '40px' }} />
          <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '1px' }}>AEROTHRUST V3</h2>
          <div style={{ 
            padding: '4px 12px', 
            borderRadius: '12px', 
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: isConnected ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
            color: isConnected ? 'var(--color-success)' : 'var(--color-danger)' 
          }}>
            {isConnected ? 'LIVE TELEMETRY' : 'OFFLINE'}
          </div>
        </div>
        
        <EStopButton onTrigger={triggerEStop} />
      </header>

      {/* Main Content Zone */}
      <main style={{ flex: 1, padding: '24px', display: 'flex', gap: '24px' }}>
        
        {/* Left Panel: Instruments */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '280px' }}>
          <NumericCard 
            title="Axial Thrust" 
            unit="g" 
            getValue={() => latestPacket.current?.thrust_g ?? 0} 
            precision={0} 
          />
          <NumericCard 
            title="Motor RPM" 
            unit="RPM" 
            getValue={() => latestPacket.current?.rpm ?? 0} 
            precision={0} 
          />
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
          <NumericCard 
            title="Propulsion Efficiency" 
            unit="g/W" 
            getValue={() => {
              const p = latestPacket.current;
              if (!p || p.power_w <= 0) return 0;
              return p.thrust_g / p.power_w;
            }} 
            precision={2} 
          />
        </section>

        {/* Right Panel: Canvas Visualization (Placeholder for uPlot integration) */}
        <section className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-secondary)' }}>uPlot Canvas Area (Reserved for High-Speed Plotting Integration)</p>
        </section>

      </main>
    </div>
  );
}