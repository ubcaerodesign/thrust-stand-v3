import { useEffect, useRef, useState } from 'react';
import { TelemetryPacket } from '../types/telemetry';

const WS_URL = 'ws://127.0.0.1:8000/ws/telemetry';

export function useTelemetryStream() {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // The Ring Buffer / Latest State Ref. 
  // Mutating this DOES NOT trigger React re-renders.
  const latestPacket = useRef<TelemetryPacket | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let reconnectTimer: number;

    const connect = () => {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      
      ws.onmessage = (event) => {
        try {
          // Parse JSON and silently update the memory reference
          const data: TelemetryPacket = JSON.parse(event.data);
          latestPacket.current = data;
        } catch (err) {
          console.error("Telemetry parsing error", err);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        // Attempt automatic reconnection every 2 seconds if backend drops
        reconnectTimer = window.setTimeout(connect, 2000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  return { isConnected, latestPacket };
}