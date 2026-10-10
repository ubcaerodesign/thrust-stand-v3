"""
AeroThrust V3 - In-Process Virtual Stand Simulator Transport
Enables zero-setup offline simulation directly inside the backend.
"""

import time
import random
import struct
import asyncio
from typing import Optional
from app.hal.base import BaseTransport
from app.core.protocol import (
    PACKET_ID_TELEMETRY, PACKET_ID_COMMAND,
    CMD_SET_THROTTLE, CMD_EMERGENCY_STOP, CMD_TARE_CHANNELS, CMD_HEARTBEAT,
    FLAG_ARMED, FLAG_ESTOP_ACTIVE, FLAG_DSHOT_ENABLED, FLAG_SD_LOGGING,
    compute_crc16, cobs_decode
)


class VirtualThrustStand:
    def __init__(self):
        self.armed = False
        self.estop = False
        self.dshot_mode = True
        self.sd_logging = True
        self.tare_offsets = [0.0, 0.0, 0.0, 0.0]

        # Motor dynamics
        self.throttle_command_pct = 0.0
        self.current_throttle_pct = 0.0
        self.max_rpm = 16500.0

        # Battery model (4S LiPo: 16.8V max, internal resistance)
        self.battery_v_open_circuit = 16.8
        self.battery_internal_r = 0.028
        self.consumed_mah = 0.0

        # Safety & watchdog
        self.last_heartbeat_time = time.time()
        self.watchdog_timeout_sec = 0.250

        # Timing
        self.start_time = time.time()
        self.last_update_time = time.time()
        self.telemetry = {}
        self.update_physics()

    def update_physics(self):
        now = time.time()
        dt = now - self.last_update_time
        self.last_update_time = now

        # Watchdog verification
        if self.armed and (now - self.last_heartbeat_time > self.watchdog_timeout_sec):
            self.trigger_failsafe("Watchdog heartbeat timed out (>250ms).")

        # Motor inertia
        effective_target = self.throttle_command_pct if (self.armed and not self.estop) else 0.0
        alpha = min(1.0, dt * 10.0)
        self.current_throttle_pct += alpha * (effective_target - self.current_throttle_pct)

        # Aerodynamics
        rpm_ratio = self.current_throttle_pct / 100.0
        current_rpm = rpm_ratio * self.max_rpm
        if current_rpm > 50:
            current_rpm += random.gauss(0, 15)
        current_rpm = max(0.0, current_rpm)

        base_thrust = (rpm_ratio ** 2) * 2400.0
        thrust_noise = random.gauss(0, 3.0) if current_rpm > 100 else random.gauss(0, 0.4)
        raw_thrust = base_thrust + thrust_noise
        raw_torque = (rpm_ratio ** 2) * 180.0 + random.gauss(0, 0.8)

        raw_ch3 = random.gauss(0, 1.2)
        raw_ch4 = random.gauss(0, 1.2)

        # Electrical load
        base_current = 0.8 + (rpm_ratio ** 2.2) * 37.2 + random.gauss(0, 0.15)
        bus_current = max(0.0, base_current)
        self.consumed_mah += (bus_current * (dt / 3600.0)) * 1000.0

        # Voltage sag
        discharge_sag = (self.consumed_mah / 2200.0) * 1.5
        bus_voltage = self.battery_v_open_circuit - (bus_current * self.battery_internal_r) - discharge_sag
        bus_voltage = max(10.0, bus_voltage)

        self.telemetry = {
            "uptime_ms": int((now - self.start_time) * 1000) & 0xFFFFFFFF,
            "thrust_g": int(round(raw_thrust - self.tare_offsets[0])),
            "torque_g": int(round(raw_torque - self.tare_offsets[1])),
            "ch3_g": int(round(raw_ch3 - self.tare_offsets[2])),
            "ch4_g": int(round(raw_ch4 - self.tare_offsets[3])),
            "voltage_centi": int(round(bus_voltage * 100)),
            "current_centi": int(round(bus_current * 100)),
            "motor_rpm": int(round(current_rpm)),
            "flags": self._build_status_flags()
        }

    def _build_status_flags(self) -> int:
        flags = 0
        if self.armed:
            flags |= FLAG_ARMED
        if self.estop:
            flags |= FLAG_ESTOP_ACTIVE
        if self.dshot_mode:
            flags |= FLAG_DSHOT_ENABLED
        if self.sd_logging:
            flags |= FLAG_SD_LOGGING
        return flags

    def trigger_failsafe(self, reason: str):
        if not self.estop or self.armed:
            print(f"[SIMULATOR FAILSAFE] {reason}")
        self.armed = False
        self.estop = True
        self.throttle_command_pct = 0.0

    def handle_command(self, cmd_id: int, value: int, protocol_mode: int):
        self.last_heartbeat_time = time.time()
        if cmd_id == CMD_HEARTBEAT:
            pass
        elif cmd_id == CMD_SET_THROTTLE:
            if not self.estop:
                self.armed = True
                if protocol_mode == 0x01:
                    self.throttle_command_pct = max(0.0, min(100.0, (value / 2047.0) * 100.0))
                else:
                    clamped_pwm = max(1000, min(2000, value))
                    self.throttle_command_pct = ((clamped_pwm - 1000) / 1000.0) * 100.0
        elif cmd_id == CMD_EMERGENCY_STOP:
            self.trigger_failsafe("Manual E-Stop commanded")
        elif cmd_id == CMD_TARE_CHANNELS:
            if value & (1 << 0):
                self.tare_offsets[0] += self.telemetry["thrust_g"]
            if value & (1 << 1):
                self.tare_offsets[1] += self.telemetry["torque_g"]
            if value & (1 << 2):
                self.tare_offsets[2] += self.telemetry["ch3_g"]
            if value & (1 << 3):
                self.tare_offsets[3] += self.telemetry["ch4_g"]

    def get_raw_telemetry_bytes(self) -> bytes:
        payload = struct.pack(
            "<B I 4h 3H B",
            PACKET_ID_TELEMETRY,
            self.telemetry["uptime_ms"],
            self.telemetry["thrust_g"],
            self.telemetry["torque_g"],
            self.telemetry["ch3_g"],
            self.telemetry["ch4_g"],
            self.telemetry["voltage_centi"],
            self.telemetry["current_centi"],
            self.telemetry["motor_rpm"],
            self.telemetry["flags"]
        )
        crc = compute_crc16(payload)
        return payload + struct.pack("<H", crc)


class VirtualTransport(BaseTransport):
    def __init__(self):
        self.stand: Optional[VirtualThrustStand] = None
        self._connected = False
        self._last_telemetry_time = 0.0

    async def connect(self) -> bool:
        self.stand = VirtualThrustStand()
        self._connected = True
        self._last_telemetry_time = time.time()
        return True

    async def disconnect(self) -> None:
        self._connected = False
        self.stand = None

    async def is_connected(self) -> bool:
        return self._connected and self.stand is not None

    async def read_frame(self) -> Optional[bytes]:
        if not await self.is_connected() or not self.stand:
            return None

        self.stand.update_physics()
        now = time.time()
        if now - self._last_telemetry_time >= 0.020:
            self._last_telemetry_time = now
            return self.stand.get_raw_telemetry_bytes()

        await asyncio.sleep(0.005)
        return None

    async def write_packet(self, data: bytes) -> bool:
        if not await self.is_connected() or not self.stand:
            return False

        try:
            raw = data.rstrip(b"\x00")
            if not raw:
                return False
            decoded = cobs_decode(raw)
            if len(decoded) == 7:
                pkt_id, cmd, val, mode, rx_crc = struct.unpack("<B B H B H", decoded)
                if pkt_id == PACKET_ID_COMMAND and compute_crc16(decoded[:5]) == rx_crc:
                    self.stand.handle_command(cmd, val, mode)
                    return True
        except Exception:
            return False
        return False