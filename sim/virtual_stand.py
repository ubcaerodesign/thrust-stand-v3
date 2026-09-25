"""

AeroThrust V3 - Virtual Hardware Simulator

Emulates the STM32-based thrust stand controller over a local TCP socket.
Simulates non-blocking COBS binary packet framing, CRC-16 verification, 
motor inertia, aerodynamic load scaling, voltage sag, and the 250ms watchdog.

"""

import socket
import struct
import time
import math
import random
import select
import sys

# Protocol constants
PACKET_ID_TELEMETRY = 0x01
PACKET_ID_COMMAND = 0x02

CMD_SET_THROTTLE = 0x01
CMD_EMERGENCY_STOP = 0x02
CMD_TARE_CHANNELS = 0x03
CMD_HEARTBEAT = 0xAA

STATUS_ARMED = 1 << 0
STATUS_ESTOP_ACTIVE = 1 << 1
STATUS_DSHOT_ENABLED = 1 << 2
STATUS_SD_LOGGING = 1 << 3
STATUS_TRANSPORT_BLE = 1 << 4

CRC16_POLYNOMIAL = 0x1021
CRC16_INITIAL = 0xFFFF


# Low-level protocol utils
def compute_crc16(data: bytes) -> int:
    crc = CRC16_INITIAL
    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ CRC16_POLYNOMIAL) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return crc


def cobs_encode(data: bytes) -> bytes:
    out = bytearray()
    code_idx = 0
    code = 1
    out.append(0)

    for byte in data:
        if byte == 0:
            out[code_idx] = code
            code_idx = len(out)
            out.append(0)
            code = 1
        else:
            out.append(byte)
            code += 1
            if code == 0xFF:
                out[code_idx] = code
                code_idx = len(out)
                out.append(0)
                code = 1

    out[code_idx] = code
    return bytes(out)


def cobs_decode(data: bytes) -> bytes:
    out = bytearray()
    idx = 0
    length = len(data)

    while idx < length:
        code = data[idx]
        if code == 0:
            raise ValueError("Zero byte encountered inside COBS block.")
        idx += 1
        for _ in range(code - 1):
            if idx >= length:
                raise ValueError("Incomplete COBS block (pointer out of bounds).")
            out.append(data[idx])
            idx += 1
        if code < 0xFF and idx < length:
            out.append(0)

    return bytes(out)


# Virtual physics & stand sim engine
class VirtualThrustStand:
    def __init__(self):
        self.armed = False
        self.estop = False
        self.dshot_mode = True
        self.sd_logging = True
        self.tare_offsets = [0.0, 0.0, 0.0, 0.0]

        self.throttle_command_pct = 0.0
        self.current_throttle_pct = 0.0
        self.max_rpm = 16500.0

        self.battery_v_open_circuit = 16.8
        self.battery_internal_r = 0.028
        self.consumed_mah = 0.0

        self.last_heartbeat_time = time.time()
        self.watchdog_timeout_sec = 0.250

        self.start_time = time.time()
        self.last_update_time = time.time()

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
            flags |= STATUS_ARMED
        if self.estop:
            flags |= STATUS_ESTOP_ACTIVE
        if self.dshot_mode:
            flags |= STATUS_DSHOT_ENABLED
        if self.sd_logging:
            flags |= STATUS_SD_LOGGING
        return flags

    def trigger_failsafe(self, reason: str):
        if not self.estop or self.armed:
            print(f"[FAILSAFE TRIGGERED] {reason}", flush=True)
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
                print(f"[CMD] Set Throttle: {self.throttle_command_pct:.1f}%", flush=True)

        elif cmd_id == CMD_EMERGENCY_STOP:
            self.trigger_failsafe("Manual E-Stop requested by host.")

        elif cmd_id == CMD_TARE_CHANNELS:
            if value & (1 << 0):
                self.tare_offsets[0] += self.telemetry["thrust_g"]
            if value & (1 << 1):
                self.tare_offsets[1] += self.telemetry["torque_g"]
            if value & (1 << 2):
                self.tare_offsets[2] += self.telemetry["ch3_g"]
            if value & (1 << 3):
                self.tare_offsets[3] += self.telemetry["ch4_g"]
            print(f"[CMD] Tared channels with mask 0x{value:02X}", flush=True)

    def serialize_telemetry_packet(self) -> bytes:
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
        packet_with_crc = payload + struct.pack("<H", crc)
        return cobs_encode(packet_with_crc) + b"\x00"


# Server socket loop
def run_simulator(host: str = "127.0.0.1", port: int = 8765):
    stand = VirtualThrustStand()
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    
    # Only set SO_REUSEADDR on non-Windows platforms to prevent silent port hijacking on Windows
    if sys.platform != "win32":
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)

    try:
        server.bind((host, port))
    except OSError as e:
        print(f"\n[FATAL ERROR] Could not bind to {host}:{port}.")
        print(f"Details: {e}")
        print("A zombie Python process is already using this port.")
        print("Run 'Get-Process python* | Stop-Process -Force' in PowerShell to clear it.\n")
        sys.exit(1)

    server.listen(1)
    # Set timeout on accept() so the loop wakes up to check for Ctrl+C on Windows
    server.settimeout(0.5)

    print("=" * 70, flush=True)
    print(f" AeroThrust V3 - Virtual Stand Hardware Simulator", flush=True)
    print(f" Listening on TCP Socket -> {host}:{port}", flush=True)
    print(f" Press Ctrl+C to terminate.", flush=True)
    print("=" * 70, flush=True)

    try:
        while True:
            print("\nWaiting for client connection from AeroThrust backend/GUI...", flush=True)
            conn = None
            while conn is None:
                try:
                    conn, addr = server.accept()
                except socket.timeout:
                    # Timeout periodically allows Python to handle Ctrl+C on Windows!
                    continue

            conn.setblocking(False)
            print(f"Connected to client: {addr}", flush=True)

            rx_buffer = bytearray()
            last_telemetry_time = time.time()
            stand.armed = False
            stand.estop = False
            stand.last_heartbeat_time = time.time()

            while True:
                readable, _, _ = select.select([conn], [], [], 0.005)
                if readable:
                    try:
                        chunk = conn.recv(256)
                        if not chunk:
                            if stand.armed and not stand.estop:
                                stand.trigger_failsafe("Connection severed while motor was ARMED!")
                            print("Client disconnected.", flush=True)
                            break
                        rx_buffer.extend(chunk)

                        while b"\x00" in rx_buffer:
                            delimiter_idx = rx_buffer.index(b"\x00")
                            frame = rx_buffer[:delimiter_idx]
                            del rx_buffer[:delimiter_idx + 1]

                            if len(frame) == 0:
                                continue

                            try:
                                decoded = cobs_decode(frame)
                                if len(decoded) == 7:
                                    packet_id, cmd, val, mode, rx_crc = struct.unpack("<B B H B H", decoded)
                                    calc_crc = compute_crc16(decoded[:5])
                                    if calc_crc == rx_crc and packet_id == PACKET_ID_COMMAND:
                                        stand.handle_command(cmd, val, mode)
                                    else:
                                        print("[ERROR] Corrupted command packet: CRC mismatch.", flush=True)
                            except ValueError as e:
                                print(f"[ERROR] COBS decode failed: {e}", flush=True)

                    except ConnectionResetError:
                        if stand.armed and not stand.estop:
                            stand.trigger_failsafe("Connection abruptly reset by client!")
                        print("Connection forcefully closed by client.", flush=True)
                        break

                stand.update_physics()

                now = time.time()
                if now - last_telemetry_time >= 0.020:
                    last_telemetry_time = now
                    packet = stand.serialize_telemetry_packet()
                    try:
                        conn.sendall(packet)
                    except (BrokenPipeError, ConnectionResetError):
                        if stand.armed and not stand.estop:
                            stand.trigger_failsafe("Broken pipe while writing telemetry!")
                        print("Client disconnected while writing telemetry.", flush=True)
                        break

    except KeyboardInterrupt:
        print("\nTerminating simulator server.", flush=True)
    finally:
        server.close()


if __name__ == "__main__":
    run_simulator()