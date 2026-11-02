# AeroThrust V3

Ground station software for the UBC AeroDesign electric propulsion test stand.

AeroThrust V3 replaces the old PyQt5 test stand app. It shows live thrust, current, and voltage data, runs automated throttle sweeps, lets you calibrate each of the 4 strain gauge channels, and saves every test to a local database that can be exported as a CSV file.

It is built with Tauri, React, TypeScript, and FastAPI.

---

## Download and Install (for Operators)

You do not need Python, Node, or Rust installed to run the app.

### 1. Download the installer

1. Go to the [Releases page](https://github.com/ubcaerodesign/thrust-stand-v3/releases).
2. Under the latest version, download the file for your computer:
   * **Windows:** `AeroThrust V3_1.0.x_x64-setup.exe`
   * **Mac:** `AeroThrust V3_1.0.x_aarch64.dmg`

### 2. Install on Windows

1. Double-click the `.exe` file you downloaded.
2. Windows may show a warning screen saying it "protected your PC" because the app is not from a well-known publisher. The app is safe, and you can get past this:
   1. Click **More info**.
   2. Click **Run anyway**.
3. Follow the installer steps, then open **AeroThrust V3** from the Start menu.

If your browser blocks the download itself (for example, "not commonly downloaded"), open the browser's downloads list, click the three dots next to the file, and choose **Keep**.

### 3. Install on Mac

1. Open the `.dmg` file and drag **AeroThrust V3** into your **Applications** folder.
2. Open Terminal (press `Cmd + Space`, type "Terminal", press Enter).
3. Paste this command and press Enter:

   ```bash
   xattr -cr "/Applications/AeroThrust V3.app"
   ```

   This removes the "downloaded from the internet" flag that makes macOS block the app. It will not print anything if it works.
4. Open **AeroThrust V3** from Applications.

If macOS still says the app can't be opened, go to **System Settings > Privacy & Security**, scroll down, and click **Open Anyway** next to the AeroThrust message.

---

## Running a Test

1. **Connect:** Choose **Virtual Simulator** to practice without hardware, or **Physical USB Serial** for the real test stand. Select your COM port and click **CONNECT**.
2. **Tare:** Make sure the motor is off, then click **TARE ALL**. To zero one load cell at a time, click **CHANNELS...** instead.
3. **Start logging:** Click **NEW TEST RUN**, enter your motor, propeller, and battery details, then click **Start Recording**.
4. **Run the motor** in one of two ways:
   * **Automated sweep:** Pick a recipe in the **Auto Test Sequence** bar (for example, *10% to 100% Stepped Sweep*) and click **RUN AUTOMATED SWEEP**.
   * **Manual control:** Check **ARM MOTOR**, then use the slider or the quick buttons (`+5%`, `25%`, `50%`).
5. **Finish:** Click **STOP & EXPORT**, then click **DOWNLOAD CSV** to save your data.

**Emergency stop:** Press **Spacebar** (or **Escape**) or click the red **E-STOP** button at any time. The motor goes to 0% throttle immediately.

---

## Safety Features

* **Watchdog:** If the USB connection drops or the app freezes for more than 250 ms, the stand controller cuts throttle to 0% on its own.
* **Over-current protection:** Motor output is cut if current goes above the safe limit for the ESC.
* **Low-voltage warning:** Warns you before the LiPo battery is drained far enough to be damaged.
* **Global E-Stop:** Spacebar and Escape work anywhere in the app.

---

## Development Setup (for Developers)

### What you need

* Python 3.10 or newer
* Node.js 18 or newer, with npm
* Rust toolchain ([rustup.rs](https://rustup.rs/))

### 1. Set up the environment

```bash
# Create and activate a Python virtual environment
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

### 2. Start the app

Open three terminals in the repository root and run one command in each:

* **Terminal 1, physics simulator:**
  ```bash
  python sim/virtual_stand.py
  ```
* **Terminal 2, backend:**
  ```bash
  python backend/run.py
  ```
* **Terminal 3, desktop app:**
  ```bash
  cd frontend
  npm run tauri dev
  ```

---

## Publishing a New Release

Pushing a version tag to GitHub starts an automated build (defined in `.github/workflows/release.yml`). It creates the Windows `.exe` and Mac `.dmg` installers and attaches them to a new GitHub Release.

```bash
git tag v1.0.x
git push origin v1.0.x
```

Watch progress in the **Actions** tab on GitHub.

---

## Project Structure

```text
thrust-stand-v3/
├── backend/            # FastAPI server, SQLite storage, binary serial protocol (COBS/CRC16)
│   ├── app/
│   │   ├── hal/        # Hardware layer (serial and simulator connections)
│   │   ├── routers/    # API endpoints: control, session, telemetry, sequences
│   │   └── services/   # Connection manager, safety watchdog, sequences, storage
│   └── run.py          # Backend entry point
│
├── frontend/           # Desktop app (Tauri) and user interface (React/TypeScript)
│   ├── src/
│   │   ├── components/ # Gauges, plots, throttle sliders, safety banners
│   │   ├── hooks/      # useTelemetryStream (50 Hz buffer), useKeyboardEStop
│   │   └── styles/     # theme.css (UBC AeroDesign 2023 branding)
│   └── src-tauri/      # Rust window settings and sidecar definitions
│
├── sim/                # Physics simulator (motor inertia, battery sag, noise)
│   ├── virtual_stand.py
│   └── test_client.py
│
├── docs/               # Architecture notes, legacy V2 audit, SAE 2027 rules
└── README.md
```
