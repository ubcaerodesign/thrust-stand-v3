import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ActivePlotTab, LayoutMode } from './PlotControls';
import { TelemetryPacket } from '../../types/telemetry';

interface TelemetryPlotProps {
  activeTab: ActivePlotTab;
  layoutMode: LayoutMode;
  theme: 'dark' | 'light';
  getLatestPacket: () => TelemetryPacket | null;
  clearTrigger: number;
  jumpToPresentTrigger?: number;
  onZoomStateChange?: (isZoomedOrPaused: boolean) => void;
}

interface PlotSample {
  seq: number;
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
  jumpToPresentTrigger = 0,
  onZoomStateChange,
}) => {
  const bufferRef = useRef<PlotSample[]>([]);
  const seqCounterRef = useRef<number>(0);
  const zoomedPanesRef = useRef<Set<string>>(new Set());
  const MAX_SAMPLES = 3000; // Expanded to 3,000 samples (1 full minute of 50Hz history)

  const handlePaneZoomChange = useCallback(
    (paneId: string, isZoomed: boolean) => {
      if (isZoomed) {
        zoomedPanesRef.current.add(paneId);
      } else {
        zoomedPanesRef.current.delete(paneId);
      }
      onZoomStateChange?.(zoomedPanesRef.current.size > 0);
    },
    [onZoomStateChange]
  );

  useEffect(() => {
    bufferRef.current = [];
  }, [clearTrigger]);

  useEffect(() => {
    let animId: number;

    const sampleLoop = () => {
      const pkt = getLatestPacket();
      if (pkt) {
        bufferRef.current.push({
          seq: seqCounterRef.current++,
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
        <CanvasPane
          paneId="single"
          tab={activeTab}
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
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
        <CanvasPane
          paneId="split-left"
          tab="thrust_time"
          title="Axial Thrust & RPM (Load Cell 1)"
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
        <CanvasPane
          paneId="split-right"
          tab={rightTab}
          title={rightTitle}
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
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
        <CanvasPane
          paneId="grid-thrust"
          tab="thrust_time"
          title="Axial Thrust & RPM (Load Cell 1)"
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '1 / 2', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane
          paneId="grid-torque"
          tab="torque_time"
          title="Reaction Torque (Load Cell 2)"
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
      </div>
      <div style={{ gridColumn: '1 / 2', gridRow: '2 / 3', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane
          paneId="grid-electrical"
          tab="electrical_time"
          title="Electrical (Voltage & Current)"
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
      </div>
      <div style={{ gridColumn: '2 / 3', gridRow: '2 / 3', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
        <CanvasPane
          paneId="grid-throttle"
          tab="thrust_throttle"
          title="Thrust vs. Throttle (%) Curve"
          theme={theme}
          bufferRef={bufferRef}
          clearTrigger={clearTrigger}
          jumpToPresentTrigger={jumpToPresentTrigger}
          onPaneZoomChange={handlePaneZoomChange}
        />
      </div>
    </div>
  );
};

interface CanvasPaneProps {
  paneId: string;
  tab: ActivePlotTab;
  title?: string;
  theme: 'dark' | 'light';
  bufferRef: React.MutableRefObject<PlotSample[]>;
  clearTrigger: number;
  jumpToPresentTrigger: number;
  onPaneZoomChange: (paneId: string, isZoomed: boolean) => void;
}

const CanvasPane: React.FC<CanvasPaneProps> = ({
  paneId,
  tab,
  title,
  theme,
  bufferRef,
  clearTrigger,
  jumpToPresentTrigger,
  onPaneZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // When true, the viewport continuously follows the live telemetry stream.
  // When false (after zooming or panning), the viewport locks to [frozenStartSeq, frozenEndSeq]
  // while bufferRef continues collecting incoming samples in the background.
  const isFollowingLive = useRef<boolean>(true);
  const frozenStartSeq = useRef<number>(0);
  const frozenEndSeq = useRef<number>(0);
  const isDragging = useRef<boolean>(false);
  const dragStartX = useRef<number>(0);

  const [isPannedOrZoomed, setIsPannedOrZoomed] = useState<boolean>(false);

  const updateZoomState = useCallback(
    (zoomed: boolean) => {
      setIsPannedOrZoomed(zoomed);
      onPaneZoomChange(paneId, zoomed);
    },
    [onPaneZoomChange, paneId]
  );

  const jumpToPresent = useCallback(() => {
    isFollowingLive.current = true;
    frozenStartSeq.current = 0;
    frozenEndSeq.current = 0;
    updateZoomState(false);
  }, [updateZoomState]);

  useEffect(() => {
    jumpToPresent();
  }, [clearTrigger, jumpToPresentTrigger, jumpToPresent]);

  useEffect(() => {
    return () => {
      onPaneZoomChange(paneId, false);
    };
  }, [onPaneZoomChange, paneId]);

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
      (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
    }
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - dragStartX.current;
      if (dx === 0) return;
      dragStartX.current = e.clientX;

      const data = bufferRef.current;
      if (data.length < 2) return;

      const firstSeq = data[0].seq;
      const lastSeq = data[data.length - 1].seq;
      if (lastSeq - firstSeq < 1) return;

      if (isFollowingLive.current) {
        frozenStartSeq.current = firstSeq;
        frozenEndSeq.current = lastSeq;
        isFollowingLive.current = false;
        updateZoomState(true);
      }

      const containerWidth = containerRef.current?.clientWidth || 100;
      const plotW = Math.max(10, containerWidth - 52 - 56);
      const span = frozenEndSeq.current - frozenStartSeq.current;
      const shift = (dx / plotW) * span;

      let newStart = frozenStartSeq.current - shift;
      let newEnd = newStart + span;

      if (newStart < firstSeq) {
        newStart = firstSeq;
        newEnd = Math.min(lastSeq, firstSeq + span);
      } else if (newEnd > lastSeq) {
        newEnd = lastSeq;
        newStart = Math.max(firstSeq, lastSeq - span);
      }

      frozenStartSeq.current = newStart;
      frozenEndSeq.current = newEnd;
    },
    [bufferRef, updateZoomState]
  );

  const handleMouseUp = (e: React.MouseEvent) => {
    isDragging.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  };

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const data = bufferRef.current;
      if (data.length < 2) return;

      const firstSeq = data[0].seq;
      const lastSeq = data[data.length - 1].seq;
      const fullSpan = lastSeq - firstSeq;
      if (fullSpan < 2) return;

      const rect = containerRef.current?.getBoundingClientRect();
      const padLeft = 52;
      const padRight = 56;
      const plotW = rect ? Math.max(10, rect.width - padLeft - padRight) : 100;
      const anchor = rect
        ? Math.max(0, Math.min(1, (e.clientX - rect.left - padLeft) / plotW))
        : 0.5;

      const zoomFactor = e.deltaY < 0 ? 0.85 : 1.15;

      let curStart = isFollowingLive.current ? firstSeq : Math.max(firstSeq, frozenStartSeq.current);
      let curEnd = isFollowingLive.current ? lastSeq : Math.min(lastSeq, frozenEndSeq.current);
      if (curEnd <= curStart) {
        curStart = firstSeq;
        curEnd = lastSeq;
      }

      const curSpan = curEnd - curStart;
      const newSpan = curSpan * zoomFactor;

      if (e.deltaY > 0 && newSpan >= fullSpan * 0.995) {
        jumpToPresent();
        return;
      }

      const minSpan = Math.min(fullSpan, 15);
      const clampedSpan = Math.max(minSpan, Math.min(fullSpan, newSpan));
      const anchorSeq = curStart + anchor * curSpan;
      let newStart = anchorSeq - anchor * clampedSpan;
      let newEnd = anchorSeq + (1 - anchor) * clampedSpan;

      if (newStart < firstSeq) {
        newEnd += firstSeq - newStart;
        newStart = firstSeq;
      }
      if (newEnd > lastSeq) {
        newStart -= newEnd - lastSeq;
        newEnd = lastSeq;
      }

      newStart = Math.max(firstSeq, newStart);
      newEnd = Math.min(lastSeq, newEnd);

      isFollowingLive.current = false;
      frozenStartSeq.current = newStart;
      frozenEndSeq.current = newEnd;
      updateZoomState(true);
    },
    [bufferRef, jumpToPresent, updateZoomState]
  );

  const handleDoubleClick = () => {
    jumpToPresent();
  };

  useEffect(() => {
    let animId: number;

    const drawLoop = () => {
      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const data = bufferRef.current;
          let displayData = data;

          if (!isFollowingLive.current && data.length >= 2) {
            const firstSeq = data[0].seq;
            const lastSeq = data[data.length - 1].seq;
            let sSeq = frozenStartSeq.current;
            let eSeq = frozenEndSeq.current;

            if (sSeq < firstSeq) {
              const shiftAmt = firstSeq - sSeq;
              sSeq = firstSeq;
              eSeq = Math.min(lastSeq, eSeq + shiftAmt);
              frozenStartSeq.current = sSeq;
              frozenEndSeq.current = eSeq;
            }
            if (eSeq > lastSeq) {
              eSeq = lastSeq;
              frozenEndSeq.current = eSeq;
            }

            const startIdx = Math.max(0, Math.floor(sSeq - firstSeq));
            const endIdx = Math.min(data.length - 1, Math.ceil(eSeq - firstSeq));
            if (endIdx > startIdx) {
              displayData = data.slice(startIdx, endIdx + 1);
            }
          }

          drawPlot(ctx, canvas.width, canvas.height, displayData, tab, theme, title);
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
        cursor: 'grab',
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
            jumpToPresent();
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
          title="Jump back to live present telemetry"
        >
          Jump to Present ↺
        </button>
      )}
    </div>
  );
};

function drawPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  slicedData: PlotSample[],
  tab: ActivePlotTab,
  theme: 'dark' | 'light',
  customTitle?: string
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
  const padRight = 56;
  const padTop = customTitle ? 20 : 14;
  const padBottom = 20;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);
  const gridIntervals = plotH < 90 ? 2 : 4;

  if (customTitle) {
    ctx.fillStyle = colors.textTitle;
    ctx.font = '700 11px "Titillium Web", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(customTitle, padLeft, 13);
  }

  // Grid background
  ctx.strokeStyle = colors.bgGrid;
  ctx.lineWidth = 1;
  for (let i = 0; i <= gridIntervals; i++) {
    const y = padTop + (plotH / gridIntervals) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  if (slicedData.length < 2) {
    ctx.fillStyle = colors.textPlaceholder;
    ctx.font = '700 12px Lato, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting live telemetry stream...', width / 2, height / 2);
    return;
  }

  if (tab === 'thrust_time') {
    const rawMinThrust = Math.min(...slicedData.map((d) => d.thrust));
    const rawMaxThrust = Math.max(...slicedData.map((d) => d.thrust));
    const minThrust = Math.min(0, Math.floor((rawMinThrust - 50) / 100) * 100);
    const maxThrust = Math.max(minThrust + 500, Math.ceil((rawMaxThrust + 50) / 100) * 100);
    const maxRPM = Math.max(2000, Math.ceil(Math.max(...slicedData.map((d) => d.rpm)) / 500) * 500);

    let zeroY: number | null = null;
    if (minThrust < 0 && maxThrust > 0) {
      zeroY = padTop + plotH - ((0 - minThrust) / (maxThrust - minThrust)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
    }

    drawLineSeries(ctx, slicedData, (d) => d.thrust, minThrust, maxThrust, padLeft, padTop, plotW, plotH, colors.thrustLine);
    drawLineSeries(ctx, slicedData, (d) => d.rpm, 0, maxRPM, padLeft, padTop, plotW, plotH, colors.rpmLine);

    drawAxisScale(ctx, minThrust, maxThrust, padLeft - 6, padTop, plotH, gridIntervals, 0, 'g', colors.thrustLine, 'right', zeroY);
    drawAxisScale(ctx, 0, maxRPM, width - padRight + 6, padTop, plotH, gridIntervals, 0, 'RPM', colors.rpmLine, 'left');

  } else if (tab === 'torque_time') {
    const rawMinTorque = Math.min(...slicedData.map((d) => d.torque));
    const rawMaxTorque = Math.max(...slicedData.map((d) => d.torque));
    const minTorque = Math.min(0, Math.floor((rawMinTorque - 20) / 50) * 50);
    const maxTorque = Math.max(minTorque + 100, Math.ceil((rawMaxTorque + 20) / 50) * 50);

    let zeroY: number | null = null;
    if (minTorque < 0 && maxTorque > 0) {
      zeroY = padTop + plotH - ((0 - minTorque) / (maxTorque - minTorque)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
    }

    drawLineSeries(ctx, slicedData, (d) => d.torque, minTorque, maxTorque, padLeft, padTop, plotW, plotH, colors.torqueLine);

    drawAxisScale(ctx, minTorque, maxTorque, padLeft - 6, padTop, plotH, gridIntervals, 0, 'g', colors.torqueLine, 'right', zeroY);

  } else if (tab === 'electrical_time') {
    const rawMinCurrent = Math.min(...slicedData.map((d) => d.current));
    const rawMaxCurrent = Math.max(...slicedData.map((d) => d.current));
    const minCurrent = Math.min(0, Math.floor(rawMinCurrent - 1));
    const maxCurrent = Math.max(minCurrent + 10, Math.ceil(rawMaxCurrent + 2));

    const rawMinVolts = Math.min(...slicedData.map((d) => d.voltage));
    const rawMaxVolts = Math.max(...slicedData.map((d) => d.voltage));
    const minVolts = Math.min(0, Math.floor(rawMinVolts - 1));
    const maxVolts = Math.max(minVolts + 18, Math.ceil(rawMaxVolts + 1));

    let zeroY: number | null = null;
    if (minCurrent < 0 && maxCurrent > 0) {
      zeroY = padTop + plotH - ((0 - minCurrent) / (maxCurrent - minCurrent)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
    }

    drawLineSeries(ctx, slicedData, (d) => d.current, minCurrent, maxCurrent, padLeft, padTop, plotW, plotH, colors.currentLine);
    drawLineSeries(ctx, slicedData, (d) => d.voltage, minVolts, maxVolts, padLeft, padTop, plotW, plotH, colors.voltageLine);

    drawAxisScale(ctx, minCurrent, maxCurrent, padLeft - 6, padTop, plotH, gridIntervals, 1, 'A', colors.currentLine, 'right', zeroY);
    drawAxisScale(ctx, minVolts, maxVolts, width - padRight + 6, padTop, plotH, gridIntervals, 1, 'V', colors.voltageLine, 'left');

  } else if (tab === 'thrust_throttle') {
    const rawMinThrust = Math.min(...slicedData.map((d) => d.thrust));
    const rawMaxThrust = Math.max(...slicedData.map((d) => d.thrust));
    const minThrust = Math.min(0, Math.floor((rawMinThrust - 50) / 100) * 100);
    const maxThrust = Math.max(minThrust + 500, Math.ceil((rawMaxThrust + 50) / 100) * 100);

    let zeroY: number | null = null;
    if (minThrust < 0 && maxThrust > 0) {
      zeroY = padTop + plotH - ((0 - minThrust) / (maxThrust - minThrust)) * plotH;
      drawZeroBaseline(ctx, padLeft, zeroY, width - padRight, colors.zeroBaseline);
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

    drawAxisScale(ctx, minThrust, maxThrust, padLeft - 6, padTop, plotH, gridIntervals, 0, 'g', colors.thrustLine, 'right', zeroY);
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

function drawAxisScale(
  ctx: CanvasRenderingContext2D,
  minVal: number,
  maxVal: number,
  x: number,
  padTop: number,
  plotH: number,
  gridIntervals: number,
  precision: number,
  unit: string,
  color: string,
  align: CanvasTextAlign,
  zeroY: number | null = null
) {
  const showZeroLabel =
    zeroY !== null &&
    Math.abs(zeroY - padTop) >= 12 &&
    Math.abs(zeroY - (padTop + plotH)) >= 12;

  for (let i = 0; i <= gridIntervals; i++) {
    const y = padTop + (plotH / gridIntervals) * i;
    if (i > 0 && i < gridIntervals && showZeroLabel && zeroY !== null && Math.abs(y - zeroY) < 12) {
      continue;
    }
    const val = maxVal - ((maxVal - minVal) / gridIntervals) * i;
    const displayVal = Math.abs(val) < 1e-9 ? 0 : val;
    drawAxisLabel(ctx, `${displayVal.toFixed(precision)} ${unit}`, x, y, color, align);
  }

  if (showZeroLabel && zeroY !== null) {
    drawAxisLabel(ctx, `${(0).toFixed(precision)} ${unit}`, x, zeroY, color, align);
  }
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