# 04 — Modernized Software Architecture

AeroThrust V3 transitions from a monolithic desktop GUI to a decoupled, service-oriented architecture matching the ground software sub-team’s unification strategy.

---

## 1. System Architecture

```mermaid
flowchart TD
    classDef ui fill:#1e293b,stroke:#38bdf8,stroke-width:2px,color:#f8fafc;
    classDef backend fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
    classDef storage fill:#1e1e2e,stroke:#f59e0b,stroke-width:2px,color:#f8fafc;
    classDef hw fill:#14532d,stroke:#22c55e,stroke-width:2px,color:#f8fafc;

    subgraph UI_Layer ["Desktop Shell (React + TypeScript / Tauri)"]
        UI_View["Telemetry Dashboard<br/>• uPlot 60 FPS Canvas Plots<br/>• Throttle Sliders & Sequence Runner<br/>• E-Stop Hotkey (Spacebar)"]:::ui
    end

    subgraph Backend_Layer ["Core Engine (FastAPI / Python AsyncIO)"]
        WS_Server["WebSocket & REST Router"]:::backend
        Watchdog["Safety Watchdog Service"]:::backend
        Sequencer["Automated Test Sequencer"]:::backend
        SerialHAL["Async Serial Driver (115200 baud)"]:::backend
    end

    subgraph Storage_Layer ["Data Storage Engine"]
        SQLite[(SQLite Database with WAL)]:::storage
        Parquet[(Parquet Time-Series Files)]:::storage
        CSV[1-Click CSV Exporter]:::storage
    end

    subgraph Hardware_Layer ["Embedded Test Stand"]
        MCU["Arduino Leonardo"]:::hw
        Sensors["2x HX711 Load Cells + V/I Dividers"]:::hw
        Motor["ESC & Motor Assembly"]:::hw
    end

    UI_View <== "Local WebSocket (JSON Telemetry Stream)" ==> WS_Server
    WS_Server --> Watchdog
    WS_Server --> Sequencer
    Watchdog --> SerialHAL
    Sequencer --> SerialHAL
    
    SerialHAL <== "USB Serial (Framed Binary Packets)" ==> MCU
    MCU --> Sensors
    MCU --> Motor

    SerialHAL --> SQLite
    SQLite --> Parquet
    SQLite --> CSV
```

---

## 2. Key Architectural Decisions

1. **FastAPI Backend Core:**
   * Aligns directly with the DACSQY team's migration away from Redis to a lightweight FastAPI service.
   * Runs non-blocking asynchronous event loops (`asyncio`) to ensure incoming serial packets from the USB port never block or get delayed.
2. **Tauri + React/TypeScript UI:**
   * Modern, memory-safe desktop shell with a fraction of Electron’s footprint.
   * Enables building a shared library of ground-station UI components (gauges, serial connection bars, and charts) used by both AeroThrust and DACSQY.
3. **High-Performance Plotting (uPlot / Canvas):**
   * Replaces `pyqtgraph` with `uPlot`, rendering tens of thousands of data points at 60 FPS without memory leaks.
4. **Structured Storage (SQLite WAL / Parquet):**
   * Raw samples write directly to an embedded SQLite database using **Write-Ahead Logging (WAL)**. WAL allows rapid writes without locking the database file, completely eliminating the $O(N^2)$ memory copying bottleneck of Pandas `concat`.