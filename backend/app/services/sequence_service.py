"""
AeroThrust V3 - Automated Test Sequence Engine
Replaces legacy V2 Lark autoTest scripts with non-blocking async execution.
"""

import asyncio
import time
from dataclasses import dataclass
from typing import List, Optional, Dict, Any, Callable, Coroutine


@dataclass
class SequenceStep:
    throttle_pct: float
    dwell_sec: float


@dataclass
class SequencePreset:
    id: str
    name: str
    description: str
    steps: List[SequenceStep]

    @property
    def total_duration_sec(self) -> float:
        return sum(s.dwell_sec for s in self.steps)


class SequenceService:
    def __init__(self, set_throttle_fn: Callable[[float, int], Coroutine[Any, Any, bool]]):
        self._set_throttle = set_throttle_fn
        self._task: Optional[asyncio.Task] = None

        self.is_running = False
        self.preset_id: Optional[str] = None
        self.preset_name: Optional[str] = None
        self.current_step = 0
        self.total_steps = 0
        self.target_throttle_pct = 0.0
        self.dwell_remaining_sec = 0.0
        self.elapsed_sec = 0.0

        # Define built-in test recipes based on SAE competition needs
        self.presets: Dict[str, SequencePreset] = {
            "stepped_sweep_10_100": SequencePreset(
                id="stepped_sweep_10_100",
                name="Stepped Sweep (10% to 100%, 2s Dwell)",
                description="Increments throttle from 10% to 100% in 10% steps, dwelling 2 seconds per step.",
                steps=[
                    SequenceStep(throttle_pct=float(th), dwell_sec=2.0)
                    for th in range(10, 101, 10)
                ]
            ),
            "fine_sweep_5_100": SequencePreset(
                id="fine_sweep_5_100",
                name="Fine Sweep (5% to 100%, 1.5s Dwell)",
                description="High-resolution sweep from 5% to 100% in 5% increments, dwelling 1.5s per step.",
                steps=[
                    SequenceStep(throttle_pct=float(th), dwell_sec=1.5)
                    for th in range(5, 101, 5)
                ]
            ),
            "endurance_hold_70": SequencePreset(
                id="endurance_hold_70",
                name="Endurance Cruise Hold (70% for 60s)",
                description="Steps to 35% (3s), ramps to 70% cruise, and holds for 60 seconds to test thermal sag.",
                steps=[
                    SequenceStep(throttle_pct=35.0, dwell_sec=3.0),
                    SequenceStep(throttle_pct=70.0, dwell_sec=60.0),
                ]
            ),
            "quick_validation": SequencePreset(
                id="quick_validation",
                name="Quick Check (10%, 25%, 50% - 1s Dwell)",
                description="Rapid 3-point functional check to verify prop rotation and load cell polarity.",
                steps=[
                    SequenceStep(throttle_pct=10.0, dwell_sec=1.0),
                    SequenceStep(throttle_pct=25.0, dwell_sec=1.0),
                    SequenceStep(throttle_pct=50.0, dwell_sec=1.5),
                ]
            ),
        }

    def get_presets_metadata(self) -> List[Dict[str, Any]]:
        return [
            {
                "id": p.id,
                "name": p.name,
                "description": p.description,
                "total_duration_sec": p.total_duration_sec,
                "step_count": len(p.steps),
            }
            for p in self.presets.values()
        ]

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            "is_running": self.is_running,
            "preset_id": self.preset_id,
            "preset_name": self.preset_name,
            "current_step": self.current_step,
            "total_steps": self.total_steps,
            "target_throttle_pct": round(self.target_throttle_pct, 1),
            "dwell_remaining_sec": round(self.dwell_remaining_sec, 1),
            "elapsed_sec": round(self.elapsed_sec, 1),
        }

    async def start_sequence(self, preset_id: str, protocol_mode: int = 0x01) -> bool:
        if self.is_running:
            return False

        preset = self.presets.get(preset_id)
        if not preset:
            return False

        self.preset_id = preset.id
        self.preset_name = preset.name
        self.is_running = True
        self.current_step = 0
        self.total_steps = len(preset.steps)
        self.elapsed_sec = 0.0

        self._task = asyncio.create_task(self._run_sequence_loop(preset.steps, protocol_mode))
        return True

    async def abort_sequence(self, reason: str = "User Abort"):
        if not self.is_running:
            return

        print(f"[SEQUENCER] Sequence aborted: {reason}")
        self.is_running = False

        if self._task and not self._task.done():
            self._task.cancel()

        # Always force throttle to 0 on abort
        try:
            await self._set_throttle(0.0, 0x01)
        except Exception:
            pass

        self._reset_state()

    def _reset_state(self):
        self.is_running = False
        self.preset_id = None
        self.preset_name = None
        self.current_step = 0
        self.total_steps = 0
        self.target_throttle_pct = 0.0
        self.dwell_remaining_sec = 0.0
        self.elapsed_sec = 0.0

    async def _run_sequence_loop(self, steps: List[SequenceStep], protocol_mode: int):
        seq_start_time = time.time()
        try:
            for idx, step in enumerate(steps, start=1):
                if not self.is_running:
                    break

                self.current_step = idx
                self.target_throttle_pct = step.throttle_pct

                # Set hardware throttle
                success = await self._set_throttle(step.throttle_pct, protocol_mode)
                if not success:
                    await self.abort_sequence("Failed to communicate throttle to stand.")
                    return

                # Dwell at step, ticking in 50ms slices for responsive countdown
                step_start = time.time()
                while time.time() - step_start < step.dwell_sec:
                    if not self.is_running:
                        return
                    self.dwell_remaining_sec = max(0.0, step.dwell_sec - (time.time() - step_start))
                    self.elapsed_sec = time.time() - seq_start_time
                    await asyncio.sleep(0.05)

            # Sequence completed successfully: safely return throttle to idle
            await self._set_throttle(0.0, protocol_mode)
            print("[SEQUENCER] Sequence completed successfully.")
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"[SEQUENCER ERROR] {e}")
        finally:
            await self._set_throttle(0.0, protocol_mode)
            self._reset_state()