import React, { useEffect, useRef } from 'react';
import { ActivePlotTab, LayoutMode } from './PlotControls';
import { TelemetryPacket } from '../../types/telemetry';

interface TelemetryPlotProps {
  activeTab: ActivePlotTab;
  layoutMode: LayoutMode;
  getLatestPacket: () => TelemetryPacket | null;
  clearTrigger: number;
}

interface PlotSample {
  time: number;
  thrust: number;
  rpm: number;
  voltage: number;
  current: number;
}

export const TelemetryPlot: React.FC<TelemetryPlotProps> = ({
  activeTab,
  layoutMode,
  getLatestPacket,
  clearTrigger,
}) => {
  const bufferRef = useRef<PlotSample[]>([]);
  const MAX_SAMPLES = 300; // 6 seconds of rolling history at 50Hz

  useEffect(() => {
    bufferRef.current = [];
  }, [clearTrigger]);

  // Unified telemetry ingestion loop
  useEffect(() => {
    let animId: number;

    const sampleLoop = () => {
      const pkt = getLatestPacket();
      if (pkt) {
        bufferRef.current.push({
          time: pkt.uptime_ms / 1000,
          thrust: pkt.thrust_g,
          rpm: pkt.rpm,
          voltage: pkt.voltage_v,
          current: pkt.current_a,
        });
        if (bufferRef.current.length > MAX_SAMPLES) {
          bufferRef.current.shift();
        }
      }
      animId = requestAnimationFrame(sampleLoop);
    };

    animId = requestAnimationFrame(sampleLoop);
    return () => cancelAnimationFrame(animId);
  }, [getLatestPacket]);

  // Single Graph View
  if (layoutMode === 'single') {
    return (
      <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab={activeTab} bufferRef={bufferRef} />
      </div>
    );
  }

  // Dual Split View (Left/Right columns)
  if (layoutMode === 'split') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minWidth: 0,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '8px',
        }}
      >
        <CanvasPane tab="thrust_time" title="Thrust & RPM" bufferRef={bufferRef} />
        <CanvasPane tab="electrical_time" title="Electrical (V & A)" bufferRef={bufferRef} />
      </div>
    );
  }

  // 3-Graph Grid View
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gridTemplateRows: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '8px',
      }}
    >
      <div style={{ gridColumn: '1 / 2', gridRow: '1 / 2', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="thrust_time" title="Thrust & RPM" bufferRef={bufferRef} />
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="electrical_time" title="Electrical (V & A)" bufferRef={bufferRef} />
      </div>
      <div style={{ gridColumn: '1 / 3', gridRow: '2 / 3', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="thrust_throttle" title="Thrust vs. Throttle (%) Curve" bufferRef={bufferRef} />
      </div>
    </div>
  );
};

// Reusable single canvas pane utilizing the Absolute Fill Container pattern
interface CanvasPaneProps {
  tab: ActivePlotTab;
  title?: string;
  bufferRef: React.MutableRefObject<PlotSample[]>;
}

const CanvasPane: React.FC<CanvasPaneProps> = ({ tab, title, bufferRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ResizeObserver monitors the parent container, NOT the canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = Math.floor(width);
          canvas.height = Math.floor(height);
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let animId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPlot(ctx, canvas.width, canvas.height, bufferRef.current, tab, title);
        }
      }
      animId = requestAnimationFrame(drawLoop);
    };

    animId = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animId);
  }, [tab, title, bufferRef]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'block',
          borderRadius: '4px',
          backgroundColor: '#0a141f',
        }}
      />
    </div>
  );
};

function drawPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: PlotSample[],
  tab: ActivePlotTab,
  customTitle?: string
) {
  ctx.clearRect(0, 0, width, height);

  const padLeft = 48;
  const padRight = 48;
  const padTop = customTitle ? 20 : 14;
  const padBottom = 20;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  if (customTitle) {
    ctx.fillStyle = 'var(--brand-ice)';
    ctx.font = '11px var(--font-heading)';
    ctx.textAlign = 'left';
    ctx.fillText(customTitle, padLeft, 13);
  }

  // Grid background
  ctx.strokeStyle = 'rgba(201, 214, 234, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  if (data.length < 2) {
    ctx.fillStyle = 'var(--brand-ice)';
    ctx.font = '11px var(--font-body)';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting stream...', width / 2, height / 2);
    return;
  }

  if (tab === 'thrust_time') {
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    const maxRPM = Math.max(2000, ...data.map((d) => d.rpm));

    drawLineSeries(ctx, data, (d) => d.thrust, 0, maxThrust, padLeft, padTop, plotW, plotH, '#ECEB2A');
    drawLineSeries(ctx, data, (d) => d.rpm, 0, maxRPM, padLeft, padTop, plotW, plotH, '#38bdf8');

    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 6, padTop, '#ECEB2A', 'right');
    drawAxisLabel(ctx, '0 g', padLeft - 6, padTop + plotH, '#ECEB2A', 'right');
    drawAxisLabel(ctx, `${maxRPM.toFixed(0)} RPM`, width - padRight + 6, padTop, '#38bdf8', 'left');
    drawAxisLabel(ctx, '0 RPM', width - padRight + 6, padTop + plotH, '#38bdf8', 'left');
  } else if (tab === 'electrical_time') {
    const maxCurrent = Math.max(10, ...data.map((d) => d.current));
    const maxVolts = Math.max(18, ...data.map((d) => d.voltage));

    drawLineSeries(ctx, data, (d) => d.current, 0, maxCurrent, padLeft, padTop, plotW, plotH, '#ef4444');
    drawLineSeries(ctx, data, (d) => d.voltage, 0, maxVolts, padLeft, padTop, plotW, plotH, '#22c55e');

    drawAxisLabel(ctx, `${maxCurrent.toFixed(1)} A`, padLeft - 6, padTop, '#ef4444', 'right');
    drawAxisLabel(ctx, '0 A', padLeft - 6, padTop + plotH, '#ef4444', 'right');
    drawAxisLabel(ctx, `${maxVolts.toFixed(1)} V`, width - padRight + 6, padTop, '#22c55e', 'left');
    drawAxisLabel(ctx, '0 V', width - padRight + 6, padTop + plotH, '#22c55e', 'left');
  } else if (tab === 'thrust_throttle') {
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    ctx.fillStyle = '#ECEB2A';
    data.forEach((d, i) => {
      const x = padLeft + (i / data.length) * plotW;
      const y = padTop + plotH - (d.thrust / maxThrust) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });
    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 6, padTop, '#ECEB2A', 'right');
    drawAxisLabel(ctx, '0 g', padLeft - 6, padTop + plotH, '#ECEB2A', 'right');
  }
}

function drawLineSeries(
  ctx: CanvasRenderingContext2D,
  data: PlotSample[],
  valFn: (d: PlotSample) => number,
  minVal: number,
  maxVal: number,
  left: number,
  top: number,
  w: number,
  h: number,
  color: string
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.beginPath();

  data.forEach((d, i) => {
    const x = left + (i / (data.length - 1)) * w;
    const norm = Math.max(0, Math.min(1, (valFn(d) - minVal) / (maxVal - minVal || 1)));
    const y = top + h - norm * h;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
}

function drawAxisLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  align: CanvasTextAlign
) {
  ctx.fillStyle = color;
  ctx.font = '9px var(--font-body)';
  ctx.textAlign = align;
  ctx.fillText(text, x, y + 3);
}