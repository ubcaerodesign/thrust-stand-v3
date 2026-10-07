import React, { useEffect, useRef } from 'react';
import { ActivePlotTab } from './PlotControls';
import { TelemetryPacket } from '../../types/telemetry';

interface TelemetryPlotProps {
  activeTab: ActivePlotTab;
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

export const TelemetryPlot: React.FC<TelemetryPlotProps> = ({ activeTab, getLatestPacket, clearTrigger }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<PlotSample[]>([]);
  const MAX_SAMPLES = 300; // 6 seconds of rolling history at 50Hz

  useEffect(() => {
    bufferRef.current = [];
  }, [clearTrigger]);

  // Handle dynamic canvas resizing via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        canvas.width = Math.floor(width);
        canvas.height = Math.floor(height);
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let animId: number;

    const renderLoop = () => {
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

      const canvas = canvasRef.current;
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          drawPlot(ctx, canvas.width, canvas.height, bufferRef.current, activeTab);
        }
      }

      animId = requestAnimationFrame(renderLoop);
    };

    animId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animId);
  }, [getLatestPacket, activeTab]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: '260px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', borderRadius: '4px', backgroundColor: '#0a141f', display: 'block' }}
      />
    </div>
  );
};

function drawPlot(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: PlotSample[],
  tab: ActivePlotTab
) {
  ctx.clearRect(0, 0, width, height);

  const padLeft = 55;
  const padRight = 55;
  const padTop = 25;
  const padBottom = 30;
  const plotW = Math.max(10, width - padLeft - padRight);
  const plotH = Math.max(10, height - padTop - padBottom);

  // Background grid
  ctx.strokeStyle = 'rgba(201, 214, 234, 0.08)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padTop + (plotH / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  if (data.length < 2) {
    ctx.fillStyle = 'var(--brand-ice)';
    ctx.font = '12px var(--font-body)';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting hardware telemetry stream...', width / 2, height / 2);
    return;
  }

  if (tab === 'thrust_time') {
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    const maxRPM = Math.max(2000, ...data.map((d) => d.rpm));

    drawLineSeries(ctx, data, (d) => d.thrust, 0, maxThrust, padLeft, padTop, plotW, plotH, '#ECEB2A'); // Thrust in Brand Yellow
    drawLineSeries(ctx, data, (d) => d.rpm, 0, maxRPM, padLeft, padTop, plotW, plotH, '#38bdf8');     // RPM in Sky Blue

    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 8, padTop, '#ECEB2A', 'right');
    drawAxisLabel(ctx, '0 g', padLeft - 8, padTop + plotH, '#ECEB2A', 'right');
    drawAxisLabel(ctx, `${maxRPM.toFixed(0)} RPM`, width - padRight + 8, padTop, '#38bdf8', 'left');
    drawAxisLabel(ctx, '0 RPM', width - padRight + 8, padTop + plotH, '#38bdf8', 'left');
  } else if (tab === 'electrical_time') {
    const maxCurrent = Math.max(10, ...data.map((d) => d.current));
    const maxVolts = Math.max(18, ...data.map((d) => d.voltage));

    drawLineSeries(ctx, data, (d) => d.current, 0, maxCurrent, padLeft, padTop, plotW, plotH, '#ef4444');
    drawLineSeries(ctx, data, (d) => d.voltage, 0, maxVolts, padLeft, padTop, plotW, plotH, '#22c55e');

    drawAxisLabel(ctx, `${maxCurrent.toFixed(1)} A`, padLeft - 8, padTop, '#ef4444', 'right');
    drawAxisLabel(ctx, '0 A', padLeft - 8, padTop + plotH, '#ef4444', 'right');
    drawAxisLabel(ctx, `${maxVolts.toFixed(1)} V`, width - padRight + 8, padTop, '#22c55e', 'left');
    drawAxisLabel(ctx, '0 V', width - padRight + 8, padTop + plotH, '#22c55e', 'left');
  } else if (tab === 'thrust_throttle') {
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    ctx.fillStyle = '#ECEB2A';
    data.forEach((d, i) => {
      const x = padLeft + (i / data.length) * plotW;
      const y = padTop + plotH - (d.thrust / maxThrust) * plotH;
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
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
  ctx.font = '10px var(--font-body)';
  ctx.textAlign = align;
  ctx.fillText(text, x, y + 3);
}