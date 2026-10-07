import React from 'react';

export type ActivePlotTab = 'thrust_time' | 'electrical_time' | 'thrust_throttle';

interface PlotControlsProps {
  activeTab: ActivePlotTab;
  onTabChange: (tab: ActivePlotTab) => void;
  onClear: () => void;
}

export const PlotControls: React.FC<PlotControlsProps> = ({ activeTab, onTabChange, onClear }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onTabChange('thrust_time')}
          style={tabStyle(activeTab === 'thrust_time')}
        >
          Thrust & RPM
        </button>
        <button
          onClick={() => onTabChange('electrical_time')}
          style={tabStyle(activeTab === 'electrical_time')}
        >
          Electrical (V & A)
        </button>
        <button
          onClick={() => onTabChange('thrust_throttle')}
          style={tabStyle(activeTab === 'thrust_throttle')}
        >
          Thrust vs. Throttle (%)
        </button>
      </div>

      <button
        onClick={onClear}
        style={{
          background: 'none',
          border: '1px solid #334155',
          color: 'var(--text-secondary)',
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '11px',
          cursor: 'pointer',
        }}
      >
        Clear Buffer
      </button>
    </div>
  );
};

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  backgroundColor: isActive ? '#0284c7' : '#1e293b',
  color: isActive ? '#ffffff' : '#94a3b8',
  border: '1px solid #334155',
  borderRadius: '6px',
  padding: '6px 14px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});