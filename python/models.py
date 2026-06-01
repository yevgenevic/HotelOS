"""
models.py — HotelOS domain models.

This module uses Object-Oriented Programming (OOP) throughout:
  - Encapsulation  : all Room internals are private (_attr); exposed via @property.
  - Inheritance    : Employee is the base class; Receptionist / Housekeeper /
                     Technician / RoomServiceStaff specialise it.
  - Polymorphism   : every subclass overrides handle_request() differently.
  - Abstraction    : callers use simple verbs (room.mark_clean(), hotel.snapshot())
                     without knowing internal locking or state details.
"""

from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


# ---------------------------------------------------------------------------
# Enumerations (named constants — avoids "magic strings" in caller code)
# ---------------------------------------------------------------------------

class RoomStatus(Enum):
    CLEAN       = "CLEAN"
    OCCUPIED    = "OCCUPIED"
    DIRTY       = "DIRTY"
    CLEANING    = "CLEANING"
    MAINTENANCE = "MAINTENANCE"


class RoomType(Enum):
    SINGLE     = "SINGLE"
    DOUBLE     = "DOUBLE"
    SUITE      = "SUITE"
    ACCESSIBLE = "ACCESSIBLE"


class MaintenancePriority(Enum):
    """Lower numeric value = higher urgency (used by heapq in MaintenanceService)."""
    CRITICAL = 1
    HIGH     = 2
    NORMAL   = 3
    LOW      = 4


class OrderStatus(Enum):
    RECEIVED   = "RECEIVED"
    PREPARING  = "PREPARING"
    DELIVERING = "DELIVERING"
    DELIVERED  = "DELIVERED"


# Named constants: avoids magic numbers scattered through the codebase.
ROOM_PRICES: Dict[RoomType, float] = {
    RoomType.SINGLE:     80.0,
    RoomType.DOUBLE:    120.0,
    RoomType.SUITE:     200.0,
    RoomType.ACCESSIBLE: 100.0,
}


# ---------------------------------------------------------------------------
# Data classes (lightweight value objects — no behaviour)
# ---------------------------------------------------------------------------

@dataclass
class Guest:
    guest_id:       str
    name:           str
    check_in_date:  Optional[float] = None   # Unix epoch seconds


@dataclass
class OrderItem:
    name:       str
    quantity:   int
    unit_price: float

    @property
    def total(self) -> float:
        return round(self.quantity * self.unit_price, 2)


@dataclass
class RoomServiceOrder:
    order_id:    str
    room_number: str
    items:       List[OrderItem]
    status:      OrderStatus = OrderStatus.RECEIVED

    @property
    def total(self) -> float:
        return round(sum(item.total for item in self.items), 2)


@dataclass
class MaintenanceRequest:
    request_id:  str
    room_number: str
    priority:    MaintenancePriority
    description: str   = ""
    submitted_at: float = field(default_factory=time.time)

    def __lt__(self, other: "MaintenanceRequest") -> bool:
        """
        Comparison for heapq priority queue.
        Primary key  : priority.value (lower = more urgent).
        Tie-breaker  : submitted_at (earlier submission wins).
        """
        if not isinstance(other, MaintenanceRequest):
            return NotImplemented
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.submitted_at < other.submitted_at


# ---------------------------------------------------------------------------
# OOP — Base class + Inheritance hierarchy
# ---------------------------------------------------------------------------

class HotelEntity:
    """Abstract base providing a stable entity_id interface."""

    def __init__(self, entity_id: str):
        self._entity_id = entity_id   # Encapsulated: private with public getter

    @property
    def entity_id(self) -> str:
        return self._entity_id


class Room(HotelEntity):
    """
    OOP example — Encapsulation:
    All mutable state (_status, _guest, _charges, _cleaned_at) is private.
    Every mutation goes through a method that also acquires _lock, so the
    room is safe to modify from multiple threads simultaneously.
    """

    def __init__(
        self,
        number: str,
        room_type: RoomType,
        floor: int,
        proximity: str = "middle",
    ):
        super().__init__(number)
        self._number    = number
        self._type      = room_type
        self._floor     = floor
        self._proximity = proximity
        self._price     = ROOM_PRICES[room_type]
        self._status    = RoomStatus.CLEAN
        self._guest:    Optional[Guest] = None
        self._charges:  List[float]     = []
        self._cleaned_at: float         = time.time()
        self._lock      = threading.RLock()   # re-entrant: safe for nested calls

    # -- Read-only properties (Encapsulation: expose state without raw access) --

    @property
    def number(self) -> str:
        return self._number

    @property
    def type(self) -> RoomType:
        return self._type

    @property
    def floor(self) -> int:
        return self._floor

    @property
    def proximity(self) -> str:
        return self._proximity

    @property
    def price(self) -> float:
        return self._price

    @property
    def status(self) -> RoomStatus:
        return self._status

    @property
    def guest(self) -> Optional[Guest]:
        return self._guest

    @property
    def charges(self) -> List[float]:
        with self._lock:
            return list(self._charges)   # defensive copy: caller cannot mutate

    @property
    def cleaned_at(self) -> float:
        return self._cleaned_at

    # -- State-transition methods (single responsibility per method) ----------

    def is_available(self) -> bool:
        with self._lock:
            return self._status == RoomStatus.CLEAN and self._guest is None

    def mark_occupied(self, guest: Guest) -> None:
        with self._lock:
            self._status = RoomStatus.OCCUPIED
            self._guest  = guest

    def mark_dirty(self) -> None:
        with self._lock:
            self._status = RoomStatus.DIRTY
            self._guest  = None

    def mark_cleaning(self) -> None:
        with self._lock:
            self._status = RoomStatus.CLEANING

    def mark_maintenance(self) -> None:
        with self._lock:
            self._status = RoomStatus.MAINTENANCE

    def mark_clean(self) -> None:
        with self._lock:
            self._status    = RoomStatus.CLEAN
            self._cleaned_at = time.time()   # timestamp used by room-assignment algorithm

    def add_charge(self, amount: float) -> None:
        with self._lock:
            self._charges.append(round(float(amount), 2))

    def reset_charges(self) -> None:
        with self._lock:
            self._charges.clear()

    def to_dict(self) -> dict:
        """Serialise room state for WebSocket / API responses."""
        with self._lock:
            return {
                "number":    self._number,
                "type":      self._type.value,
                "floor":     self._floor,
                "proximity": self._proximity,
                "price":     self._price,
                "status":    self._status.value,
                "guest": (
                    {
                        "guest_id":       self._guest.guest_id,
                        "name":           self._guest.name,
                        "check_in_date":  self._guest.check_in_date,
                    }
                    if self._guest else None
                ),
                "charges":    list(self._charges),
                "cleaned_at": self._cleaned_at,
            }


# ---------------------------------------------------------------------------
# OOP — Employee inheritance hierarchy (Inheritance + Polymorphism)
# ---------------------------------------------------------------------------

class Employee(HotelEntity):
    """
    OOP example — Inheritance + Polymorphism:
    Employee is the abstract base.  Each concrete subclass overrides
    handle_request() to respond in a role-specific way — this is polymorphism:
    the same method name, different behaviour depending on the actual type.
    """

    def __init__(self, employee_id: str, name: str):
        super().__init__(employee_id)
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def handle_request(self, request: dict) -> dict:
        """Subclasses must override this — defines polymorphic behaviour."""
        raise NotImplementedError


class _WorkerEmployee(Employee):
    """
    Intermediate class for employees who can be in a busy/free state
    (Housekeepers and Technicians).  Receptionists and Room Service staff
    do not use this — showing selective inheritance.
    """

    def __init__(self, employee_id: str, name: str):
        super().__init__(employee_id, name)
        self._busy      = False
        self._busy_lock = threading.Lock()

    def is_available(self) -> bool:
        with self._busy_lock:
            return not self._busy

    def take_job(self) -> bool:
        """Atomically claim the worker; returns False if already busy."""
        with self._busy_lock:
            if self._busy:
                return False
            self._busy = True
            return True

    def release(self) -> None:
        """Mark worker as free after completing a job."""
        with self._busy_lock:
            self._busy = False


# Polymorphism: same handle_request() signature, three different implementations.

class Receptionist(Employee):
    def handle_request(self, request: dict) -> dict:
        return {"handler": self._name, "role": "reception", "request": request}


class Housekeeper(_WorkerEmployee):
    def handle_request(self, request: dict) -> dict:
        return {"handler": self._name, "role": "housekeeping", "request": request}


class Technician(_WorkerEmployee):
    def handle_request(self, request: dict) -> dict:
        return {"handler": self._name, "role": "maintenance", "request": request}


class RoomServiceStaff(Employee):
    def handle_request(self, request: dict) -> dict:
        return {"handler": self._name, "role": "room_service", "request": request}


# ---------------------------------------------------------------------------
# Hotel — in-memory container (Abstraction)
# ---------------------------------------------------------------------------

class Hotel:
    """
    OOP example — Abstraction:
    Callers interact with hotel.snapshot() or hotel.allocation_lock without
    knowing how rooms are stored internally or how the lock is implemented.
    The standard_layout() factory hides the room-creation details entirely.
    """

    def __init__(self) -> None:
        self.rooms: Dict[str, Room] = {}
        # Global lock used by ReceptionService to prevent double-booking (TS-06).
        self.allocation_lock = threading.RLock()

    def add_room(self, room: Room) -> None:
        self.rooms[room.number] = room

    @classmethod
    def standard_layout(cls) -> "Hotel":
        """
        Factory method: builds a 2-floor, 10-room hotel.
        Assignment note: 120 rooms are not required — architecture matters,
        not scale (see Task 3 brief).
        """
        hotel = cls()
        # Floor 1
        floor1 = [
            ("101", RoomType.SINGLE,     "elevator"),
            ("102", RoomType.DOUBLE,     "middle"),
            ("103", RoomType.DOUBLE,     "middle"),
            ("104", RoomType.SUITE,      "middle"),
            ("105", RoomType.ACCESSIBLE, "stairs"),
        ]
        # Floor 2
        floor2 = [
            ("201", RoomType.SINGLE,     "elevator"),
            ("202", RoomType.DOUBLE,     "middle"),
            ("203", RoomType.DOUBLE,     "middle"),
            ("204", RoomType.SUITE,      "middle"),
            ("205", RoomType.ACCESSIBLE, "stairs"),
        ]
        for num, t, prox in floor1:
            hotel.add_room(Room(num, t, floor=1, proximity=prox))
            time.sleep(0.001)   # ensure distinct cleaned_at timestamps for LRU ordering
        for num, t, prox in floor2:
            hotel.add_room(Room(num, t, floor=2, proximity=prox))
            time.sleep(0.001)
        return hotel

    def snapshot(self) -> dict:
        """Return a serialisable snapshot of every room's current state."""
        return {n: r.to_dict() for n, r in self.rooms.items()}
