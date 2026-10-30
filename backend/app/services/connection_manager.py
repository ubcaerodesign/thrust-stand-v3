"""
AeroThrust V3 - Central Hardware Connection Manager
Coordinates transports, safety watchdogs, throttle scale-back, and live telemetry streaming.
"""

import asyncio
from typing import Optional, Set
from fastapi import WebSocket
from app.hal.base import BaseTransport
from app.hal.tcp_transport import TcpTransport
from app.hal.serial_transport import SerialTransport
from app.hal.legacy_serial_transport import LegacySerialTransport
from app.hal.virtual_transport import VirtualTransport
from app.core.config import SIMULATOR_HOST, SIMULATOR_PORT, DEFAULT_SERIAL_BAUD
from app.core.protocol import (
    pack_command, unpack_telemetry, TelemetryData,
    CMD_SET_THROTTLE, CMD_TARE_CHANNELS
)
from app.services.safety_watchdog import SafetyWatchdog
from app.services.storage_service import StorageService
from app.services.sequence_service import SequenceService


class ConnectionManager:
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.transport: Optional[BaseTransport] = None
        self.watchdog: Optional[SafetyWatchdog] = None

        # Wire sequencer with throttle execution hook
        self.sequence_service = SequenceService(self.set_throttle_raw)

        self.latest_telemetry: Optional[TelemetryData] = None
        self.active_websockets: Set[WebSocket] = set()

        # Commanded throttle tracking & soft limit ceiling
        self.active_throttle_pct: float = 0.0
        self.active_protocol_mode: int = 0x01
        self.soft_limit_ceiling_pct: Optional[float] = None

        self._reader_task: Optional[asyncio.Task] = None
        self._is_running = False

    async def connect_simulator(self, host: str = SIMULATOR_HOST, port: int = SIMULATOR_PORT) -> bool:
        await self.disconnect()
        # Attempt external TCP simulator connection first
        tcp_transport = TcpTransport(host, port)
        if await tcp_transport.connect():
            self.transport = tcp_transport
            self._start_services()
            print(f"[HAL] Connected to External Virtual Stand at {host}:{port}")
            return True

        # Fallback to embedded in-process virtual stand simulator
        v_transport = VirtualTransport()
        if await v_transport.connect():
            self.transport = v_transport
            self._start_services()
            print("[HAL] Connected to Embedded Virtual Stand Simulator")
            return True

        return False

    async def connect_serial(self, port: str, baud: int = DEFAULT_SERIAL_BAUD) -> bool:
        await self.disconnect()
        transport = SerialTransport(port, baud)
        if await transport.connect():
            self.transport = transport
            self._start_services()
            print(f"[HAL] Connected to Serial Port {port} at {baud} baud")
            return True
        return False

    async def connect_legacy_serial(self, port: str, baud: int = 9600) -> bool:
        await self.disconnect()
        transport = LegacySerialTransport(port, baud)
        if await transport.connect():
            self.transport = transport
            self._start_services()
            print(f"[HAL] Connected to Legacy Serial Port {port} at {baud} baud")
            return True
        return False

    async def disconnect(self):
        self._is_running = False
        self.active_throttle_pct = 0.0
        self.soft_limit_ceiling_pct = None

        # Abort any active automated sequence
        if self.sequence_service.is_running:
            await self.sequence_service.abort_sequence("Hardware disconnected")

        if self.watchdog:
            await self.watchdog.stop()
            self.watchdog = None

        if self._reader_task:
            self._reader_task.cancel()
            self._reader_task = None

        if self.transport:
            await self.transport.disconnect()
            self.transport = None
            print("[HAL] Hardware disconnected.")

    def _start_services(self):
        self._is_running = True
        self.active_throttle_pct = 0.0
        self.soft_limit_ceiling_pct = None
        self.watchdog = SafetyWatchdog(self.send_command, self._handle_soft_scale_throttle)
        self.watchdog.start()
        self._reader_task = asyncio.create_task(self._read_telemetry_loop())

    async def send_command(self, cmd: int, value: int = 0, protocol_mode: int = 0x01) -> bool:
        if not self.transport or not await self.transport.is_connected():
            return False
        packet = pack_command(cmd, value, protocol_mode)
        return await self.transport.write_packet(packet)

    async def set_throttle_raw(self, percent: float, protocol_mode: int = 0x01) -> bool:
        """Internal throttle commander callable by sequencer and UI."""
        if self.watchdog and self.watchdog.estop_triggered:
            return False

        clamped = max(0.0, min(100.0, percent))

        # If soft-limit clamp is engaged, prevent overriding above the ceiling
        if self.watchdog and self.watchdog.soft_limit_active and self.soft_limit_ceiling_pct is not None:
            if clamped > self.soft_limit_ceiling_pct:
                clamped = self.soft_limit_ceiling_pct

        self.active_throttle_pct = clamped
        self.active_protocol_mode = protocol_mode

        # If user/sequencer voluntarily dropped below ceiling, update ceiling
        if self.soft_limit_ceiling_pct is not None and clamped < self.soft_limit_ceiling_pct:
            self.soft_limit_ceiling_pct = clamped

        if protocol_mode == 0x01:
            raw_val = int((clamped / 100.0) * 2047)
        else:
            raw_val = int(1000 + (clamped / 100.0) * 1000)

        return await self.send_command(CMD_SET_THROTTLE, raw_val, protocol_mode)

    async def set_throttle(self, percent: float, protocol_mode: int = 0x01) -> bool:
        """Manual throttle method. Rejects manual inputs if an automated sequence is active."""
        if self.sequence_service.is_running:
            print("[WARNING] Manual throttle command rejected: Automated sequence in progress.")
            return False
        return await self.set_throttle_raw(percent, protocol_mode)

    async def _handle_soft_scale_throttle(self, current_a: float, soft_limit_a: float):
        """Callback from SafetyWatchdog: smoothly steps back throttle when current cap is breached."""
        if self.active_throttle_pct <= 0.0:
            return

        # Calculate proportional reduction factor
        ratio = max(0.50, min(0.98, (soft_limit_a / current_a) * 0.98))
        target_pct = max(0.0, round(self.active_throttle_pct * ratio, 1))

        # Enforce minimum 1.0% drop per adjustment step
        if target_pct >= self.active_throttle_pct:
            target_pct = max(0.0, self.active_throttle_pct - 1.0)

        self.soft_limit_ceiling_pct = target_pct
        print(f"[CURRENT LIMITER] Soft limit breach ({current_a:.2f}A > {soft_limit_a:.1f}A). Scaling throttle {self.active_throttle_pct:.1f}% -> {target_pct:.1f}%")
        await self.set_throttle_raw(target_pct, self.active_protocol_mode)

    def set_current_limits(self, soft_limit: float, hard_limit: float, enabled: bool):
        if self.watchdog:
            self.watchdog.set_current_limits(soft_limit, hard_limit, enabled)

    def get_current_limits(self) -> dict:
        if self.watchdog:
            return self.watchdog.get_current_limits()
        from app.core.config import DEFAULT_SOFT_CURRENT_AMPS, DEFAULT_MAX_CURRENT_AMPS, SOFT_LIMIT_ENABLED_DEFAULT
        return {
            "soft_current_a": DEFAULT_SOFT_CURRENT_AMPS,
            "hard_current_a": DEFAULT_MAX_CURRENT_AMPS,
            "soft_limit_enabled": SOFT_LIMIT_ENABLED_DEFAULT,
            "soft_limit_active": False
        }

    async def tare(self, channel_mask: int = 0x0F) -> bool:
        return await self.send_command(CMD_TARE_CHANNELS, channel_mask, 0x00)

    async def trigger_estop(self):
        # Abort any running automated sequence immediately
        if self.sequence_service.is_running:
            await self.sequence_service.abort_sequence("Emergency Stop triggered")

        if self.watchdog:
            await self.watchdog.trigger_estop("User requested E-Stop")

    async def _read_telemetry_loop(self):
        while self._is_running and self.transport and await self.transport.is_connected():
            frame = await self.transport.read_frame()
            if frame:
                telemetry = unpack_telemetry(frame)
                if telemetry:
                    self.latest_telemetry = telemetry

                    # Run safety tripwire & current limiter verification
                    if self.watchdog:
                        await self.watchdog.verify_telemetry_safety(telemetry)
                        # If hard over-current fired E-Stop, abort running sequence
                        if self.watchdog.estop_triggered and self.sequence_service.is_running:
                            await self.sequence_service.abort_sequence("Safety tripwire engaged")

                    await self.storage.record_sample(telemetry)
                    await self._broadcast_telemetry(telemetry)
            else:
                await asyncio.sleep(0.001)

    async def register_websocket(self, ws: WebSocket):
        self.active_websockets.add(ws)

    def unregister_websocket(self, ws: WebSocket):
        self.active_websockets.discard(ws)

    async def _broadcast_telemetry(self, data: TelemetryData):
        if not self.active_websockets:
            return

        payload = {
            "uptime_ms": data.uptime_ms,
            "thrust_g": data.thrust_g,
            "torque_g": data.torque_g,
            "ch3_g": data.ch3_g,
            "ch4_g": data.ch4_g,
            "voltage_v": data.voltage_v,
            "current_a": data.current_a,
            "power_w": data.power_w,
            "rpm": data.rpm,
            "flags": data.flags,
            "armed": data.armed,
            "estop": data.estop,
            "dshot_enabled": data.dshot_enabled,
            "soft_limit_active": self.watchdog.soft_limit_active if self.watchdog else False,
            "soft_current_limit": self.watchdog.soft_current_limit if self.watchdog else 40.0,
            "hard_current_limit": self.watchdog.hard_current_limit if self.watchdog else 55.0,
            "sequence": self.sequence_service.get_status_dict()
        }

        dead_sockets = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_sockets.append(ws)

        for dead in dead_sockets:
            self.unregister_websocket(dead)