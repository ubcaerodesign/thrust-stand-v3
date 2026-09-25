# 04 — System Architecture & Implementation

AeroThrust V3 uses a decoupled, event-driven desktop architecture designed for high-rate telemetry, safety watchdogs, and future ground station unification.

---

## 1. Architecture Flowchart

```mermaid
flowchart TD
    classDef ui fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef backend fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#1e1e2e,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
    classDef hw fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#f8fafc;

    subgraph UI_Layer ["DESKTOP FRONTEND (Tauri / React + TypeScript)"]
        UI_Dash["Dashboard View<br/>• Mode: Thrust Stand vs. Wind Tunnel<br/>• uPlot 60 FPS Canvas Plots<br/>• RPM Gauge & Throttle Sequencer<br/>• Global E-Stop Hotkey (Spacebar)"]:::ui
        UI_Comm["Transport Selector<br/>(USB Serial COM vs. Bluetooth LE)"]:::ui
    end

    subgraph Backend_Layer ["LOCAL BACKEND DAEMON (FastAPI / Python AsyncIO)"]
        WS_Router["WebSocket & REST Event Dispatcher"]:::backend
        Watchdog["Safety Watchdog Service (250ms Heartbeat)"]:::backend
        Seq_Engine["Automated Sweep & Test Sequencer"]:::backend
        HAL_Serial["Async Serial Transport (115200 baud)"]:::backend
        HAL_BLE["BLE Transport Manager (Bleak Client)"]:::backend
    end

    subgraph Storage_Layer ["OFFLINE LOCAL STORAGE (Laptop Hard Drive)"]
        SQLite[(SQLite DB with WAL Mode)]:::storage
        Parquet[(Parquet Time-Series Cache)]:::storage
        CSV_Export[1-Click CSV Exporter]:::storage
    end

    subgraph HW_Layer ["TEST STAND HARDWARE (STM32 Controller)"]
        STM["STM32 Microcontroller (32-bit Arm)"]:::hw
        BLE_Mod["External BLE Module (UART Bridge)"]:::hw
        SD_Card["Onboard MicroSD Card (Blackbox Log)"]:::hw
        ESC["D-Shot ESC + Brushless Motor"]:::hw
        Sensors["4x Load Cell Channels<br/>Voltage & Current Sensors"]:::hw
    end

    UI_Dash <== "Local WebSocket (JSON Telemetry Stream)" ==> WS_Router
    UI_Comm --> WS_Router

    WS_Router --> Watchdog
    WS_Router --> Seq_Engine

    Watchdog --> HAL_Serial
    Watchdog --> HAL_BLE
    Seq_Engine --> HAL_Serial
    Seq_Engine --> HAL_BLE

    HAL_Serial <== "USB Serial (COBS Framed Binary)" ==> STM
    HAL_BLE <== "Wireless Bluetooth LE" ==> BLE_Mod
    BLE_Mod <--> STM

    STM <== "Bidirectional D-Shot (PWM + Telemetry)" ==> ESC
    Sensors --> STM
    STM --> SD_Card

    HAL_Serial --> SQLite
    HAL_BLE --> SQLite
    SQLite --> Parquet
    SQLite --> CSV_Export
```

---

## 2. Key Architecture Components

### A. Dual Hardware Abstraction Layer (HAL)
The backend abstracts the physical communication link behind an abstract transport interface:
* **USB Serial Driver:** Uses asynchronous non-blocking serial polling (`pyserial-asyncio`) at **115,200 baud**.
* **Bluetooth Low Energy (BLE) Driver:** Uses Python's asynchronous `bleak` library to connect to the external BLE UART service.
* Both transports feed identically framed binary packets into the parser, meaning the UI and database pipelines remain completely agnostic to whether the test is wired or wireless.

### B. High-Speed Local Storage Engine
* **Offline-First SQLite (WAL Mode):** Operates serverless on the local testing laptop. Write-Ahead Logging (WAL) allows $50\text{ Hz}$ telemetry ingestion without locking queries or causing UI micro-stutters.
* **Onboard SD Card Blackbox Synchronization:** The STM32 hardware logs raw data to an onboard microSD card. If a Bluetooth connection experiences wireless packet drops during a test, the desktop application provides a **"Sync SD Blackbox"** utility to backfill any missing data points into SQLite.
* **Analysis-Ready Exports:** Standardized exports to `.csv` and `.parquet` enable immediate handoff to the aerodynamics sub-team for report generation.

### C. Mode Switching: Thrust Stand vs. Wind Tunnel
The system supports two operating contexts selectable in the header:
* **Thrust Stand Mode:** Visualizes Channels 1 & 2 as Thrust and Torque, displays motor RPM, and exposes throttle control sliders.
* **Wind Tunnel Mode:** Disables motor throttle controls and visualizes all 4 load cell channels simultaneously (configured for Lift, Drag, Side Force, and Moments) with multi-channel taring.