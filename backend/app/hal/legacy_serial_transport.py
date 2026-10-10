"""
AeroThrust V3 - Legacy Serial Transport (For V2 Arduino Leonardo Hardware)
Communicates via ASCII over 9600-baud serial and adapts to unified TelemetryData.
"""

import asyncio
import re
import struct
import time
from typing import Optional
import serial_asyncio
from app.hal.base import BaseTransport
from app.core.protocol import (
    PACKET_ID_TELEMETRY, PACKET_ID_COMMAND,
    CMD_SET_THROTTLE, CMD_EMERGENCY_STOP, CMD_TARE_CHANNELS, CMD_HEARTBEAT,
    FLAG_ARMED, FLAG_ESTOP_ACTIVE,
    compute_crc16, cobs_decode
)


class LegacySerialTransport(BaseTransport):
    def __init__(self, port: str, baudrate: int = 9600):
        self.port = port
        self.baudrate = baudrate
        self.reader: Optional[asyncio.StreamReader] = None
        self.writer: Optional[asyncio.StreamWriter] = None
        self._rx_buffer = bytearray()

        # Operational states
        self.armed = False
        self.estop = False
        self.throttle_pct = 0.0

        # Raw hardware measurements
        self.raw_thrust = 0
        self.raw_torque = 0
        self.raw_voltage = 0.0
        self.raw_current = 0.0

        # Host-side software tare offsets (V2 firmware has no runtime tare command)
        self.tare_offsets = [0.0, 0.0, 0.0, 0.0]

        # Timing
        self._start_time = time.time()
        self._last_telemetry_time = 0.0

    async def connect(self) -> bool:
        try:
            self.reader, self.writer = await serial_asyncio.open_serial_connection(
                url=self.port, baudrate=self.baudrate
            )
            self._rx_buffer.clear()
            self._start_time = time.time()
            self._last_telemetry_time = time.time()
            self.armed = False
            self.estop = False
            self.throttle_pct = 0.0
            return True
        except Exception:
            self.reader = None
            self.writer = None
            return False

    async def disconnect(self) -> None:
        if self.writer:
            try:
                # Command throttle zero before closing
                self.writer.write(b"thr(0)\n")
                await self.writer.drain()
                self.writer.close()
                await self.writer.wait_closed()
            except Exception:
                pass
        self.reader = None
        self.writer = None
        self._rx_buffer.clear()
        self.armed = False

    async def is_connected(self) -> bool:
        return self.writer is not None and not self.writer.is_closing()

    async def read_frame(self) -> Optional[bytes]:
        if not await self.is_connected() or not self.reader:
            return None

        # Read available ASCII chunks and parse full lines
        try:
            chunk = await asyncio.wait_for(self.reader.read(256), timeout=0.02)
            if chunk:
                self._rx_buffer.extend(chunk)
                while b"\n" in self._rx_buffer:
                    newline_idx = self._rx_buffer.index(b"\n")
                    line_bytes = self._rx_buffer[:newline_idx]
                    del self._rx_buffer[:newline_idx + 1]
                    line_str = line_bytes.decode('utf-8', errors='replace').strip()
                    if line_str:
                        self._parse_line(line_str)
        except asyncio.TimeoutError:
            pass
        except Exception:
            await self.disconnect()
            return None

        # Generate synthesized telemetry packet at 50 Hz (20ms interval)
        now = time.time()
        if now - self._last_telemetry_time >= 0.020:
            self._last_telemetry_time = now
            return self._build_telemetry_frame()

        await asyncio.sleep(0.005)
        return None

    def _parse_line(self, line: str):
        """Parses ASCII telemetry lines emitted by the Arduino Leonardo sketch."""
        if line.startswith("lc1("):
            match = re.match(r"lc1\((n|-?\d+)\)", line)
            if match:
                val = match.group(1)
                if val != 'n':
                    self.raw_thrust = int(val)
        elif line.startswith("lc2("):
            match = re.match(r"lc2\((n|-?\d+)\)", line)
            if match:
                val = match.group(1)
                if val != 'n':
                    self.raw_torque = int(val)
        elif line.startswith("cur("):
            match = re.match(r"cur\(([-+]?[0-9]*\.?[0-9]+)\)", line)
            if match:
                self.raw_current = float(match.group(1))
        elif line.startswith("vtg("):
            match = re.match(r"vtg\(([-+]?[0-9]*\.?[0-9]+)\)", line)
            if match:
                self.raw_voltage = float(match.group(1))

    def _build_telemetry_frame(self) -> bytes:
        """Packs current state into a standard 22-byte unencoded binary frame with CRC16."""
        now = time.time()
        uptime_ms = int((now - self._start_time) * 1000) & 0xFFFFFFFF

        net_thrust = int(round(self.raw_thrust - self.tare_offsets[0]))
        net_torque = int(round(self.raw_torque - self.tare_offsets[1]))

        # Clamp int16 values
        t1 = max(-32768, min(32767, net_thrust))
        t2 = max(-32768, min(32767, net_torque))
        ch3 = 0
        ch4 = 0

        v_centi = int(round(max(0.0, self.raw_voltage) * 100)) & 0xFFFF
        i_centi = int(round(max(0.0, self.raw_current) * 100)) & 0xFFFF
        rpm = 0  # Legacy V2 hardware has no D-Shot RPM sensor

        flags = 0
        if self.armed and not self.estop:
            flags |= FLAG_ARMED
        if self.estop:
            flags |= FLAG_ESTOP_ACTIVE
        # D-Shot bit is omitted (0) to signal analog PWM mode to frontend

        payload = struct.pack(
            "<B I 4h 3H B",
            PACKET_ID_TELEMETRY,
            uptime_ms,
            t1, t2, ch3, ch4,
            v_centi, i_centi, rpm,
            flags
        )
        crc = compute_crc16(payload)
        return payload + struct.pack("<H", crc)

    async def write_packet(self, data: bytes) -> bool:
        if not await self.is_connected() or not self.writer:
            return False

        try:
            raw = data.rstrip(b"\x00")
            if not raw:
                return False
            decoded = cobs_decode(raw)
            if len(decoded) == 7:
                pkt_id, cmd, val, mode, rx_crc = struct.unpack("<B B H B H", decoded)
                if pkt_id == PACKET_ID_COMMAND and compute_crc16(decoded[:5]) == rx_crc:
                    return await self._handle_command(cmd, val, mode)
        except Exception:
            return False
        return False

    async def _handle_command(self, cmd_id: int, value: int, protocol_mode: int) -> bool:
        if cmd_id == CMD_HEARTBEAT:
            # Legacy Arduino does not use hardware watchdog heartbeats; acknowledge silently
            return True

        elif cmd_id == CMD_SET_THROTTLE:
            if self.estop:
                return False

            if protocol_mode == 0x01:
                # D-Shot target scaled 0..2047 -> 0..100%
                pct = max(0.0, min(100.0, (value / 2047.0) * 100.0))
            else:
                # Standard PWM scaled 1000..2000us -> 0..100%
                clamped_pwm = max(1000, min(2000, value))
                pct = ((clamped_pwm - 1000) / 1000.0) * 100.0

            throttle_int = int(round(pct))
            self.throttle_pct = float(throttle_int)
            self.armed = throttle_int > 0

            return await self._send_ascii(f"thr({throttle_int})\n")

        elif cmd_id == CMD_EMERGENCY_STOP:
            self.armed = False
            self.estop = True
            self.throttle_pct = 0.0
            await self._send_ascii("stp\n")
            return await self._send_ascii("thr(0)\n")

        elif cmd_id == CMD_TARE_CHANNELS:
            # Update host-side offsets based on bitmask
            if value & (1 << 0):
                self.tare_offsets[0] = float(self.raw_thrust)
            if value & (1 << 1):
                self.tare_offsets[1] = float(self.raw_torque)
            if value & (1 << 2):
                self.tare_offsets[2] = 0.0
            if value & (1 << 3):
                self.tare_offsets[3] = 0.0
            return True

        return False

    async def _send_ascii(self, msg: str) -> bool:
        if not self.writer:
            return False
        try:
            self.writer.write(msg.encode('utf-8'))
            await self.writer.drain()
            return True
        except Exception:
            await self.disconnect()
            return False