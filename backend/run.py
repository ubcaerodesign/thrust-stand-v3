"""
AeroThrust V3 - Server Launcher Script
"""

import multiprocessing
import os
import sys
from pathlib import Path
import uvicorn
from app.core.config import API_HOST, API_PORT
from app.main import app

# Explicit imports so PyInstaller bundles dynamic runtime modules used by Uvicorn & PySerial
try:
    import uvicorn.logging  # noqa: F401
    import uvicorn.loops.auto  # noqa: F401
    import uvicorn.loops.asyncio  # noqa: F401
    import uvicorn.protocols.http.auto  # noqa: F401
    import uvicorn.protocols.http.h11_impl  # noqa: F401
    import uvicorn.protocols.websockets.auto  # noqa: F401
    import uvicorn.protocols.websockets.websockets_impl  # noqa: F401
    import uvicorn.lifespan.on  # noqa: F401
    import serial.tools.list_ports  # noqa: F401
    import serial_asyncio  # noqa: F401
except ImportError:
    pass

if __name__ == "__main__":
    multiprocessing.freeze_support()
    is_frozen = getattr(sys, "frozen", False)
    if is_frozen:
        # Guard against missing stdio handles in frozen desktop launches
        if sys.stdout is None:
            sys.stdout = open(os.devnull, "w", encoding="utf-8")
        if sys.stderr is None:
            sys.stderr = open(os.devnull, "w", encoding="utf-8")

        # In frozen binaries (PyInstaller), reload is disabled and app is passed directly
        uvicorn.run(app, host=API_HOST, port=API_PORT, reload=False, use_colors=False)
    else:
        # Ensure the backend directory is in sys.path so the reloader worker can resolve the import string
        backend_dir = Path(__file__).resolve().parent
        if str(backend_dir) not in sys.path:
            sys.path.insert(0, str(backend_dir))

        # In development, uvicorn requires an import string for hot-reload to function
        uvicorn.run("app.main:app", host=API_HOST, port=API_PORT, reload=True)