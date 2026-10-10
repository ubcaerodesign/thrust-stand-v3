"""
AeroThrust V3 - Motor Control & Hardware Routing Endpoints
"""

import serial.tools.list_ports
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(prefix="/api/control", tags=["Control"])


class ConnectRequest(BaseModel):
    mode: str = Field(..., example="simulator", description="'simulator', 'serial', or 'legacy_serial'")
    port: str = Field("COM3", description="Serial port if mode is 'serial' or 'legacy_serial'")
    baudrate: int = Field(115200, description="Baud rate for serial")


class ThrottleRequest(BaseModel):
    throttle_pct: float = Field(..., ge=0.0, le=100.0, description="Throttle percentage (0-100%)")
    mode: str = Field("dshot", description="'dshot' or 'pwm'")


class TareRequest(BaseModel):
    mask: int = Field(0x0F, description="Channel bitmask (0x01=Ch1, 0x02=Ch2, 0x0F=All)")


@router.get("/ports")
async def list_serial_ports():
    ports = [p.device for p in serial.tools.list_ports.comports()]
    return {"ports": ports}


@router.post("/connect")
async def connect_hardware(req: ConnectRequest, request: Request):
    manager = request.app.state.connection_manager
    if req.mode == "simulator":
        success = await manager.connect_simulator()
    elif req.mode == "serial":
        success = await manager.connect_serial(req.port, req.baudrate)
    elif req.mode == "legacy_serial":
        baud = req.baudrate if req.baudrate != 115200 else 9600
        success = await manager.connect_legacy_serial(req.port, baud)
    else:
        raise HTTPException(status_code=400, detail="Invalid mode. Must be 'simulator', 'serial', or 'legacy_serial'")

    if not success:
        raise HTTPException(status_code=500, detail=f"Failed to connect to {req.mode}")
    return {"status": "connected", "mode": req.mode}


@router.post("/disconnect")
async def disconnect_hardware(request: Request):
    manager = request.app.state.connection_manager
    await manager.disconnect()
    return {"status": "disconnected"}


@router.post("/throttle")
async def set_throttle(req: ThrottleRequest, request: Request):
    manager = request.app.state.connection_manager
    protocol_mode = 0x01 if req.mode.lower() == "dshot" else 0x00
    success = await manager.set_throttle(req.throttle_pct, protocol_mode)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to command throttle. Is stand connected and E-Stop cleared?")
    return {"status": "ok", "throttle_pct": req.throttle_pct}


@router.post("/estop")
async def trigger_emergency_stop(request: Request):
    manager = request.app.state.connection_manager
    await manager.trigger_estop()
    return {"status": "emergency_stop_triggered"}


@router.post("/tare")
async def tare_load_cells(req: TareRequest, request: Request):
    manager = request.app.state.connection_manager
    success = await manager.tare(req.mask)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to command tare.")
    return {"status": "ok", "tared_mask": hex(req.mask)}