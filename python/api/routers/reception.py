from __future__ import annotations

import time
from dataclasses import asdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api import state
from api.auth import require_roles
from db.database import get_db
from db.models_db import GuestRecord, RoomState, User

router = APIRouter()


class CheckInRequest(BaseModel):
    guest_name: str
    room_type: str
    floor_preference: Optional[int] = None
    proximity_preference: Optional[str] = None


class CheckOutRequest(BaseModel):
    discount_pct: float = 0.0


@router.post("/checkin", summary="Check in a guest")
def check_in(
    body: CheckInRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("receptionist")),
):
    if state.reception is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    result = state.reception.check_in(
        body.guest_name,
        body.room_type,
        body.floor_preference,
        body.proximity_preference,
    )
    if result.get("ok"):
        guest_obj = result.pop("guest", None)
        if guest_obj:
            result["guest"] = asdict(guest_obj)
        db.add(GuestRecord(
            guest_id=result["guest_id"],
            full_name=body.guest_name,
            room_number=result["room_number"],
            check_in_date=time.time(),
            is_active=True,
        ))
        row = db.query(RoomState).filter(RoomState.room_number == result["room_number"]).first()
        if row:
            row.status = "OCCUPIED"
        db.commit()
    return result


@router.post("/checkout/{room_number}", summary="Check out a guest")
def check_out(
    room_number: str,
    body: CheckOutRequest = CheckOutRequest(),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("receptionist")),
):
    if state.reception is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    result = state.reception.check_out(room_number, body.discount_pct)
    if result.get("ok"):
        guest_id = result["bill"]["guest_id"]
        row = db.query(GuestRecord).filter(GuestRecord.guest_id == guest_id).first()
        if row:
            row.check_out_date = time.time()
            row.is_active = False
        room_row = db.query(RoomState).filter(RoomState.room_number == room_number).first()
        if room_row:
            room_row.status = "DIRTY"
        db.commit()
    return result


@router.get("/guests", summary="List all active guests")
def list_guests(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("receptionist")),
):
    guests = db.query(GuestRecord).filter(GuestRecord.is_active == True).all()  # noqa: E712
    return [
        {
            "guest_id": g.guest_id,
            "full_name": g.full_name,
            "room_number": g.room_number,
            "check_in_date": g.check_in_date,
        }
        for g in guests
    ]
