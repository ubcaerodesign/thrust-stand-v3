"""
AeroThrust V3 - Binary Protocol, COBS Encoding, & CRC-16 Engine
Adheres to docs/06_serial_protocol.md
"""

import struct
from dataclasses import dataclass
from typing import Optional, Tuple

# Protocol Identifiers
PACKET_ID_TELEMETRY = 0x01
PACKET_ID_COMMAND = 0x02

# Command Enumerations
CMD_SET_THROTTLE = 0x01
CMD_EMERGENCY_STOP = 0x02
CMD_TARE_CHANNELS = 0x03
CMD_HEARTBEAT = 0xAA

# Status Flags Bitmask
FLAG_ARMED = 1 << 0
FLAG_ESTOP_ACTIVE = 1 << 1
FLAG_DSHOT_ENABLED = 1 << 2
FLAG_SD_LOGGING = 1 << 3
FLAG_TRANSPORT_BLE = 1 << 4

CRC16_POLYNOMIAL = 0x1021
CRC16_INITIAL = 0xFFFF


def compute_crc16(data: bytes) -> int:
    """
    Computes a 16-bit CRC-CCITT checksum over the provided bytes.
    Polynomial: 0x1021, Initial value: 0xFFFF.
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
    Encodes bytes using Consistent Overhead Byte Stuffing (COBS).
    Guarantees that 0x00 never appears in the encoded output.
    """
    out = bytearray()
    code_idx = 0
    code = 1
    out.append(0)  # Reserve leading code pointer

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
    Raises ValueError if the frame is malformed.
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
                raise ValueError("Incomplete COBS block pointer.")
            out.append(data[idx])
            idx += 1
        if code < 0xFF and idx < length:
            out.append(0)

    return bytes(out)


@dataclass
class TelemetryData:
    uptime_ms: int
    thrust_g: int
    torque_g: int
    ch3_g: int
    ch4_g: int
    voltage_v: float
    current_a: float
    power_w: float
    rpm: int
    flags: int
    armed: bool
    estop: bool
    dshot_enabled: bool
    sd_logging: bool


def unpack_telemetry(payload: bytes) -> Optional[TelemetryData]:
    """
    Parses a 22-byte unencoded telemetry frame, checks its CRC16,
    and returns a structured TelemetryData object.
    """
    if len(payload) != 22:
        return None

    # Unpack 20 bytes of payload + 2 bytes of trailing CRC
    pkt_id, uptime, t1, t2, ch3, ch4, v_centi, i_centi, rpm, flags, rx_crc = struct.unpack(
        "<B I 4h 3H B H", payload
    )

    if pkt_id != PACKET_ID_TELEMETRY:
        return None

    calc_crc = compute_crc16(payload[:20])
    if calc_crc != rx_crc:
        return None  # Discard corrupted packet

    voltage = v_centi / 100.0
    current = i_centi / 100.0
    power = round(voltage * current, 2)

    return TelemetryData(
        uptime_ms=uptime,
        thrust_g=t1,
        torque_g=t2,
        ch3_g=ch3,
        ch4_g=ch4,
        voltage_v=voltage,
        current_a=current,
        power_w=power,
        rpm=rpm,
        flags=flags,
        armed=bool(flags & FLAG_ARMED),
        estop=bool(flags & FLAG_ESTOP_ACTIVE),
        dshot_enabled=bool(flags & FLAG_DSHOT_ENABLED),
        sd_logging=bool(flags & FLAG_SD_LOGGING)
    )


def pack_command(cmd: int, value: int = 0, protocol_mode: int = 0x01) -> bytes:
    """
    Packs a 7-byte command payload, computes its CRC-16, encodes it with COBS,
    and appends the 0x00 delimiter byte. Ready for immediate transmission.
    """
    payload = struct.pack("<B B H B", PACKET_ID_COMMAND, cmd, value, protocol_mode)
    crc = compute_crc16(payload)
    framed = cobs_encode(payload + struct.pack("<H", crc)) + b"\x00"
    return framed