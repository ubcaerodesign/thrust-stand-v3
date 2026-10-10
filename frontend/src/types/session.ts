export type CompetitionClass = 'MCR' | 'ADV';
export type TransportMode = 'simulator' | 'serial' | 'legacy_serial';
export type ProtocolMode = 'dshot' | 'pwm';

export interface ConnectPayload {
  mode: TransportMode;
  port?: string;
  baudrate?: number;
}

export interface ThrottlePayload {
  throttle_pct: number;
  mode: ProtocolMode;
}

export interface TarePayload {
  mask: number; // 0x01 = Ch1, 0x02 = Ch2, 0x0F = All 4 channels
}

export interface StartSessionPayload {
  name: string;
  competition_class: CompetitionClass;
  motor_model: string;
  propeller_model: string;
  battery_config: string;
  notes?: string;
}

export interface SessionResponse {
  status: string;
  run_id: string;
  exported_csv?: string;
}