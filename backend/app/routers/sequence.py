"""
AeroThrust V3 - Test Sequencer REST Router
"""

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/api/sequence", tags=["Sequencer"])


class StartSequenceRequest(BaseModel):
    preset_id: str = Field(..., example="stepped_sweep_10_100")
    mode: str = Field("dshot", description="'dshot' or 'pwm'")


@router.get("/presets")
async def get_presets(request: Request):
    seq_service = request.app.state.connection_manager.sequence_service
    return seq_service.get_presets_metadata()


@router.get("/status")
async def get_status(request: Request):
    seq_service = request.app.state.connection_manager.sequence_service
    return seq_service.get_status_dict()


@router.post("/start")
async def start_sequence(req: StartSequenceRequest, request: Request):
    manager = request.app.state.connection_manager
    if not manager.transport or not await manager.transport.is_connected():
        raise HTTPException(status_code=400, detail="Stand hardware is not connected.")

    if manager.watchdog and manager.watchdog.estop_triggered:
        raise HTTPException(status_code=400, detail="Cannot start sequence: Emergency Stop is engaged.")

    protocol_mode = 0x01 if req.mode.lower() == "dshot" else 0x00
    success = await manager.sequence_service.start_sequence(req.preset_id, protocol_mode)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to start sequence. A sequence may already be running.")

    return {"status": "sequence_started", "preset_id": req.preset_id}


@router.post("/abort")
async def abort_sequence(request: Request):
    seq_service = request.app.state.connection_manager.sequence_service
    await seq_service.abort_sequence("Operator triggered abort")
    return {"status": "sequence_aborted"}