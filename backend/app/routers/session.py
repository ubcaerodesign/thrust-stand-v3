"""
AeroThrust V3 - Test Session Management & Export Router
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter(prefix="/api/session", tags=["Session"])


class StartSessionRequest(BaseModel):
    name: str = Field(..., example="APC_10x4.7_Static_Ramp")
    competition_class: str = Field("MCR", example="MCR or ADV")
    motor_model: str = Field("Sunnysky 2216", example="Sunnysky 2216")
    propeller_model: str = Field("APC 10x4.7 Slow Flyer", example="APC 10x4.7")
    battery_config: str = Field("3S 1000mAh", example="3S 1000mAh")
    notes: Optional[str] = None


@router.post("/start")
async def start_session(req: StartSessionRequest, request: Request):
    storage = request.app.state.storage_service
    if storage.active_run_id:
        raise HTTPException(status_code=400, detail=f"Session {storage.active_run_id} is already active.")

    run_id = storage.start_session(req.model_dump())
    return {"status": "started", "run_id": run_id}


@router.post("/stop")
async def stop_session(request: Request):
    storage = request.app.state.storage_service
    run_id, csv_path = await storage.stop_session()
    if not run_id:
        raise HTTPException(status_code=400, detail="No active session to stop.")
    return {
        "status": "stopped",
        "run_id": run_id,
        "exported_csv": csv_path
    }


@router.get("/{run_id}/export")
async def export_session_csv(run_id: str, request: Request):
    storage = request.app.state.storage_service
    csv_path = storage.export_csv(run_id)
    if not csv_path:
        raise HTTPException(status_code=404, detail="Run ID not found.")

    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename=f"AeroThrust_Run_{run_id}.csv"
    )