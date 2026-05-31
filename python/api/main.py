from __future__ import annotations

import asyncio
import threading
import time
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from api import state
from api.auth import (
    create_token,
    get_current_user,
    hash_password,
    verify_password,
)
from api.routers import housekeeping as housekeeping_router
from api.routers import maintenance as maintenance_router
from api.routers import reception as reception_router
from api.routers import room_service as room_service_router
from broker import MessageBroker
from dashboard.server import DashboardServer
from db.database import Base, SessionLocal, engine, get_db
from db.models_db import GuestRecord, RoomState, User
from housekeeping import HousekeepingService
from maintenance import MaintenanceService
from models import Hotel
from reception import ReceptionService
from room_service import RoomServiceService

_DEFAULT_USERS = [
    ("admin", "admin123", "admin"),
    ("receptionist", "recep123", "receptionist"),
    ("housekeeper", "house123", "housekeeper"),
    ("roomservice", "service123", "room_service"),
    ("technician", "tech123", "technician"),
]


def _seed_users(db: Session) -> None:
    for username, password, role in _DEFAULT_USERS:
        if not db.query(User).filter(User.username == username).first():
            db.add(User(username=username, password_hash=hash_password(password), role=role))
    db.commit()


def _seed_rooms(hotel: Hotel, db: Session) -> None:
    for room in hotel.rooms.values():
        if not db.query(RoomState).filter(RoomState.room_number == room.number).first():
            db.add(RoomState(
                room_number=room.number,
                floor=room.floor,
                room_type=room.type.value,
                status=room.status.value,
                last_cleaned=room.cleaned_at,
                proximity=room.proximity,
            ))
    db.commit()


def _make_room_sync_handler(hotel: Hotel):
    """Subscribe to all Redis events and mirror room status changes to SQLite."""
    def handler(channel: str, data: dict) -> None:
        room_number = data.get("room_number")
        if not room_number:
            return
        room = hotel.rooms.get(room_number)
        if not room:
            return
        s = SessionLocal()
        try:
            row = s.query(RoomState).filter(RoomState.room_number == room_number).first()
            if row:
                row.status = room.status.value
                row.last_cleaned = room.cleaned_at
                s.commit()
        except Exception:
            s.rollback()
        finally:
            s.close()
    return handler


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        _seed_users(db)
    finally:
        db.close()

    hotel = Hotel.standard_layout()

    try:
        broker = MessageBroker()
    except Exception as exc:
        print(f"[api] Redis unavailable ({exc}). WebSocket dashboard disabled.")
        broker = None

    if broker:
        reception = ReceptionService(hotel, broker)
        housekeeping = HousekeepingService(hotel, broker)
        room_svc = RoomServiceService(hotel, broker)
        maintenance = MaintenanceService(hotel, broker)

        broker.subscribe_pattern("*", _make_room_sync_handler(hotel))

        db = SessionLocal()
        try:
            _seed_rooms(hotel, db)
        finally:
            db.close()

        dash = DashboardServer(hotel, broker)

        def _run_ws():
            asyncio.run(dash.serve())

        threading.Thread(target=_run_ws, daemon=True).start()
        time.sleep(0.3)
        print("[api] WebSocket dashboard starting on ws://localhost:8765")
    else:
        reception = housekeeping = room_svc = maintenance = None
        db = SessionLocal()
        try:
            _seed_rooms(hotel, db)
        finally:
            db.close()

    state.hotel = hotel
    state.reception = reception
    state.housekeeping = housekeeping
    state.room_service = room_svc
    state.maintenance = maintenance

    yield

    if broker:
        broker.stop()


app = FastAPI(
    title="HotelOS API",
    description=(
        "Hotel management microservices — Reception, Housekeeping, "
        "Room Service, Maintenance.\n\n"
        "**Default credentials:** admin/admin123 · receptionist/recep123 · "
        "housekeeper/house123 · roomservice/service123 · technician/tech123\n\n"
        "Login at `/auth/token`, copy the `access_token`, click **Authorize** above."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(reception_router.router, prefix="/reception", tags=["Reception"])
app.include_router(housekeeping_router.router, prefix="/housekeeping", tags=["Housekeeping"])
app.include_router(room_service_router.router, prefix="/roomservice", tags=["Room Service"])
app.include_router(maintenance_router.router, prefix="/maintenance", tags=["Maintenance"])


@app.post("/auth/token", tags=["Auth"], summary="Login — returns JWT bearer token")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_token(user.username, user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
    }


@app.get("/auth/me", tags=["Auth"], summary="Get current user info")
def me(current_user: User = Depends(get_current_user)):
    return {"username": current_user.username, "role": current_user.role}


@app.get("/rooms", tags=["Rooms"], summary="List all rooms (any authenticated user)")
def list_rooms(_: User = Depends(get_current_user)):
    return state.hotel.snapshot()


@app.get("/rooms/{room_number}", tags=["Rooms"], summary="Get room detail")
def get_room(room_number: str, _: User = Depends(get_current_user)):
    room = state.hotel.rooms.get(room_number)
    if room is None:
        raise HTTPException(404, f"Room {room_number} not found")
    return room.to_dict()
