import React from 'react';

export type ActivePlotTab = 'thrust_time' | 'electrical_time' | 'thrust_throttle';

interface PlotControlsProps {
  activeTab: ActivePlotTab;
  onTabChange: (tab: ActivePlotTab) => void;
  onClear: () => void;
}

export const PlotControls: React.FC<PlotControlsProps> = ({ activeTab, onTabChange, onClear }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <div style={{ display: 'flex', gap: '6px' }}>
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
          background: 'transparent',
          border: '1px solid rgba(201, 214, 234, 0.2)',
          color: 'var(--brand-ice)',
          borderRadius: '4px',
          padding: '3px 8px',
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
  backgroundColor: isActive ? 'var(--brand-blue)' : 'transparent',
  color: isActive ? '#FFFFFF' : 'var(--brand-ice)',
  border: isActive ? '1px solid var(--brand-ice)' : '1px solid rgba(201, 214, 234, 0.2)',
  borderRadius: '4px',
  padding: '5px 12px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});