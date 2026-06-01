from __future__ import annotations

import json
import time
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from api import state
from api.auth import get_current_user, require_roles
from db.database import get_db
from db.models_db import OrderRecord, User

router = APIRouter()


class OrderItemIn(BaseModel):
    name: str
    quantity: int = 1


class PlaceOrderRequest(BaseModel):
    room_number: str
    items: List[OrderItemIn]


@router.get("/menu", summary="Get room service menu")
def get_menu(_: User = Depends(get_current_user)):
    if state.room_service is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    return state.room_service.menu


@router.post("/orders", summary="Place a room service order")
def place_order(
    body: PlaceOrderRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("room_service")),
):
    if state.room_service is None:
        raise HTTPException(503, "Service unavailable: start with Redis running")
    items = [{"name": i.name, "quantity": i.quantity} for i in body.items]
    result = state.room_service.place_order(body.room_number, items)
    if result.get("ok"):
        db.add(OrderRecord(
            order_id=result["order_id"],
            room_number=body.room_number,
            items_json=json.dumps(items),
            status="RECEIVED",
            total_price=result["total"],
            created_at=time.time(),
        ))
        db.commit()
    return result


@router.get("/orders", summary="List recent room service orders")
def list_orders(
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("room_service")),
):
    rows = db.query(OrderRecord).order_by(OrderRecord.created_at.desc()).limit(50).all()
    return [
        {
            "order_id": o.order_id,
            "room_number": o.room_number,
            "items": json.loads(o.items_json),
            "status": o.status,
            "total_price": o.total_price,
            "created_at": o.created_at,
        }
        for o in rows
    ]


@router.patch("/orders/{order_id}", summary="Update order status")
def update_order(
    order_id: str,
    status: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("room_service")),
):
    row = db.query(OrderRecord).filter(OrderRecord.order_id == order_id).first()
    if row is None:
        raise HTTPException(404, "Order not found")
    row.status = status.upper()
    db.commit()

    if state.room_service is not None:
        state.room_service.update_order_status(order_id, status)

    return {"ok": True, "order_id": order_id, "status": status}
