export interface SequencePreset {
  id: string;
  name: string;
  description: string;
  total_duration_sec: number;
  step_count: number;
}

export interface SequenceStatus {
  is_running: boolean;
  preset_id: string | null;
  preset_name: string | null;
  current_step: number;
  total_steps: number;
  target_throttle_pct: number;
  dwell_remaining_sec: number;
  elapsed_sec: number;
}