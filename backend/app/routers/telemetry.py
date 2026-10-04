"""
AeroThrust V3 - Real-Time Telemetry WebSocket
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request

router = APIRouter(prefix="/ws", tags=["Telemetry"])


@router.websocket("/telemetry")
async def telemetry_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    manager = websocket.app.state.connection_manager
    await manager.register_websocket(websocket)
    try:
        while True:
            # Keep socket open and process any incoming ping/messages from UI
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.unregister_websocket(websocket)
    except Exception:
        manager.unregister_websocket(websocket)