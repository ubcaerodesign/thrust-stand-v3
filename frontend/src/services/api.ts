import {
  ConnectPayload,
  ThrottlePayload,
  TarePayload,
  StartSessionPayload,
  SessionResponse,
} from '../types/session';
import { SequencePreset, SequenceStatus } from '../types/sequence';

const BASE_URL = 'http://127.0.0.1:8000';

async function postJson<T>(endpoint: string, body?: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || `HTTP Error ${response.status}`);
  }

  return response.json();
}

async function getJson<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }
  return response.json();
}

export const api = {
  connect: (payload: ConnectPayload) => postJson<{ status: string; mode: string }>('/api/control/connect', payload),
  disconnect: () => postJson<{ status: string }>('/api/control/disconnect'),
  setThrottle: (payload: ThrottlePayload) => postJson<{ status: string; throttle_pct: number }>('/api/control/throttle', payload),
  triggerEStop: () => postJson<{ status: string }>('/api/control/estop'),
  tare: (payload: TarePayload = { mask: 0x0f }) => postJson<{ status: string; tared_mask: string }>('/api/control/tare', payload),

  startSession: (payload: StartSessionPayload) => postJson<SessionResponse>('/api/session/start', payload),
  stopSession: () => postJson<SessionResponse>('/api/session/stop'),
  getExportUrl: (runId: string) => `${BASE_URL}/api/session/${runId}/export`,

  // Sequencer API
  getSequencePresets: () => getJson<SequencePreset[]>('/api/sequence/presets'),
  getSequenceStatus: () => getJson<SequenceStatus>('/api/sequence/status'),
  startSequence: (preset_id: string, mode: string = 'dshot') =>
    postJson<{ status: string; preset_id: string }>('/api/sequence/start', { preset_id, mode }),
  abortSequence: () => postJson<{ status: string }>('/api/sequence/abort'),
};