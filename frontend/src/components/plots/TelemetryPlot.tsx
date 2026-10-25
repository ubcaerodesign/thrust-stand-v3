import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivePlotTab, LayoutMode } from './PlotControls';
import { TelemetryPacket } from '../../types/telemetry';

interface TelemetryPlotProps {
  activeTab: ActivePlotTab;
  layoutMode: LayoutMode;
  theme: 'dark' | 'light';
  getLatestPacket: () => TelemetryPacket | null;
  clearTrigger: number;
}

interface PlotSample {
  time: number;
  thrust: number;
  torque: number;
  rpm: number;
  voltage: number;
  current: number;
}

export const TelemetryPlot: React.FC<TelemetryPlotProps> = ({
  activeTab,
  layoutMode,
  theme,
  getLatestPacket,
  clearTrigger,
}) => {
  const bufferRef = useRef<PlotSample[]>([]);
  const MAX_SAMPLES = 3000; // Expanded to 3,000 samples (1 full minute of 50Hz history)

  useEffect(() => {
    bufferRef.current = [];
  }, [clearTrigger]);

  useEffect(() => {
    let animId: number;

    const sampleLoop = () => {
      const pkt = getLatestPacket();
      if (pkt) {
        bufferRef.current.push({
          time: pkt.uptime_ms / 1000,
          thrust: pkt.thrust_g,
          torque: pkt.torque_g,
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

  if (layoutMode === 'single') {
    return (
      <div style={{ width: '100%', height: '100%', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab={activeTab} theme={theme} bufferRef={bufferRef} />
      </div>
    );
  }

  if (layoutMode === 'split') {
    const rightTab: ActivePlotTab = activeTab === 'thrust_time' ? 'torque_time' : activeTab;
    const rightTitle =
      rightTab === 'torque_time'
        ? 'Reaction Torque (Load Cell 2)'
        : rightTab === 'electrical_time'
        ? 'Electrical (Voltage & Current)'
        : 'Thrust vs. Throttle (%) Curve';

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
        <CanvasPane tab="thrust_time" title="Axial Thrust & RPM (Load Cell 1)" theme={theme} bufferRef={bufferRef} />
        <CanvasPane tab={rightTab} title={rightTitle} theme={theme} bufferRef={bufferRef} />
      </div>
    );
  }

  // 4-Graph 2x2 Matrix
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
        <CanvasPane tab="thrust_time" title="Axial Thrust & RPM (Load Cell 1)" theme={theme} bufferRef={bufferRef} />
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="torque_time" title="Reaction Torque (Load Cell 2)" theme={theme} bufferRef={bufferRef} />
      </div>
      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="electrical_time" title="Electrical (Voltage & Current)" theme={theme} bufferRef={bufferRef} />
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane tab="thrust_throttle" title="Thrust vs. Throttle (%) Curve" theme={theme} bufferRef={bufferRef} />
      </div>
    </div>
  );
};

interface CanvasPaneProps {
  tab: ActivePlotTab;
  title?: string;
  theme: 'dark' | 'light';
  bufferRef: React.MutableRefObject<PlotSample[]>;
}

const CanvasPane: React.FC<CanvasPaneProps> = ({ tab, title, theme, bufferRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pan & Zoom state fractions (0.0 to 1.0 of buffer)
  const viewStart = useRef<number>(0);
  const viewEnd = useRef<number>(1);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);

  const [isPannedOrZoomed, setIsPannedOrZoomed] = useState<boolean>(false);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      isDragging.current = true;
      dragStartX.current = e.clientX;
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    dragStartX.current = e.clientX;

    const containerWidth = containerRef.current?.clientWidth || 100;
    const range = viewEnd.current - viewStart.current;
    const shift = (dx / containerWidth) * range;

    let newStart = viewStart.current - shift;
    let newEnd = newStart + range;

    // Fixed clamping logic to prevent window distortion at boundaries
    if (newStart < 0) {
      newStart = 0;
      newEnd = range;
    } else if (newEnd > 1) {
      newEnd = 1;
      newStart = Math.max(0, 1 - range);
    }

    viewStart.current = newStart;
    viewEnd.current = newEnd;
    setIsPannedOrZoomed(viewStart.current > 0.01 || viewEnd.current < 0.99);
  }, []);

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;
    const range = viewEnd.current - viewStart.current;
    const center = (viewStart.current + viewEnd.current) / 2;

    let newRange = range * zoomFactor;
    newRange = Math.max(0.01, Math.min(1.0, newRange));

    let newStart = center - newRange / 2;
    let newEnd = center + newRange / 2;

    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > 1) {
      newStart -= (newEnd - 1);
      newEnd = 1;
    }

    if (newStart < 0) newStart = 0;
    if (newEnd > 1) newEnd = 1;

    viewStart.current = newStart;
    viewEnd.current = newEnd;
    setIsPannedOrZoomed(viewStart.current > 0.01 || viewEnd.current < 0.99);
  }, []);

  const handleDoubleClick = () => {
    viewStart.current = 0;
    viewEnd.current = 1;
    setIsPannedOrZoomed(false);
  };

  useEffect(() => {
    let animId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPlot(ctx, canvas.width, canvas.height, bufferRef.current, tab, theme, title, viewStart.current, viewEnd.current);
        }
      }
      animId = requestAnimationFrame(drawLoop);
    };

    animId = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animId);
  }, [tab, title, theme, bufferRef]);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      onDoubleClick={handleDoubleClick}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        minWidth: 0,
        minHeight: 0,
        overflow: 'hidden',
        cursor: isDragging.current ? 'grabbing' : 'grab',
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
          borderRadius: '0px',
          backgroundColor: theme === 'light' ? '#FFFFFF' : '#0a141f',
          transition: 'background-color 0.2s ease',
        }}
      />
      {isPannedOrZoomed && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDoubleClick();
          }}
          style={{
            position: 'absolute',
            bottom: '8px',
            right: '8px',
            backgroundColor: 'var(--brand-blue)',
            color: '#FFFFFF',
            border: '1px solid var(--brand-ice)',
            borderRadius: '0px',
            padding: '3px 8px',
            fontSize: '10px',
            fontWeight: 700,
            cursor: 'pointer',
            zIndex: 10,
          }}
          title="Reset zoom & pan to live stream"
        >
          Reset to Live ↺
        </button>
      )}
    </div>
  );
};

function drawPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: PlotSample[],
  tab: ActivePlotTab,
  theme: 'dark' | 'light',
  customTitle?: string,
  viewStart: number = 0,
  viewEnd: number = 1
) {
  ctx.clearRect(0, 0, width, height);

  const isLight = theme === 'light';

  const colors = {
    bgGrid: isLight ? 'rgba(0, 53, 101, 0.12)' : 'rgba(201, 214, 234, 0.08)',
    textTitle: isLight ? '#0f172a' : '#C9D6EA',
    textPlaceholder: isLight ? '#334155' : 'rgba(201, 214, 234, 0.85)',
    thrustLine: isLight ? '#b45309' : '#ECEB2A',
    rpmLine: isLight ? '#0284c7' : '#38bdf8',
    torqueLine: isLight ? '#7c3aed' : '#a855f7',
    currentLine: isLight ? '#dc2626' : '#ef4444',
    voltageLine: isLight ? '#16a34a' : '#22c55e',
    zeroBaseline: isLight ? 'rgba(15, 23, 42, 0.4)' : 'rgba(201, 214, 234, 0.35)',
  };

  const padLeft = 52;
  const padRight = 52;
  const padTop = customTitle ? 20 : 14;
  const padBottom = 20;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  if (customTitle) {
    ctx.fillStyle = colors.textTitle;
    ctx.font = '700 11px "Titillium Web", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(customTitle, padLeft, 13);
  }

  // Grid background
  ctx.strokeStyle = colors.bgGrid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = padTop + (plotH / 3) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  if (data.length < 2) {
    ctx.fillStyle = colors.textPlaceholder;
    ctx.font = '700 12px Lato, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting live telemetry stream...', width / 2, height / 2);
    return;
  }

  const startIndex = Math.floor(viewStart * (data.length - 1));
  const endIndex = Math.ceil(viewEnd * (data.length - 1));
  const slicedData = data.slice(Math.max(0, startIndex), Math.min(data.length, endIndex + 1));

  if (slicedData.length < 2) return;

  if (tab === 'thrust_time') {
    const rawMinThrust = Math.min(...slicedData.map((d) => d.thrust));
    const rawMaxThrust = Math.max(...slicedData.map((d) => d.thrust));
    const minThrust = Math.min(0, Math.floor((rawMinThrust - 50) / 100) * 100);
    const maxThrust = Math.max(minThrust + 500, Math.ceil((rawMaxThrust + 50) / 100) * 100);
    const maxRPM = Math.max(2000, Math.ceil(Math.max(...slicedData.map((d) => d.rpm)) / 500) * 500);

    if (minThrust < 0 && maxThrust > 0) {
      const zeroY = padTop + plotH - ((0 - minThrust) / (maxThrust - minThrust)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
      drawAxisLabel(ctx, '0 g', padLeft - 6, zeroY, colors.thrustLine, 'right');
    }

    drawLineSeries(ctx, slicedData, (d) => d.thrust, minThrust, maxThrust, padLeft, padTop, plotW, plotH, colors.thrustLine);
    drawLineSeries(ctx, slicedData, (d) => d.rpm, 0, maxRPM, padLeft, padTop, plotW, plotH, colors.rpmLine);

    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 6, padTop, colors.thrustLine, 'right');
    drawAxisLabel(ctx, `${minThrust.toFixed(0)} g`, padLeft - 6, padTop + plotH, colors.thrustLine, 'right');
    drawAxisLabel(ctx, `${maxRPM.toFixed(0)} RPM`, width - padRight + 6, padTop, colors.rpmLine, 'left');
    drawAxisLabel(ctx, '0 RPM', width - padRight + 6, padTop + plotH, colors.rpmLine, 'left');

  } else if (tab === 'torque_time') {
    const rawMinTorque = Math.min(...slicedData.map((d) => d.torque));
    const rawMaxTorque = Math.max(...slicedData.map((d) => d.torque));
    const minTorque = Math.min(0, Math.floor((rawMinTorque - 20) / 50) * 50);
    const maxTorque = Math.max(minTorque + 100, Math.ceil((rawMaxTorque + 20) / 50) * 50);

    if (minTorque < 0 && maxTorque > 0) {
      const zeroY = padTop + plotH - ((0 - minTorque) / (maxTorque - minTorque)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
      drawAxisLabel(ctx, '0 g', padLeft - 6, zeroY, colors.torqueLine, 'right');
    }

    drawLineSeries(ctx, slicedData, (d) => d.torque, minTorque, maxTorque, padLeft, padTop, plotW, plotH, colors.torqueLine);

    drawAxisLabel(ctx, `${maxTorque.toFixed(0)} g`, padLeft - 6, padTop, colors.torqueLine, 'right');
    drawAxisLabel(ctx, `${minTorque.toFixed(0)} g`, padLeft - 6, padTop + plotH, colors.torqueLine, 'right');

  } else if (tab === 'electrical_time') {
    const rawMinCurrent = Math.min(...slicedData.map((d) => d.current));
    const rawMaxCurrent = Math.max(...slicedData.map((d) => d.current));
    const minCurrent = Math.min(0, Math.floor(rawMinCurrent - 1));
    const maxCurrent = Math.max(minCurrent + 10, Math.ceil(rawMaxCurrent + 2));

    const rawMinVolts = Math.min(...slicedData.map((d) => d.voltage));
    const rawMaxVolts = Math.max(...slicedData.map((d) => d.voltage));
    const minVolts = Math.min(0, Math.floor(rawMinVolts - 1));
    const maxVolts = Math.max(minVolts + 18, Math.ceil(rawMaxVolts + 1));

    if (minCurrent < 0 && maxCurrent > 0) {
      const zeroY = padTop + plotH - ((0 - minCurrent) / (maxCurrent - minCurrent)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
      drawAxisLabel(ctx, '0 A', padLeft - 6, zeroY, colors.currentLine, 'right');
    }

    drawLineSeries(ctx, slicedData, (d) => d.current, minCurrent, maxCurrent, padLeft, padTop, plotW, plotH, colors.currentLine);
    drawLineSeries(ctx, slicedData, (d) => d.voltage, minVolts, maxVolts, padLeft, padTop, plotW, plotH, colors.voltageLine);

    drawAxisLabel(ctx, `${maxCurrent.toFixed(1)} A`, padLeft - 6, padTop, colors.currentLine, 'right');
    drawAxisLabel(ctx, `${minCurrent.toFixed(1)} A`, padLeft - 6, padTop + plotH, colors.currentLine, 'right');
    drawAxisLabel(ctx, `${maxVolts.toFixed(1)} V`, width - padRight + 6, padTop, colors.voltageLine, 'left');
    drawAxisLabel(ctx, `${minVolts.toFixed(1)} V`, width - padRight + 6, padTop + plotH, colors.voltageLine, 'left');

  } else if (tab === 'thrust_throttle') {
    const rawMinThrust = Math.min(...slicedData.map((d) => d.thrust));
    const rawMaxThrust = Math.max(...slicedData.map((d) => d.thrust));
    const minThrust = Math.min(0, Math.floor((rawMinThrust - 50) / 100) * 100);
    const maxThrust = Math.max(minThrust + 500, Math.ceil((rawMaxThrust + 50) / 100) * 100);

    if (minThrust < 0 && maxThrust > 0) {
      const zeroY = padTop + plotH - ((0 - minThrust) / (maxThrust - minThrust)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
      drawAxisLabel(ctx, '0 g', padLeft - 6, zeroY, colors.thrustLine, 'right');
    }

    ctx.fillStyle = colors.thrustLine;
    slicedData.forEach((d, i) => {
      const x = padLeft + (i / slicedData.length) * plotW;
      const norm = Math.max(0, Math.min(1, (d.thrust - minThrust) / (maxThrust - minThrust || 1)));
      const y = padTop + plotH - norm * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 6, padTop, colors.thrustLine, 'right');
    drawAxisLabel(ctx, `${minThrust.toFixed(0)} g`, padLeft - 6, padTop + plotH, colors.thrustLine, 'right');
  }
}

function drawZeroBaseline(ctx: CanvasRenderingContext2D, startX: number, y: number, endX: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(startX, y);
  ctx.lineTo(endX, y);
  ctx.stroke();
  ctx.restore();
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
  ctx.lineWidth = 2;
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
  ctx.font = '700 10px Lato, sans-serif';
  ctx.textAlign = align;
  ctx.fillText(text, x, y + 3);
}