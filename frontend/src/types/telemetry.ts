import { SequenceStatus } from './sequence';

export interface TelemetryPacket {
  uptime_ms: number;
  thrust_g: number;
  torque_g: number;
  ch3_g: number;
  ch4_g: number;
  voltage_v: number;
  current_a: number;
  power_w: number;
  rpm: number;
  flags: number;
  armed: boolean;
  estop: boolean;
  sequence?: SequenceStatus;
}

export interface SystemStatus {
  isConnected: boolean;
  transportMode: 'simulator' | 'serial' | 'ble' | 'disconnected';
}