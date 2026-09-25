# 06 — Serial Communication Protocol

AeroThrust V3 replaces legacy ASCII string parsing (`lc1(120)\n`) with a packed, CRC-verified binary protocol operating at **115,200 baud** over USB or BLE UART.

---

## 1. Packet Framing: COBS & Integrity
* **COBS Encoding:** All packets are framed using **Consistent Overhead Byte Stuffing (COBS)**. This ensures that the delimiter byte `0x00` never appears inside the packet payload.
* **Packet Delimiter:** A single `0x00` byte denotes the **End-of-Packet (EOP)**.
* **Error Detection:** Every packet includes a 16-bit **CRC-16-CCITT** checksum calculated over all preceding bytes in the frame. Damaged packets caused by motor electrical noise are discarded.

---

## 2. Inbound Telemetry Packet (STM32 $\to$ Computer @ 50 Hz)
*Base Payload Size:* 22 bytes (prior to COBS encoding)

| Byte Offset | Field Name | Data Type | Units / Scale | Description |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `packet_id` | `uint8` | — | Constant identifier (`0x01`) |
| 1–4 | `timestamp_ms` | `uint32` | Milliseconds | Firmware uptime counter |
| 5–6 | `load_cell_1` | `int16` | Grams-force | Channel 1: Static Thrust / Normal Force |
| 7–8 | `load_cell_2` | `int16` | Grams-force | Channel 2: Motor Reaction Torque |
| 9–10 | `load_cell_3` | `int16` | Grams-force | Channel 3: Secondary Force / Wind Tunnel |
| 11–12 | `load_cell_4` | `int16` | Grams-force | Channel 4: Secondary Force / Wind Tunnel |
| 13–14 | `voltage_centi` | `uint16` | Centivolts ($10\text{ mV}$) | Bus Voltage ($2220 = 22.20\text{ V}$, up to 6S LiPo) |
| 15–16 | `current_centi` | `uint16` | Centiamps ($10\text{ mA}$) | Main Bus Current ($3450 = 34.50\text{ A}$) |
| 17–18 | `motor_rpm` | `uint16` | RPM | **D-Shot digital telemetry RPM** ($0\text{--}65{,}535\text{ RPM}$) |
| 19 | `status_flags` | `uint8` | Bitfield | System state flags (see bitfield definition below) |
| 20–21 | `crc16` | `uint16` | Checksum | CRC-16-CCITT across bytes 0–19 |

### Status Flags Bitfield (`status_flags`)
* **Bit 0:** `ARMED` (1 = Motor armed, 0 = Disarmed)
* **Bit 1:** `ESTOP_ACTIVE` (1 = Emergency stop engaged)
* **Bit 2:** `DSHOT_ENABLED` (1 = D-Shot mode active, 0 = Standard PWM mode)
* **Bit 3:** `SD_LOGGING` (1 = Onboard microSD blackbox writing OK)
* **Bit 4:** `TRANSPORT_BLE` (1 = Running via Bluetooth, 0 = Wired USB)
* **Bits 5–7:** *Reserved for future expansion*

---

## 3. Outbound Command Packet (Computer $\to$ STM32)
*Base Payload Size:* 7 bytes (prior to COBS encoding)

| Byte Offset | Field Name | Data Type | Value / Range | Description |
| :--- | :--- | :--- | :--- | :--- |
| 0 | `packet_id` | `uint8` | — | Constant identifier (`0x02`) |
| 1 | `command` | `uint8` | Enum | Command type identifier (see table below) |
| 2–3 | `value` | `uint16` | Variable | Throttle target, pulse width, or channel mask |
| 4 | `protocol_mode` | `uint8` | `0x00` or `0x01` | `0x00` = Standard Servo PWM, `0x01` = D-Shot |
| 5–6 | `crc16` | `uint16` | Checksum | CRC-16-CCITT across bytes 0–4 |

### Command Enumeration (`command`)
* **`0x01` — SET_THROTTLE:** Sets target throttle. If `protocol_mode == 0x00`, value is PWM in microseconds ($1000\text{--}2000\,\mu\text{s}$). If `protocol_mode == 0x01`, value is D-Shot value ($0\text{--}2047$).
* **`0x02` — EMERGENCY_STOP:** Instantly forces motor output to idle/off and detaches the drive pin.
* **`0x03` — TARE_CHANNELS:** Bitmask in `value` indicating which load cell channels to zero.
* **`0xAA` — WATCHDOG_HEARTBEAT:** Cyclic keep-alive ping emitted by the software every 100 ms. If the STM32 misses heartbeats for $>250\text{ ms}$, it immediately triggers a failsafe motor shutdown.