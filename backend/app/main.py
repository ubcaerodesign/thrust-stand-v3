"""
AeroThrust V3 - FastAPI Main Application Entrypoint
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.services.storage_service import StorageService
from app.services.connection_manager import ConnectionManager
from app.routers import control, telemetry, session


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence
    print("[INIT] Starting AeroThrust V3 Backend Services...")
    storage = StorageService()
    await storage.start()

    connection_manager = ConnectionManager(storage)

    # Attach instances to app state for global access inside routers
    app.state.storage_service = storage
    app.state.connection_manager = connection_manager

    yield

    # Shutdown sequence
    print("[SHUTDOWN] Terminating AeroThrust V3 Backend Services...")
    await connection_manager.disconnect()
    await storage.stop()


app = FastAPI(
    title="AeroThrust V3 Backend",
    description="Asynchronous Telemetry & Control Engine for UBC AeroDesign Thrust Stand",
    version="3.0.0",
    lifespan=lifespan
)

# Allow requests from local frontend (Vite / React / Tauri)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register endpoints
app.include_router(control.router)
app.include_router(telemetry.router)
app.include_router(session.router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "AeroThrust-V3-Core"}