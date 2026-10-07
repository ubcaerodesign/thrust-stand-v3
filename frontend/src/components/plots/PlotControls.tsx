import React from 'react';

export type ActivePlotTab = 'thrust_time' | 'electrical_time' | 'thrust_throttle';
export type LayoutMode = 'single' | 'split' | 'grid';

interface PlotControlsProps {
  activeTab: ActivePlotTab;
  layoutMode: LayoutMode;
  onTabChange: (tab: ActivePlotTab) => void;
  onLayoutChange: (mode: LayoutMode) => void;
  onClear: () => void;
}

export const PlotControls: React.FC<PlotControlsProps> = ({
  activeTab,
  layoutMode,
  onTabChange,
  onLayoutChange,
  onClear,
}) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
      {/* Left side: View Mode Toggle + Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Layout Switcher */}
        <div style={{ display: 'flex', gap: '3px', backgroundColor: 'var(--bg-base)', padding: '2px', borderRadius: '6px', border: '1px solid rgba(201, 214, 234, 0.15)' }}>
          <button
            onClick={() => onLayoutChange('single')}
            style={layoutBtnStyle(layoutMode === 'single')}
            title="Single Large Graph"
          >
            Single
          </button>
          <button
            onClick={() => onLayoutChange('split')}
            style={layoutBtnStyle(layoutMode === 'split')}
            title="Dual Split View (Thrust + Electrical)"
          >
            Dual Split
          </button>
          <button
            onClick={() => onLayoutChange('grid')}
            style={layoutBtnStyle(layoutMode === 'grid')}
            title="3-Graph Grid View"
          >
            Grid (All)
          </button>
        </div>

        {/* Tab Selector (Only shown if Single Mode is active) */}
        {layoutMode === 'single' && (
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
        )}
      </div>

      {/* Right side: Clear Buffer */}
      <button
        onClick={onClear}
        style={{
          background: 'transparent',
          border: '1px solid rgba(201, 214, 234, 0.2)',
          color: 'var(--brand-ice)',
          borderRadius: '4px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Clear Buffer
      </button>
    </div>
  );
};

const layoutBtnStyle = (isActive: boolean): React.CSSProperties => ({
  backgroundColor: isActive ? 'var(--brand-blue)' : 'transparent',
  color: isActive ? '#FFFFFF' : 'var(--brand-ice)',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  backgroundColor: isActive ? 'var(--brand-surface-elevated)' : 'transparent',
  color: isActive ? 'var(--brand-yellow)' : 'var(--brand-ice)',
  border: isActive ? '1px solid var(--brand-yellow)' : '1px solid rgba(201, 214, 234, 0.2)',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});