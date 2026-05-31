from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Dict, Optional, Union

from broker import MessageBroker
from models import (
    Guest,
    Hotel,
    Receptionist,
    Room,
    RoomStatus,
    RoomType,
)


def calculate_bill(guest: Guest, room: Room, check_out: datetime) -> dict:
    """Procedural bill calculation."""
    if guest.check_in_date is not None:
        check_in = datetime.fromtimestamp(guest.check_in_date)
    else:
        check_in = check_out
    nights = max(1, (check_out.date() - check_in.date()).days)
    room_total = round(nights * room.price, 2)
    room_charges = round(sum(room.charges), 2)
    grand_total = round(room_total + room_charges, 2)
    return {
        "guest_id": guest.guest_id,
        "guest_name": guest.name,
        "room_number": room.number,
        "room_type": room.type.value,
        "nights": nights,
        "room_rate": room.price,
        "room_total": room_total,
        "room_charges": room_charges,
        "charge_items": list(room.charges),
        "grand_total": grand_total,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
    }


class ReceptionService:
    def __init__(self, hotel: Hotel, broker: MessageBroker):
        self._hotel = hotel
        self._broker = broker
        self._receptionist = Receptionist("R1", "Aziza")
        self._guests: Dict[str, Guest] = {}
        self._broker.subscribe("room.cleaned", self._on_room_cleaned)
        self._broker.subscribe("room.charge_added", self._on_charge_added)

    @property
    def receptionist(self) -> Receptionist:
        return self._receptionist

    # ---- Event handlers ---------------------------------------------------
    def _on_room_cleaned(self, data: dict) -> None:
        # Informational — housekeeping has already updated room state.
        pass

    def _on_charge_added(self, data: dict) -> None:
        # Informational — the originating service has already mutated the room.
        # We do NOT re-apply, to avoid double charging.
        pass

    # ---- Room selection ---------------------------------------------------
    def _find_room(
        self, room_type: RoomType, floor_preference: Optional[int]
    ) -> Optional[Room]:
        candidates = [
            r
            for r in self._hotel.rooms.values()
            if r.type == room_type and r.is_available()
        ]
        if not candidates:
            return None
        if floor_preference is not None:
            preferred = [r for r in candidates if r.floor == floor_preference]
            if preferred:
                candidates = preferred
        candidates.sort(key=lambda r: r.cleaned_at)
        return candidates[0]

    @staticmethod
    def _coerce_room_type(value: Union[str, RoomType, None]) -> Optional[RoomType]:
        if isinstance(value, RoomType):
            return value
        if isinstance(value, str):
            try:
                return RoomType[value.upper()]
            except KeyError:
                return None
        return None

    # ---- Public API -------------------------------------------------------
    def check_in(
        self,
        guest_name: str,
        room_type: Union[str, RoomType],
        floor_preference: Optional[int] = None,
    ) -> dict:
        coerced = self._coerce_room_type(room_type)
        if coerced is None:
            return {"ok": False, "error": f"Invalid room type: {room_type!r}"}

        with self._hotel.allocation_lock:
            room = self._find_room(coerced, floor_preference)
            if room is None:
                return {"ok": False, "error": "No rooms available for requested type"}
            guest = Guest(
                guest_id=str(uuid.uuid4())[:8],
                name=guest_name,
                check_in_date=time.time(),
            )
            self._guests[guest.guest_id] = guest
            room.mark_occupied(guest)

        self._broker.publish(
            "reception.check_in",
            {
                "guest_id": guest.guest_id,
                "guest_name": guest.name,
                "room_number": room.number,
                "room_type": room.type.value,
                "floor": room.floor,
            },
        )
        return {
            "ok": True,
            "guest_id": guest.guest_id,
            "room_number": room.number,
            "guest": guest,
        }

    def check_out(self, room_number: str) -> dict:
        room = self._hotel.rooms.get(room_number)
        if room is None:
            return {"ok": False, "error": f"Unknown room: {room_number}"}
        guest = room.guest
        if guest is None:
            return {"ok": False, "error": f"Room {room_number} is not occupied"}

        bill = calculate_bill(guest, room, datetime.now())
        room.mark_dirty()
        room.reset_charges()
        self._broker.publish(
            "room.vacated",
            {
                "room_number": room.number,
                "guest_id": guest.guest_id,
                "bill": bill,
            },
        )
        return {"ok": True, "bill": bill}

    def get_room_status(self, room_number: Optional[str] = None) -> dict:
        if room_number is not None:
            r = self._hotel.rooms.get(room_number)
            return r.to_dict() if r else {}
        return self._hotel.snapshot()
