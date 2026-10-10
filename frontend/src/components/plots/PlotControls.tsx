import React from 'react';

export type ActivePlotTab = 'thrust_time' | 'torque_time' | 'electrical_time' | 'thrust_throttle';
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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
            title="Dual Split View"
          >
            Dual Split
          </button>
          <button
            onClick={() => onLayoutChange('grid')}
            style={layoutBtnStyle(layoutMode === 'grid')}
            title="4-Graph 2x2 Grid View"
          >
            Grid (All 4)
          </button>
        </div>

        {/* Tab Selector for Single Mode */}
        {layoutMode === 'single' && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onTabChange('thrust_time')}
              style={tabStyle(activeTab === 'thrust_time')}
            >
              Thrust & RPM
            </button>
            <button
              onClick={() => onTabChange('torque_time')}
              style={tabStyle(activeTab === 'torque_time')}
            >
              Reaction Torque (LC2)
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

        {/* Second Pane Selector for Dual Split Mode */}
        {layoutMode === 'split' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--brand-ice)', fontWeight: 600 }}>Right Pane:</span>
            <button
              onClick={() => onTabChange('torque_time')}
              style={tabStyle(activeTab === 'torque_time' || activeTab === 'thrust_time')}
            >
              Torque (LC2)
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