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
    """
    Computes a 16-bit CRC-CCITT checksum over the provided byte sequence.
    Polynomial: 0x1021 (x^16 + x^12 + x^5 + 1), Initial: 0xFFFF.
    """
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
    """
    Encodes an arbitrary byte sequence using COBS.
    Guarantees that the delimiter byte (0x00) doesn't appear in the output.
    """
    out = bytearray()
    code_idx = 0
    code = 1
    out.append(0) # Reserve space for the first code pointer

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
    """
    Decodes a COBS-encoded byte sequence.
    Raises ValueError if the packet format is corrupted or contains illegal zeroes.
    """
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
        # Operational states
        self.armed = False
        self.estop = False
        self.dshot_mode = True
        self.sd_logging = True
        self.tare_offsets = [0.0, 0.0, 0.0, 0.0]

        # Motor dynamics
        self.throttle_command_pct = 0.0  # Operator demand: 0.0 to 100.0%
        self.current_throttle_pct = 0.0  # Physically realized throttle (inertia lag)
        self.max_rpm = 16500.0           # Nominal top RPM on 4S LiPo

        # Battery model (4S LiPo: 16.8V max, 0.025 Ohm internal resistance)
        self.battery_v_open_circuit = 16.8
        self.battery_internal_r = 0.028
        self.consumed_mah = 0.0

        # Safety & watchdog
        self.last_heartbeat_time = time.time()
        self.watchdog_timeout_sec = 0.250  # 250ms hardware fail-safe cutoff

        # Simulation clock
        self.start_time = time.time()
        self.last_update_time = time.time()

    def update_physics(self):
        """Advances physical based on elapsed time."""
        now = time.time()
        dt = now - self.last_update_time
        self.last_update_time = now

        # Watchdog verification
        if self.armed and (now - self.last_heartbeat_time > self.watchdog_timeout_sec):
            self.trigger_failsafe("Watchdog heartbeat times out (>250ms).")

        # Motor inertia
        # If E-stop is active or disarmed, target throttle is forced to 0
        effective_target = self.throttle_command_pct if (self.armed and not self.estop) else 0.0
        alpha = min(1.0, dt * 10.0)  # Motor spin-up response rate
        self.current_throttle_pct += alpha * (effective_target - self.current_throttle_pct)

        # Aerodynamic RPM, thrust, and torque calculations
        # Rotor speed tracks throttle with slight motor-settling variance
        rpm_ratio = self.current_throttle_pct / 100.0
        current_rpm = rpm_ratio * self.max_rpm
        if current_rpm > 50:
            current_rpm += random.gauss(0, 15)  # Electronic commutation jitter
        current_rpm = max(0.0, current_rpm)

        # Thrust: Quadratic scaling (T = k * RPM^2), max ~2,400 grams
        base_thrust = (rpm_ratio ** 2) * 2400.0
        thrust_noise = random.gauss(0, 3.0) if current_rpm > 100 else random.gauss(0, 0.4)
        raw_thrust = base_thrust + thrust_noise

        # Torque: Quadratic scaling, max ~180 g*cm reaction force
        raw_torque = (rpm_ratio ** 2) * 180.0 + random.gauss(0, 0.8)

        # Channels 3 & 4 (Simulated background ambient drift or Wind Tunnel sting balance)
        raw_ch3 = random.gauss(0, 1.2)
        raw_ch4 = random.gauss(0, 1.2)

        # Electrical load & battery discharge
        # Idle draw is ~0.8A; peak draw at full throttle reaches ~38.0A
        base_current = 0.8 + (rpm_ratio ** 2.2) * 37.2 + random.gauss(0, 0.15)
        bus_current = max(0.0, base_current)

        # Accumulate consumed capacity (mAh = Amperes * hours * 1000)
        self.consumed_mah += (bus_current * (dt / 3600.0)) * 1000.0

        # Voltage sag: Terminal Voltage = Voc - (I * R_int) - Discharge Loss
        discharge_sag = (self.consumed_mah / 2200.0) * 1.5  # Sags as battery empties
        bus_voltage = self.battery_v_open_circuit - (bus_current * self.battery_internal_r) - discharge_sag
        bus_voltage = max(10.0, bus_voltage)

        # Store outputs for packet serialization
        self.telemetry = {
            "uptime_ms": int((now - self.start_time) * 1000) & 0xFFFFFFFF,
            "thrust_g": int(round(raw_thrust - self.tare_offsets[0])),
            "torque_g": int(round(raw_torque - self.tare_offsets[1])),
            "ch3_g": int(round(raw_ch3 - self.tare_offsets[2])),
            "ch4_g": int(round(raw_ch4 - self.tare_offsets[3])),
            "voltage_centi": int(round(bus_voltage * 100)),   # Centivolts: 16.80V -> 1680
            "current_centi": int(round(bus_current * 100)),   # Centiamps:  15.42A -> 1542
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
        """Immediately engages the fail-safe emergency stop."""
        if not self.estop or self.armed:
            print(f"[FAILSAFE TRIGGERED] {reason}")
        self.armed = False
        self.estop = True
        self.throttle_command_pct = 0.0

    def handle_command(self, cmd_id: int, value: int, protocol_mode: int):
        """Executes incoming commands received from the host computer."""
        self.last_heartbeat_time = time.time()  # Reset watchdog on any valid command

        if cmd_id == CMD_HEARTBEAT:
            # Heartbeat keep-alive; timer reset handled above
            pass

        elif cmd_id == CMD_SET_THROTTLE:
            if not self.estop:
                self.armed = True
                if protocol_mode == 0x01:
                    # D-Shot mode: range is 0 to 2047 (0 to 100%)
                    self.throttle_command_pct = max(0.0, min(100.0, (value / 2047.0) * 100.0))
                else:
                    # Standard Servo PWM: range is 1000 to 2000 microseconds
                    clamped_pwm = max(1000, min(2000, value))
                    self.throttle_command_pct = ((clamped_pwm - 1000) / 1000.0) * 100.0
                print(f"[CMD] Set Throttle: {self.throttle_command_pct:.1f}%")

        elif cmd_id == CMD_EMERGENCY_STOP:
            self.trigger_failsafe("Manual E-Stop requested by host.")

        elif cmd_id == CMD_TARE_CHANNELS:
            # Value is treated as a bitmask for channels 1 to 4
            if value & (1 << 0):
                self.tare_offsets[0] += self.telemetry["thrust_g"]
            if value & (1 << 1):
                self.tare_offsets[1] += self.telemetry["torque_g"]
            if value & (1 << 2):
                self.tare_offsets[2] += self.telemetry["ch3_g"]
            if value & (1 << 3):
                self.tare_offsets[3] += self.telemetry["ch4_g"]
            print(f"[CMD] Tared channels with mask 0x{value:02X}")

    def serialize_telemetry_packet(self) -> bytes:
        """
        Packs the 22-byte telemetry structure (Little-Endian),
        computes CRC16, encodes with COBS, and appends the 0x00 delimiter.
        """
        # Pack unencoded payload (bytes 0 to 19 = 20 bytes)
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

        # Append CRC-16 (bytes 20 to 21 = 2 bytes) -> Total 22 bytes
        crc = compute_crc16(payload)
        packet_with_crc = payload + struct.pack("<H", crc)

        # Apply COBS framing and append 0x00 End-Of-Packet delimiter
        encoded_frame = cobs_encode(packet_with_crc) + b"\x00"
        return encoded_frame


# Server socket loop
def run_simulator(host: str = "127.0.0.1", port: int = 8765):
    stand = VirtualThrustStand()
    server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind((host, port))
    server.listen(1)

    print("=" * 70)
    print(f" AeroThrust V3 - Virtual Stand Hardware Simulator")
    print(f" Listening on TCP Socket -> {host}:{port}")
    print(f" Press Ctrl+C to terminate.")
    print("=" * 70)

    try:
        while True:
            print("\nWaiting for client connection from AeroThrust backend/GUI...")
            conn, addr = server.accept()
            conn.setblocking(False)
            print(f"Connected to client: {addr}")

            rx_buffer = bytearray()
            last_telemetry_time = time.time()
            stand.armed = False
            stand.estop = False
            stand.last_heartbeat_time = time.time()

            while True:
                # Service incoming sockets (non-blocking select)
                readable, _, _ = select.select([conn], [], [], 0.005)
                if readable:
                    try:
                        chunk = conn.recv(256)
                        if not chunk:
                            print("Client disconnected.")
                            break
                        rx_buffer.extend(chunk)

                        # Process complete COBS packets split by 0x00 delimiter
                        while b"\x00" in rx_buffer:
                            delimiter_idx = rx_buffer.index(b"\x00")
                            frame = rx_buffer[:delimiter_idx]
                            del rx_buffer[:delimiter_idx + 1]

                            if len(frame) == 0:
                                continue  # Ignore empty frames

                            try:
                                decoded = cobs_decode(frame)
                                # Validate minimum packet length: 1 ID + 1 CMD + 2 VAL + 1 MODE + 2 CRC = 7 bytes
                                if len(decoded) == 7:
                                    packet_id, cmd, val, mode, rx_crc = struct.unpack("<B B H B H", decoded)
                                    calc_crc = compute_crc16(decoded[:5])
                                    if calc_crc == rx_crc and packet_id == PACKET_ID_COMMAND:
                                        stand.handle_command(cmd, val, mode)
                                    else:
                                        print("[ERROR] Corrupted command packet: CRC mismatch.")
                            except ValueError as e:
                                print(f"[ERROR] COBS decode failed: {e}")

                    except ConnectionResetError:
                        print("Connection forcefully closed by client.")
                        break

                # Update physics at 100 Hz
                stand.update_physics()

                # Stream telemetry at 50 Hz (every 20ms)
                now = time.time()
                if now - last_telemetry_time >= 0.020:
                    last_telemetry_time = now
                    packet = stand.serialize_telemetry_packet()
                    try:
                        conn.sendall(packet)
                    except (BrokenPipeError, ConnectionResetError):
                        print("Client disconnected while writing telemetry.")
                        break

    except KeyboardInterrupt:
        print("\nTerminating simulator server.")
    finally:
        server.close()


if __name__ == "__main__":
    run_simulator()