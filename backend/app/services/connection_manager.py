"""
AeroThrust V3 - Central Hardware Connection Manager
"""

import asyncio
from typing import Optional, Set
from fastapi import WebSocket
from app.hal.base import BaseTransport
from app.hal.tcp_transport import TcpTransport
from app.hal.serial_transport import SerialTransport
from app.core.config import SIMULATOR_HOST, SIMULATOR_PORT, DEFAULT_SERIAL_BAUD
from app.core.protocol import (
    pack_command, unpack_telemetry, TelemetryData,
    CMD_SET_THROTTLE, CMD_TARE_CHANNELS
)
from app.services.safety_watchdog import SafetyWatchdog
from app.services.storage_service import StorageService


class ConnectionManager:
    def __init__(self, storage: StorageService):
        self.storage = storage
        self.transport: Optional[BaseTransport] = None
        self.watchdog: Optional[SafetyWatchdog] = None

        self.latest_telemetry: Optional[TelemetryData] = None
        self.active_websockets: Set[WebSocket] = set()

        self._reader_task: Optional[asyncio.Task] = None
        self._is_running = False

    async def connect_simulator(self, host: str = SIMULATOR_HOST, port: int = SIMULATOR_PORT) -> bool:
        """Connects to the virtual simulator."""
        await self.disconnect()
        transport = TcpTransport(host, port)
        if await transport.connect():
            self.transport = transport
            self._start_services()
            print(f"[HAL] Connected to Virtual Stand at {host}:{port}")
            return True
        return False

    async def connect_serial(self, port: str, baud: int = DEFAULT_SERIAL_BAUD) -> bool:
        """Connects to a physical STM32 microcontroller via USB Serial."""
        await self.disconnect()
        transport = SerialTransport(port, baud)
        if await transport.connect():
            self.transport = transport
            self._start_services()
            print(f"[HAL] Connected to Serial Port {port} at {baud} baud")
            return True
        return False

    async def disconnect(self):
        """Disconnects current transport cleanly."""
        self._is_running = False
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
        self.watchdog = SafetyWatchdog(self.send_command)
        self.watchdog.start()
        self._reader_task = asyncio.create_task(self._read_telemetry_loop())

    async def send_command(self, cmd: int, value: int = 0, protocol_mode: int = 0x01) -> bool:
        """Encodes and sends an outbound command packet."""
        if not self.transport or not await self.transport.is_connected():
            return False
        packet = pack_command(cmd, value, protocol_mode)
        return await self.transport.write_packet(packet)

    async def set_throttle(self, percent: float, protocol_mode: int = 0x01) -> bool:
        """Sets target throttle (0.0% to 100.0%)."""
        if self.watchdog and self.watchdog.estop_triggered:
            print("[WARNING] Cannot set throttle: E-Stop is active.")
            return False

        clamped = max(0.0, min(100.0, percent))
        if protocol_mode == 0x01:
            # D-Shot Mode: 0 to 2047
            raw_val = int((clamped / 100.0) * 2047)
        else:
            # PWM Mode: 1000us to 2000us
            raw_val = int(1000 + (clamped / 100.0) * 1000)

        return await self.send_command(CMD_SET_THROTTLE, raw_val, protocol_mode)

    async def tare(self, channel_mask: int = 0x0F) -> bool:
        """Tares specified load cell channels (0x0F = all 4 channels)."""
        return await self.send_command(CMD_TARE_CHANNELS, channel_mask, 0x00)

    async def trigger_estop(self):
        """Triggers immediate E-Stop."""
        if self.watchdog:
            await self.watchdog.trigger_estop("User requested E-Stop")

    async def _read_telemetry_loop(self):
        """High-frequency background ingestion loop (50 Hz)."""
        while self._is_running and self.transport and await self.transport.is_connected():
            frame = await self.transport.read_frame()
            if frame:
                telemetry = unpack_telemetry(frame)
                if telemetry:
                    self.latest_telemetry = telemetry

                    # Run safety tripwire verification
                    if self.watchdog:
                        await self.watchdog.verify_telemetry_safety(telemetry)

                    # Buffer to SQLite if session is recording
                    await self.storage.record_sample(telemetry)

                    # Broadcast to WebSockets
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
            "estop": data.estop
        }

        # Broadcast concurrently; drop failed connections
        dead_sockets = []
        for ws in self.active_websockets:
            try:
                await ws.send_json(payload)
            except Exception:
                dead_sockets.append(ws)

        for dead in dead_sockets:
            self.unregister_websocket(dead)