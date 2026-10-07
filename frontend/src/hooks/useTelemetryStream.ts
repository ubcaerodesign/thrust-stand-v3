import { useEffect, useRef, useState } from 'react';
import { TelemetryPacket } from '../types/telemetry';

const WS_URL = 'ws://127.0.0.1:8000/ws/telemetry';

export function useTelemetryStream() {
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [isHardwareStreaming, setIsHardwareStreaming] = useState<boolean>(false);
  const [isEstop, setIsEstop] = useState<boolean>(false);
  const [isArmed, setIsArmed] = useState<boolean>(false);

  // Mutable ref for high-frequency (50Hz) rendering without React re-renders
  const latestPacket = useRef<TelemetryPacket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const lastPacketTime = useRef<number>(0);
  const lastFlags = useRef<{ estop: boolean; armed: boolean }>({ estop: false, armed: false });

  useEffect(() => {
    let reconnectTimer: number;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setIsWsConnected(true);

      ws.onmessage = (event) => {
        try {
          const data: TelemetryPacket = JSON.parse(event.data);
          latestPacket.current = data;
          lastPacketTime.current = Date.now();

          // Latch discrete state updates only when status flags change
          if (data.estop !== lastFlags.current.estop) {
            lastFlags.current.estop = data.estop;
            setIsEstop(data.estop);
          }

          if (data.armed !== lastFlags.current.armed) {
            lastFlags.current.armed = data.armed;
            setIsArmed(data.armed);
          }
        } catch (err) {
          console.error('Failed to parse telemetry frame', err);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        setIsHardwareStreaming(false);
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    // Watchdog to verify if the hardware/simulator is actively streaming packets
    const streamWatchdog = window.setInterval(() => {
      const isStreaming = Date.now() - lastPacketTime.current < 800 && lastPacketTime.current > 0;
      setIsHardwareStreaming(isStreaming);
    }, 400);

    return () => {
      clearTimeout(reconnectTimer);
      clearInterval(streamWatchdog);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { isWsConnected, isHardwareStreaming, isEstop, isArmed, latestPacket };
}