from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from api import state
from api.auth import require_roles
from db.database import get_db
from db.models_db import User, RoomState

router = APIRouter()


@router.get("/queue", summary="Get cleaning queue status and housekeeper availability")
def get_queue(_: User = Depends(require_roles("housekeeper"))):
    if state.housekeeping is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    return {
        "queue_size": state.housekeeping.queue_size,
        "housekeepers": [
            {"name": h.name, "available": h.is_available()}
            for h in state.housekeeping.housekeepers
        ],
        "dirty_rooms": state.housekeeping.queue,
    }


@router.post("/start", summary="Manually dispatch next cleaning job")
def start_cleaning(_: User = Depends(require_roles("housekeeper"))):
    if state.housekeeping is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    state.housekeeping.start_cleaning()
    return {"ok": True, "queue_size": state.housekeeping.queue_size}


@router.post("/rooms/{room_number}/clean", summary="Manually mark a room as clean")
def clean_room(
    room_number: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("housekeeper")),
):
    if state.housekeeping is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    ok = state.housekeeping.clean_room(room_number)
    if not ok:
        raise HTTPException(404, f"Room {room_number} not found")

    row = db.query(RoomState).filter(RoomState.room_number == room_number).first()
    if row:
        row.status = "CLEAN"
        db.commit()

    return {"ok": True}
