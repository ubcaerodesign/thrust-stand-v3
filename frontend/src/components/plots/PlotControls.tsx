import React from 'react';
import { SinglePaneIcon, DualSplitIcon, GridPaneIcon } from '../common/Icons';

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
      {/* Left side: View Mode Switcher (Icons) & Tab Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Layout Switcher (Icons) */}
        <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--bg-base)', padding: '2px', borderRadius: '0px', border: 'var(--border-subtle)' }}>
          <button
            onClick={() => onLayoutChange('single')}
            style={layoutBtnStyle(layoutMode === 'single')}
            title="Single Large Graph View"
            aria-label="Single View"
          >
            <SinglePaneIcon size={14} color={layoutMode === 'single' ? '#FFFFFF' : 'var(--text-primary)'} />
          </button>
          <button
            onClick={() => onLayoutChange('split')}
            style={layoutBtnStyle(layoutMode === 'split')}
            title="Dual Split View (Thrust + Selected Right Pane)"
            aria-label="Dual Split View"
          >
            <DualSplitIcon size={14} color={layoutMode === 'split' ? '#FFFFFF' : 'var(--text-primary)'} />
          </button>
          <button
            onClick={() => onLayoutChange('grid')}
            style={layoutBtnStyle(layoutMode === 'grid')}
            title="4-Graph 2x2 Matrix (Thrust, Torque, Electrical, Throttle Curve)"
            aria-label="2x2 Grid View"
          >
            <GridPaneIcon size={14} color={layoutMode === 'grid' ? '#FFFFFF' : 'var(--text-primary)'} />
          </button>
        </div>

        {/* Tab Selector for Single View */}
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

        {/* Right Pane Selector for Dual Split View */}
        {layoutMode === 'split' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 700 }}>Right Pane:</span>
            <button
              onClick={() => onTabChange('torque_time')}
              style={tabStyle(activeTab === 'torque_time' || activeTab === 'thrust_time')}
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
      </div>

      {/* Right side: Clear Buffer */}
      <button
        onClick={onClear}
        style={{
          background: 'transparent',
          border: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
          borderRadius: '0px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 700,
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
  color: isActive ? '#FFFFFF' : 'var(--text-primary)',
  border: 'none',
  borderRadius: '0px',
  padding: '5px 8px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});

const tabStyle = (isActive: boolean): React.CSSProperties => ({
  backgroundColor: isActive ? 'var(--brand-surface-elevated)' : 'transparent',
  color: isActive ? 'var(--brand-yellow)' : 'var(--text-primary)',
  border: isActive ? '1px solid var(--brand-yellow)' : 'var(--border-subtle)',
  borderRadius: '0px',
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
});