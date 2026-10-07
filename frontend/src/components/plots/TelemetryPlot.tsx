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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufferRef = useRef<PlotSample[]>([]);
  const MAX_SAMPLES = 300; // 300 samples at 50Hz = 6 seconds of rolling history

  // Clear buffer when requested
  useEffect(() => {
    bufferRef.current = [];
  }, [clearTrigger]);

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
      if (canvas) {
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
    <div style={{ width: '100%', height: '100%', minHeight: '320px', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={800}
        height={360}
        style={{ width: '100%', height: '100%', borderRadius: '6px', backgroundColor: '#0b1120' }}
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

  // Margins
  const padLeft = 60;
  const padRight = 60;
  const padTop = 30;
  const padBottom = 40;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  // Grid background
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = padTop + (plotH / 5) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(width - padRight, y);
    ctx.stroke();
  }

  if (data.length < 2) {
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Awaiting live telemetry packets...', width / 2, height / 2);
    return;
  }

  if (tab === 'thrust_time') {
    // Left Y Axis: Thrust (0 to 3000g)
    // Right Y Axis: RPM (0 to 18000 RPM)
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    const maxRPM = Math.max(2000, ...data.map((d) => d.rpm));

    // Plot Thrust (Cyan)
    drawLineSeries(ctx, data, (d) => d.thrust, 0, maxThrust, padLeft, padTop, plotW, plotH, '#38bdf8', 'Thrust (g)');
    // Plot RPM (Yellow)
    drawLineSeries(ctx, data, (d) => d.rpm, 0, maxRPM, padLeft, padTop, plotW, plotH, '#facc15', 'RPM');

    // Axes Labels
    drawAxisLabel(ctx, `${maxThrust.toFixed(0)} g`, padLeft - 10, padTop, '#38bdf8', 'right');
    drawAxisLabel(ctx, '0 g', padLeft - 10, padTop + plotH, '#38bdf8', 'right');
    drawAxisLabel(ctx, `${maxRPM.toFixed(0)} RPM`, width - padRight + 10, padTop, '#facc15', 'left');
    drawAxisLabel(ctx, '0 RPM', width - padRight + 10, padTop + plotH, '#facc15', 'left');
  } else if (tab === 'electrical_time') {
    // Left Y: Current (0 to 60A), Right Y: Voltage (0 to 25V)
    const maxCurrent = Math.max(10, ...data.map((d) => d.current));
    const maxVolts = Math.max(18, ...data.map((d) => d.voltage));

    drawLineSeries(ctx, data, (d) => d.current, 0, maxCurrent, padLeft, padTop, plotW, plotH, '#ef4444', 'Current (A)');
    drawLineSeries(ctx, data, (d) => d.voltage, 0, maxVolts, padLeft, padTop, plotW, plotH, '#22c55e', 'Voltage (V)');

    drawAxisLabel(ctx, `${maxCurrent.toFixed(1)} A`, padLeft - 10, padTop, '#ef4444', 'right');
    drawAxisLabel(ctx, '0 A', padLeft - 10, padTop + plotH, '#ef4444', 'right');
    drawAxisLabel(ctx, `${maxVolts.toFixed(1)} V`, width - padRight + 10, padTop, '#22c55e', 'left');
    drawAxisLabel(ctx, '0 V', width - padRight + 10, padTop + plotH, '#22c55e', 'left');
  } else if (tab === 'thrust_throttle') {
    // Cross-plot
    ctx.fillStyle = '#64748b';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Thrust vs. Throttle Curve', width / 2, padTop - 10);
    // Draw cross points
    const maxThrust = Math.max(500, ...data.map((d) => d.thrust));
    ctx.fillStyle = '#38bdf8';
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
  color: string,
  legend: string
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
  ctx.font = '11px monospace';
  ctx.textAlign = align;
  ctx.fillText(text, x, y + 4);
}