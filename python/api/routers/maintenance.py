from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api import state
from api.auth import require_roles
from db.database import get_db
from db.models_db import MaintenanceRecord, RoomState, User

router = APIRouter()


class SubmitRequest(BaseModel):
    room_number: str
    priority: str
    description: str = ""


@router.post("/issues", summary="Submit a maintenance request")
def submit_issue(
    body: SubmitRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("technician")),
):
    if state.maintenance is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    result = state.maintenance.submit_request(body.room_number, body.priority, body.description)
    if result.get("ok"):
        db.add(MaintenanceRecord(
            request_id=result["request_id"],
            room_number=body.room_number,
            priority=body.priority.upper(),
            description=body.description,
            status="OPEN",
            created_at=time.time(),
        ))
        row = db.query(RoomState).filter(RoomState.room_number == body.room_number).first()
        if row:
            row.status = "MAINTENANCE"
        db.commit()
    return result


@router.get("/issues", summary="List all maintenance requests")
def list_issues(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("technician")),
):
    rows = db.query(MaintenanceRecord).order_by(MaintenanceRecord.created_at.desc()).all()
    return [
        {
            "request_id": r.request_id,
            "room_number": r.room_number,
            "priority": r.priority,
            "description": r.description,
            "status": r.status,
            "assigned_to": r.assigned_to,
            "created_at": r.created_at,
        }
        for r in rows
    ]


@router.patch("/issues/{request_id}/assign", summary="Assign next pending request to a technician")
def assign_issue(
    request_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("technician")),
):
    if state.maintenance is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    result = state.maintenance.assign_next()
    if result is None:
        raise HTTPException(400, "No pending requests or no available technicians")
    row = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.request_id == result["request_id"]
    ).first()
    if row:
        row.status = "ASSIGNED"
        row.assigned_to = result["technician"]
        db.commit()
    return result


@router.patch("/issues/{request_id}/resolve", summary="Resolve a maintenance request")
def resolve_issue(
    request_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("technician")),
):
    if state.maintenance is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    result = state.maintenance.resolve(request_id)
    if not result.get("ok"):
        raise HTTPException(400, result.get("error", "Failed to resolve request"))
    row = db.query(MaintenanceRecord).filter(
        MaintenanceRecord.request_id == request_id
    ).first()
    if row:
        row.status = "RESOLVED"
        db.commit()
    return result
