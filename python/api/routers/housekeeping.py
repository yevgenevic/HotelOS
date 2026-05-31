from fastapi import APIRouter, Depends, HTTPException

from api import state
from api.auth import require_roles
from db.models_db import User

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
    }


@router.post("/start", summary="Manually dispatch next cleaning job")
def start_cleaning(_: User = Depends(require_roles("housekeeper"))):
    if state.housekeeping is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    state.housekeeping.start_cleaning()
    return {"ok": True, "queue_size": state.housekeeping.queue_size}
