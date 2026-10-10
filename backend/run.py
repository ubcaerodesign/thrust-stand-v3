"""
AeroThrust V3 - Server Launcher Script
"""

import sys
from pathlib import Path
import uvicorn
from app.core.config import API_HOST, API_PORT
from app.main import app

if __name__ == "__main__":
    is_frozen = getattr(sys, "frozen", False)
    if is_frozen:
        # In frozen binaries (PyInstaller), reload is disabled and app is passed directly
        uvicorn.run(app, host=API_HOST, port=API_PORT, reload=False)
    else:
        # Ensure the backend directory is in sys.path so the reloader worker can resolve the import string
        backend_dir = Path(__file__).resolve().parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))

        # In development, uvicorn requires an import string for hot-reload to function
        uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)