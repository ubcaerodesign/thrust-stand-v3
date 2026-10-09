"""
AeroThrust V3 - Server Launcher Script
"""

import sys
import uvicorn
from app.core.config import API_HOST, API_PORT
from app.main import app

if __name__ == "__main__":
    # In frozen binaries (PyInstaller), reload must be False
    is_frozen = getattr(sys, "frozen", False)
    uvicorn.run(app, host=API_HOST, port=API_PORT, reload=not is_frozen)