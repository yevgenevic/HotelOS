"""
reception.py — ReceptionService: check-in, check-out, billing.

Paradigms demonstrated here:
  - PROCEDURAL : calculate_bill() is a pure function — takes inputs, returns
                 a result dict, has no side-effects and no class state.
  - OOP        : ReceptionService encapsulates hotel + broker dependencies;
                 _find_room() hides multi-criteria sort logic from callers.
  - EVENT-DRIVEN: after check-out the service publishes "room.vacated" on the
                 broker; HousekeepingService reacts automatically without
                 ReceptionService knowing it exists.
"""

from __future__ import annotations

import time
import uuid
from datetime import datetime
from typing import Dict, Optional, Union

from broker import MessageBroker
from models import Guest, Hotel, Receptionist, Room, RoomStatus, RoomType


# ---------------------------------------------------------------------------
# PROCEDURAL — standalone bill-calculation function
# ---------------------------------------------------------------------------

def calculate_bill(
    guest: Guest,
    room: Room,
    check_out: datetime,
    discount_pct: float = 0,
) -> dict:
    """
    Procedural bill calculation.

    This function follows a strict step-by-step sequence — it is called once,
    reads its inputs, performs arithmetic in order, and returns a result.
    There is no object state involved, making it easy to test in isolation.

    Edge cases handled:
      - Same-day check-out → billed as 1 night (max(1, days)).
      - Zero room charges  → grand_total equals room_total only.
      - Discount applied   → subtracted after summing all charges.
    """
    # Step 1: Determine nights stayed.
    if guest.check_in_date is not None:
        check_in = datetime.fromtimestamp(guest.check_in_date)
    else:
        check_in = check_out
    nights = max(1, (check_out.date() - check_in.date()).days)

    # Step 2: Calculate room accommodation cost.
    room_total = round(nights * room.price, 2)

    # Step 3: Sum all incidental room-service charges.
    room_charges = round(sum(room.charges), 2)

    # Step 4: Compute subtotal and apply optional discount.
    subtotal        = round(room_total + room_charges, 2)
    discount_amount = round(subtotal * discount_pct / 100, 2) if discount_pct else 0
    grand_total     = round(subtotal - discount_amount, 2)

    return {
        "guest_id":        guest.guest_id,
        "guest_name":      guest.name,
        "room_number":     room.number,
        "room_type":       room.type.value,
        "nights":          nights,
        "room_rate":       room.price,
        "room_total":      room_total,
        "room_charges":    room_charges,
        "charge_items":    list(room.charges),
        "discount_pct":    discount_pct,
        "discount_amount": discount_amount,
        "grand_total":     grand_total,
        "check_in":        check_in.isoformat(),
        "check_out":       check_out.isoformat(),
    }


# ---------------------------------------------------------------------------
# OOP — ReceptionService class
# ---------------------------------------------------------------------------

class ReceptionService:
    """
    Manages guest arrivals and departures.

    OOP design:
      - Encapsulation : _hotel, _broker, _guests are private; callers use the
                        public check_in / check_out / get_room_status API.
      - Abstraction   : check_in() hides the multi-criteria room search behind
                        a single method call; caller does not know how rooms
                        are ranked.
      - Event-driven  : publishes "reception.check_in" and "room.vacated" to
                        the broker so other services react without tight coupling.
    """

    def __init__(self, hotel: Hotel, broker: MessageBroker):
        self._hotel        = hotel
        self._broker       = broker
        self._receptionist = Receptionist("R1", "Aziza")
        self._guests:      Dict[str, Guest] = {}

        # Subscribe to events published by other services.
        self._broker.subscribe("room.cleaned",    self._on_room_cleaned)
        self._broker.subscribe("room.charge_added", self._on_charge_added)

    @property
    def receptionist(self) -> Receptionist:
        return self._receptionist

    # ---- EVENT-DRIVEN — event handlers ------------------------------------

    def _on_room_cleaned(self, data: dict) -> None:
        """
        EVENT-DRIVEN example:
        HousekeepingService publishes "room.cleaned" when a room is ready.
        ReceptionService is subscribed and receives this notification
        automatically — it does not poll or check periodically.
        Here we only log; the room object is already updated by Housekeeping.
        """
        pass   # room state already updated by HousekeepingService

    def _on_charge_added(self, data: dict) -> None:
        """
        EVENT-DRIVEN example:
        RoomServiceService publishes "room.charge_added" after delivery.
        We receive the event but do not re-apply the charge — the originating
        service already called room.add_charge() to avoid double-billing.
        """
        pass

    # ---- Room selection algorithm (OOP — private helper) ------------------

    def _find_room(
        self,
        room_type: RoomType,
        floor_preference: Optional[int],
        proximity_preference: Optional[str] = None,
    ) -> Optional[Room]:
        """
        Room assignment algorithm — 5 criteria applied in priority order:

        1. Type match    : only rooms matching the requested RoomType qualify.
        2. Clean status  : only rooms with is_available() == True (CLEAN + no guest).
        3. Longest clean : among candidates, oldest cleaned_at is preferred
                           (ensures even rotation across rooms).
        4. Floor pref    : if the guest named a floor, restrict to that floor first;
                           fall back to all floors if none available there.
        5. Proximity pref: elevator / stairs preference as a secondary sort key.
        """
        # Criteria 1 + 2: type match and availability filter.
        candidates = [
            r for r in self._hotel.rooms.values()
            if r.type == room_type and r.is_available()
        ]
        if not candidates:
            return None

        # Criterion 4: floor preference (soft — fall back if no match).
        if floor_preference is not None:
            preferred = [r for r in candidates if r.floor == floor_preference]
            if preferred:
                candidates = preferred

        # Criteria 3 + 5: sort by proximity match first, then by cleaned_at
        # (ascending — smallest timestamp = cleaned longest ago).
        candidates.sort(key=lambda r: (
            r.proximity != proximity_preference if proximity_preference else False,
            r.cleaned_at,
        ))
        return candidates[0]

    def _available_alternatives(self, exclude: RoomType) -> list:
        """Return room types that still have at least one available room."""
        return [
            rt.value
            for rt in RoomType
            if rt != exclude
            and any(r.type == rt and r.is_available() for r in self._hotel.rooms.values())
        ]

    @staticmethod
    def _coerce_room_type(value: Union[str, RoomType, None]) -> Optional[RoomType]:
        """Input validation: accept RoomType enum or case-insensitive string."""
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
        proximity_preference: Optional[str] = None,
    ) -> dict:
        """
        Check a guest in.

        Thread safety: the entire find-and-assign sequence is wrapped in
        hotel.allocation_lock to prevent two simultaneous check-ins from
        receiving the same room (see TS-06).
        """
        coerced = self._coerce_room_type(room_type)
        if coerced is None:
            return {"ok": False, "error": f"Invalid room type: {room_type!r}"}

        with self._hotel.allocation_lock:
            room = self._find_room(coerced, floor_preference, proximity_preference)
            if room is None:
                alternatives = self._available_alternatives(coerced)
                result = {"ok": False, "error": "No rooms available for requested type"}
                if alternatives:
                    result["alternatives"] = alternatives
                return result

            guest = Guest(
                guest_id=str(uuid.uuid4())[:8],
                name=guest_name,
                check_in_date=time.time(),
            )
            self._guests[guest.guest_id] = guest
            room.mark_occupied(guest)

        # EVENT-DRIVEN: publish check-in event so the dashboard updates instantly.
        self._broker.publish(
            "reception.check_in",
            {
                "guest_id":   guest.guest_id,
                "guest_name": guest.name,
                "room_number": room.number,
                "room_type":  room.type.value,
                "floor":      room.floor,
            },
        )
        return {
            "ok":          True,
            "guest_id":    guest.guest_id,
            "room_number": room.number,
            "guest":       guest,
        }

    def check_out(self, room_number: str, discount_pct: float = 0) -> dict:
        """
        Check a guest out.

        Sequence (procedural):
          1. Validate room exists and is occupied.
          2. Calculate bill using calculate_bill() function.
          3. Mark room dirty (triggers housekeeping via broker event).
          4. Clear charges and publish "room.vacated".

        EVENT-DRIVEN: publishing "room.vacated" causes HousekeepingService
        to add the room to its cleaning queue automatically.
        """
        room = self._hotel.rooms.get(room_number)
        if room is None:
            return {"ok": False, "error": f"Unknown room: {room_number}"}
        guest = room.guest
        if guest is None:
            return {"ok": False, "error": f"Room {room_number} is not occupied"}

        bill = calculate_bill(guest, room, datetime.now(), discount_pct)
        room.mark_dirty()
        room.reset_charges()

        # EVENT-DRIVEN: HousekeepingService subscribed to "room.vacated" will
        # automatically enqueue this room for cleaning without being called directly.
        self._broker.publish(
            "room.vacated",
            {
                "room_number": room.number,
                "guest_id":    guest.guest_id,
                "bill":        bill,
            },
        )
        return {"ok": True, "bill": bill}

    def get_room_status(self, room_number: Optional[str] = None) -> dict:
        """Return status of one room or all rooms (used by dashboard)."""
        if room_number is not None:
            r = self._hotel.rooms.get(room_number)
            return r.to_dict() if r else {}
        return self._hotel.snapshot()
