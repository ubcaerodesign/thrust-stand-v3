# AeroThrust V3

The new ground station software for **UBC AeroDesign's** electric propulsion test stand rig.

AeroThrust V3 replaces the legacy PyQt5 test stand with a 60 FPS, real-time desktop application built with **Tauri**, **React**, **TypeScript**, and **FastAPI**. It features non-blocking telemetry streaming, automated test sweeps, granular 4-channel strain gauge calibration, and local SQLite data logging with automatic CSV export.

---

## 🚀 For Operators: How to Download & Run

You do **not** need Python, Node, or Rust installed to run the app.

1. Go to the [**Releases**](https://github.com/ubcaerodesign/thrust-stand-v3/releases) page on this repository.
2. Under the latest version, download the installer for your computer:
   * **Windows:** Download `AeroThrust V3_1.0.x_x64-setup.exe`
   * **macOS:** Download `AeroThrust V3_1.0.x_aarch64.dmg`
3. Run the installer, launch **AeroThrust V3**, and you're ready to test!

---

## ⚡ Quick Start: Running a Test

1. **Connect:** Choose **Virtual Simulator** (for offline practice) or **Physical USB Serial** (for the real test stand), select your COM port, and click **CONNECT**.
2. **Tare:** Ensure the motor is off, then click **TARE ALL** (or click **⚙️ CHANNELS...** to zero individual load cells).
3. **Log Data:** Click **NEW TEST RUN**, enter your motor/propeller/battery specs, and click **Start Recording**.
4. **Run Motor:**
   * **Automated Sweep:** Pick a recipe in the **Auto Test Sequence** bar (e.g., *10% to 100% Stepped Sweep*) and click **▶ RUN AUTOMATED SWEEP**.
   * **Manual Control:** Check **ARM MOTOR** and use the slider or quick-step buttons (`+5%`, `25%`, `50%`).
5. **Stop & Export:** Click **STOP & EXPORT** when finished, then click **📥 DOWNLOAD CSV** to get your testing data.
6. **Emergency Stop:** Hit the **Spacebar** or click the red **E-STOP** button at any time to instantly cut the motor to 0% throttle.

---

## 🛠️ For Developers: Running in Development

If you are developing or maintaining the codebase:

### Prerequisites
* **Python 3.10+**
* **Node.js 18+** and **npm**
* **Rust Toolchain** ([rustup.rs](https://rustup.rs/))

### 1. Setup Environment
```bash
# Set up Python virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\Activate.ps1
# macOS/Linux:
source .venv/bin/activate

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Launch Local Dev Stack (3 Terminals)
Open three terminal windows from the repository root:

* **Terminal 1 (Physics Simulator):**
  ```bash
  python sim/virtual_stand.py
  ```
* **Terminal 2 (FastAPI Backend):**
  ```bash
  python backend/run.py
  ```
* **Terminal 3 (Tauri Desktop App):**
  ```bash
  cd frontend
  npm run tauri dev
  ```

---

## 📦 How to Build & Release New Versions

### Publish an Official GitHub Release (Cloud CI/CD)
Whenever you push a version tag to GitHub, the **GitHub Actions** pipeline (through `.github/workflows/release.yml`) automatically builds both Windows (`.exe`) and macOS (`.dmg`) installers and attaches them to a new GitHub Release:

```bash
git tag v1.0.x
git push origin v1.0.x
```
Check the **Actions** tab on GitHub to monitor the cloud build.

---

## 📂 Basic Project Structure

```text
thrust-stand-v3/
├── backend/            # FastAPI async daemon, SQLite WAL, COBS/CRC16 binary protocol
│   ├── app/
│   │   ├── hal/        # Hardware Abstraction Layer (Serial & TCP simulator)
│   │   ├── routers/    # Control, session, telemetry, and sequence endpoints
│   │   └── services/   # ConnectionManager, SafetyWatchdog, SequenceService, Storage
│   └── run.py          # Backend entrypoint
│
├── frontend/           # Tauri desktop container & React/TypeScript interface
│   ├── src/
│   │   ├── components/ # Gauges, plots, actuation sliders, safety banners
│   │   ├── hooks/      # useTelemetryStream (50Hz ref buffer), useKeyboardEStop
│   │   └── styles/     # theme.css (UBC AeroDesign 2023 Brand Identity)
│   └── src-tauri/      # Rust native window configuration & sidecar definitions
│
├── sim/                # Standalone physics simulator (motor inertia, battery sag, noise)
│   ├── virtual_stand.py
│   └── test_client.py
│
├── docs/               # Architecture specs, legacy V2 audit, and SAE 2027 rules
└── README.md
```

---

## 🛡️ Safety Highlights
* **Hardware Watchdog:** If USB communication drops or the app freezes for more than 250 ms, the stand controller cuts throttle to 0% automatically.
* **Over-Current Tripwire:** Cuts motor output if current exceeds safe ESC limits.
* **Low-Voltage Warning:** Alerts operators to prevent permanent LiPo battery damage.
* **Global E-Stop:** Hotkeyed to `Spacebar` and `Escape` globally across the application.
