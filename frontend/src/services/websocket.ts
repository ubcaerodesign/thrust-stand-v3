import { TelemetryPacket } from '../types/telemetry';

export type TelemetryCallback = (data: TelemetryPacket) => void;

export class TelemetrySocketClient {
  private url: string;
  private ws: WebSocket | null = null;
  private onDataCb: TelemetryCallback | null = null;

  constructor(url: string = 'ws://127.0.0.1:8000/ws/telemetry') {
    this.url = url;
  }

  public connect(onData: TelemetryCallback) {
    this.onDataCb = onData;
    this.ws = new WebSocket(this.url);

    this.ws.onmessage = (event) => {
      try {
        const parsed: TelemetryPacket = JSON.parse(event.data);
        if (this.onDataCb) this.onDataCb(parsed);
      } catch (e) {
        console.error('Telemetry packet parse failure:', e);
      }
    };
  }

  public disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}