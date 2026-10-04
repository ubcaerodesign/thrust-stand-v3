"""
AeroThrust V3 - Backend Configuration & Safety Limits
"""

from pathlib import Path

# Paths: Resolve 4 levels up from backend/app/core/config.py -> Project Root
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = BASE_DIR / "data"
EXPORTS_DIR = BASE_DIR / "exports"

# Ensure runtime directories exist at project root
DATA_DIR.mkdir(parents=True, exist_ok=True)
EXPORTS_DIR.mkdir(parents=True, exist_ok=True)

DATABASE_PATH = DATA_DIR / "aerothrust.db"

# Network & Server
API_HOST = "127.0.0.1"
API_PORT = 8000

# Hardware & Simulation Defaults
SIMULATOR_HOST = "127.0.0.1"
SIMULATOR_PORT = 8765
DEFAULT_SERIAL_BAUD = 115200

# Safety & Timing Parameters
HEARTBEAT_INTERVAL_SEC = 0.100       # Send keep-alive every 100ms
WATCHDOG_TIMEOUT_SEC = 0.250         # Stand triggers failsafe if no ping for 250ms
STORAGE_FLUSH_INTERVAL_SEC = 0.200   # Flush batched samples to SQLite every 200ms

# Default Safety Tripwires
DEFAULT_MAX_CURRENT_AMPS = 55.0      # Hard cutoff above 55A to protect ESC
DEFAULT_MIN_VOLTAGE_3S = 9.9         # 3.3V/cell cutoff for Micro Class 3S LiPo
DEFAULT_MIN_VOLTAGE_4S = 13.2        # 3.3V/cell cutoff for Advanced Class 4S LiPo
DEFAULT_MIN_VOLTAGE_6S = 19.8        # 3.3V/cell cutoff for 6S LiPo