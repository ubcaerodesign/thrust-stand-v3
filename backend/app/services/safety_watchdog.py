"""
AeroThrust V3 - Safety Watchdog & Tripwire Service
"""

import asyncio
from typing import Optional, Callable, Coroutine, Any
from app.core.config import (
    HEARTBEAT_INTERVAL_SEC, DEFAULT_MAX_CURRENT_AMPS,
    DEFAULT_MIN_VOLTAGE_4S
)
from app.core.protocol import CMD_HEARTBEAT, CMD_EMERGENCY_STOP, TelemetryData


class SafetyWatchdog:
    def __init__(
        self,
        send_cmd_fn: Callable[[int, int, int], Coroutine[Any, Any, bool]]
    ):
        self._send_cmd = send_cmd_fn
        self._is_running = False
        self._heartbeat_task: Optional[asyncio.Task] = None

        # Tripwire thresholds
        self.max_current = DEFAULT_MAX_CURRENT_AMPS
        self.min_voltage = DEFAULT_MIN_VOLTAGE_4S
        self.estop_triggered = False

    def start(self):
        self._is_running = True
        self.estop_triggered = False
        self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())

    async def stop(self):
        self._is_running = False
        if self._heartbeat_task:
            self._heartbeat_task.cancel()

    async def trigger_estop(self, reason: str = "Manual E-Stop"):
        """Instant Emergency Stop."""
        print(f"[SAFETY ACTION] Emergency Stop Triggered: {reason}")
        self.estop_triggered = True
        # Command 0x02 = CMD_EMERGENCY_STOP
        await self._send_cmd(CMD_EMERGENCY_STOP, 0, 0x01)

    async def verify_telemetry_safety(self, data: TelemetryData):
        """Tripwire verification on every received telemetry frame."""
        if self.estop_triggered:
            return

        # Over-Current Protection
        if data.current_a > self.max_current:
            await self.trigger_estop(f"Over-current threshold breached: {data.current_a:.2f}A > {self.max_current}A")

        # Voltage Sag Warning / Cutoff
        if data.armed and data.voltage_v < self.min_voltage:
            print(f"[SAFETY WARNING] Dangerous voltage sag detected: {data.voltage_v:.2f}V < {self.min_voltage}V")

    async def _heartbeat_loop(self):
        """Sends periodic 0xAA heartbeats to satisfy the stand's 250ms hardware watchdog."""
        while self._is_running:
            await asyncio.sleep(HEARTBEAT_INTERVAL_SEC)
            if not self.estop_triggered:
                await self._send_cmd(CMD_HEARTBEAT, 0, 0x01)