"""
AeroThrust V3 - Safety Watchdog & Dual-Threshold Current Limiter Service
Enforces soft scale-back and hard cutoff protections across V2 and V3 hardware.
"""

import asyncio
import time
from typing import Optional, Callable, Coroutine, Any, Dict
from app.core.config import (
    HEARTBEAT_INTERVAL_SEC, DEFAULT_MAX_CURRENT_AMPS,
    DEFAULT_SOFT_CURRENT_AMPS, SOFT_LIMIT_ENABLED_DEFAULT,
    CURRENT_SPIKE_TIME_HARD_SEC, CURRENT_SPIKE_TIME_SOFT_SEC,
    DEFAULT_MIN_VOLTAGE_4S
)
from app.core.protocol import CMD_HEARTBEAT, CMD_EMERGENCY_STOP, TelemetryData


class SafetyWatchdog:
    def __init__(
        self,
        send_cmd_fn: Callable[[int, int, int], Coroutine[Any, Any, bool]],
        scale_throttle_fn: Optional[Callable[[float, float], Coroutine[Any, Any, None]]] = None
    ):
        self._send_cmd = send_cmd_fn
        self._scale_throttle = scale_throttle_fn
        self._is_running = False
        self._heartbeat_task: Optional[asyncio.Task] = None

        # Tripwire and limiter thresholds
        self.hard_current_limit = DEFAULT_MAX_CURRENT_AMPS
        self.soft_current_limit = DEFAULT_SOFT_CURRENT_AMPS
        self.soft_limit_enabled = SOFT_LIMIT_ENABLED_DEFAULT
        self.min_voltage = DEFAULT_MIN_VOLTAGE_4S
        self.estop_triggered = False

        # Operational state for current limiting
        self.soft_limit_active = False
        self._soft_breach_start: Optional[float] = None
        self._hard_breach_start: Optional[float] = None
        self._last_scale_time = 0.0

    def start(self):
        self._is_running = True
        self.estop_triggered = False
        self.soft_limit_active = False
        self._soft_breach_start = None
        self._hard_breach_start = None
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def stop(self):
        self._is_running = False
        if self._heartbeat_task:
            self._heartbeat_task.cancel()

    def set_current_limits(self, soft_limit: float, hard_limit: float, enabled: bool):
        self.soft_current_limit = max(1.0, soft_limit)
        self.hard_current_limit = max(self.soft_current_limit + 1.0, hard_limit)
        self.soft_limit_enabled = enabled
        if not enabled:
            self.soft_limit_active = False
            self._soft_breach_start = None

    def get_current_limits(self) -> Dict[str, Any]:
        return {
            "soft_current_a": self.soft_current_limit,
            "hard_current_a": self.hard_current_limit,
            "soft_limit_enabled": self.soft_limit_enabled,
            "soft_limit_active": self.soft_limit_active
        }

    async def trigger_estop(self, reason: str = "Manual E-Stop"):
        """Instant Emergency Stop."""
        print(f"[SAFETY ACTION] Emergency Stop Triggered: {reason}")
        self.estop_triggered = True
        self.soft_limit_active = False
        # Command 0x02 = CMD_EMERGENCY_STOP
        await self._send_cmd(CMD_EMERGENCY_STOP, 0, 0x01)

    async def verify_telemetry_safety(self, data: TelemetryData):
        """Tripwire and dual-threshold current verification on every telemetry frame (50Hz)."""
        if self.estop_triggered:
            return

        now = time.time()


        # HARD OVER-CURRENT CUTOFF (With Spike Inrush Filter)
        # -------------------------------------------------------------
        # Immediate cut if current exceeds 140% of hard limit (locked rotor / short)
        if data.current_a >= self.hard_current_limit * 1.40:
            await self.trigger_estop(
                f"Catastrophic over-current: {data.current_a:.2f}A > 140% limit ({self.hard_current_limit * 1.40:.1f}A)"
            )
            return

        if data.current_a > self.hard_current_limit:
            if self._hard_breach_start is None:
                self._hard_breach_start = now
            elif now - self._hard_breach_start >= CURRENT_SPIKE_TIME_HARD_SEC:
                await self.trigger_estop(
                    f"Hard over-current limit breached for >{int(CURRENT_SPIKE_TIME_HARD_SEC * 1000)}ms: "
                    f"{data.current_a:.2f}A > {self.hard_current_limit:.1f}A"
                )
                return
        else:
            self._hard_breach_start = None


        # SOFT CURRENT LIMITER (Throttle Scale-Back)
        # -------------------------------------------------------------
        if self.soft_limit_enabled and data.armed and not self.estop_triggered:
            if data.current_a > self.soft_current_limit:
                if self._soft_breach_start is None:
                    self._soft_breach_start = now
                elif now - self._soft_breach_start >= CURRENT_SPIKE_TIME_SOFT_SEC:
                    self.soft_limit_active = True
                    if self._scale_throttle and (now - self._last_scale_time >= 0.100):
                        self._last_scale_time = now
                        await self._scale_throttle(data.current_a, self.soft_current_limit)
            else:
                # Hysteresis: clear soft limit flag if current drops 1.5A below threshold
                if self.soft_limit_active and data.current_a < (self.soft_current_limit - 1.5):
                    self.soft_limit_active = False
                    self._soft_breach_start = None
        else:
            self.soft_limit_active = False
            self._soft_breach_start = None


        # VOLTAGE SAG PROTECTION
        # -------------------------------------------------------------
        if data.armed and data.voltage_v < self.min_voltage:
            print(f"[SAFETY WARNING] Dangerous voltage sag detected: {data.voltage_v:.2f}V < {self.min_voltage}V")

    async def _heartbeat_loop(self):
        """Sends periodic 0xAA heartbeats to satisfy the stand's 250ms hardware watchdog."""
        while self._is_running:
            await asyncio.sleep(HEARTBEAT_INTERVAL_SEC)
            if not self.estop_triggered:
                await self._send_cmd(CMD_HEARTBEAT, 0, 0x01)