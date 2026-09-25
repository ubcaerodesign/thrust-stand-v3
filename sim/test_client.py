"""

AeroThrust V3 - Virtual Stand Test Verification Client

Connects to the virtual stand over TCP, performs COBS decoding and CRC verification,
prints live telemetry, and sends cyclic heartbeats and sample throttle sweeps.

"""

import socket
import struct
import time
import sys

# Import encoder/decoder functions directly from simulator
from virtual_stand import (
    compute_crc16, cobs_encode, cobs_decode,
    PACKET_ID_COMMAND, CMD_SET_THROTTLE, CMD_HEARTBEAT, CMD_EMERGENCY_STOP
)

def send_command(sock: socket.socket, cmd: int, value: int = 0, mode: int = 0x01):
    """Encodes and transmits an outbound command packet."""
    payload = struct.pack("<B B H B", PACKET_ID_COMMAND, cmd, value, mode)
    crc = compute_crc16(payload)
    packet = cobs_encode(payload + struct.pack("<H", crc)) + b"\x00"
    sock.sendall(packet)


def main():
    host = "127.0.0.1"
    port = 8765

    print(f"Connecting to Virtual Stand at {host}:{port}...")
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.connect((host, port))
    except ConnectionRefusedError:
        print("[ERROR] Could not connect. Is 'python sim/virtual_stand.py' running in another terminal?")
        sys.exit(1)

    print("Connected successfully! Starting 5-second test routine.\n")
    print("Time(ms) | Thrust(g) | Torque(g) | Voltage(V) | Current(A) | Power(W) | RPM   | Flags")
    print("-" * 80)

    rx_buffer = bytearray()
    last_heartbeat = time.time()
    last_print = time.time()
    start_test = time.time()

    # Command initial 25% throttle in D-Shot mode (25% of 2047 ≈ 512)
    send_command(sock, CMD_SET_THROTTLE, value=512, mode=0x01)

    try:
        while True:
            # Send periodic heartbeat every 100ms
            now = time.time()
            if now - last_heartbeat >= 0.100:
                send_command(sock, CMD_HEARTBEAT)
                last_heartbeat = now

            # Throttle step at 3 seconds to 60% (60% of 2047 ≈ 1228)
            if 3.0 <= (now - start_test) < 3.05:
                send_command(sock, CMD_SET_THROTTLE, value=1228, mode=0x01)

            # Read incoming telemetry
            data = sock.recv(256)
            if not data:
                break
            rx_buffer.extend(data)

            while b"\x00" in rx_buffer:
                delimiter_idx = rx_buffer.index(b"\x00")
                frame = rx_buffer[:delimiter_idx]
                del rx_buffer[:delimiter_idx + 1]

                if len(frame) == 0:
                    continue

                decoded = cobs_decode(frame)
                if len(decoded) == 22:
                    # Unpack 22-byte telemetry packet
                    pkt_id, uptime, t1, t2, ch3, ch4, v_centi, i_centi, rpm, flags, crc = struct.unpack(
                        "<B I 4h 3H B H", decoded
                    )
                    calc_crc = compute_crc16(decoded[:20])

                    if calc_crc == crc:
                        voltage = v_centi / 100.0
                        current = i_centi / 100.0
                        power = voltage * current

                        # Print to console every 100ms to avoid flooding stdout
                        if now - last_print >= 0.100:
                            print(f"{uptime:8d} | {t1:9d} | {t2:9d} | {voltage:10.2f} | {current:10.2f} | {power:8.1f} | {rpm:5d} | 0x{flags:02X}")
                            last_print = now
                    else:
                        print("[ERROR] CRC mismatch on telemetry packet!")

    except KeyboardInterrupt:
        print("\nSending Emergency Stop before exit...")
        send_command(sock, CMD_EMERGENCY_STOP)
    finally:
        sock.close()
        print("Disconnected.")


if __name__ == "__main__":
    main()