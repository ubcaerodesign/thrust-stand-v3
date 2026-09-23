# 06 — Serial Communication Protocol

AeroThrust V3 replaces the legacy unverified ASCII string format (`lc1(120)\n`) with a framed, CRC-checked binary protocol operating at **115,200 baud**.

---

## 1. Packet Framing: COBS (Consistent Overhead Byte Stuffing)
* **Byte Stuffing:** Uses **COBS** encoding to guarantee that the byte `0x00` never appears within the body of a message.
* **Delimiter:** The byte `0x00` is used exclusively as an unambiguous **End-of-Packet (EOP)** delimiter.
* **Integrity:** Every packet terminates with a 16-bit **CRC-16-CCITT** checksum to detect bit corruption caused by electrical noise from the motor.

---

## 2. Packet Definitions

### A. Inbound Telemetry Packet (Arduino $\to$ Computer @ 50 Hz)
*Payload Size:* 20 bytes (prior to COBS framing)

| Byte Offset | Field Name | Data Type | Units / Scale | Description |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `packet_id` | `uint8` | — | Constant identifier (`0x01`) |
| 1–4 | `timestamp_ms`| `uint32` | Milliseconds | Firmware uptime timestamp |
| 5–6 | `thrust_raw` | `int16` | Grams-force | Calibrated net thrust reading |
| 7–8 | `torque_raw` | `int16` | Grams-force | Calibrated net torque reading |
| 9–10 | `voltage_raw` | `uint16`| Centivolts ($10\text{ mV}$) | Measured bus voltage ($1254 = 12.54\text{ V}$) |
| 11–12 | `current_raw` | `uint16`| Centiamps ($10\text{ mA}$) | Measured current ($2450 = 24.50\text{ A}$) |
| 13–14 | `rpm_raw` | `uint16`| RPM | Rotational speed (or 0 if unequipped) |
| 15 | `status_flags`| `uint8` | Bitfield | Bit 0: Armed, Bit 1: E-Stop active |
| 16–17 | `crc16` | `uint16` | Checksum | CRC-16-CCITT across bytes 0–15 |

---

### B. Outbound Command Packet (Computer $\to$ Arduino)
*Payload Size:* 6 bytes (prior to COBS framing)

| Byte Offset | Field Name | Data Type | Value / Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `packet_id` | `uint8` | — | Constant identifier (`0x02`) |
| 1 | `command` | `uint8` | Enum | `0x01`: Set Throttle, `0x02`: E-Stop, `0xAA`: Heartbeat |
| 2–3 | `value` | `uint16` | $1000\text{--}2000$ | Pulse width ($\mu\text{s}$) or parameter payload |
| 4–5 | `crc16` | `uint16` | Checksum | CRC-16-CCITT across bytes 0–3 |