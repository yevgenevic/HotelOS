from __future__ import annotations

import threading
import time
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional


class RoomStatus(Enum):
    CLEAN = "CLEAN"
    OCCUPIED = "OCCUPIED"
    DIRTY = "DIRTY"
    CLEANING = "CLEANING"
    MAINTENANCE = "MAINTENANCE"


class RoomType(Enum):
    SINGLE = "SINGLE"
    DOUBLE = "DOUBLE"
    SUITE = "SUITE"
    ACCESSIBLE = "ACCESSIBLE"


class MaintenancePriority(Enum):
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4


class OrderStatus(Enum):
    RECEIVED = "RECEIVED"
    PREPARING = "PREPARING"
    DELIVERING = "DELIVERING"
    DELIVERED = "DELIVERED"


ROOM_PRICES: Dict[RoomType, float] = {
    RoomType.SINGLE: 80.0,
    RoomType.DOUBLE: 120.0,
    RoomType.SUITE: 200.0,
    RoomType.ACCESSIBLE: 100.0,
}


@dataclass
class Guest:
    guest_id: str
    name: str
    check_in_date: Optional[float] = None  # epoch seconds


@dataclass
class OrderItem:
    name: str
    quantity: int
    unit_price: float

    @property
    def total(self) -> float:
        return round(self.quantity * self.unit_price, 2)


@dataclass
class RoomServiceOrder:
    order_id: str
    room_number: str
    items: List[OrderItem]
    status: OrderStatus = OrderStatus.RECEIVED

    @property
    def total(self) -> float:
        return round(sum(item.total for item in self.items), 2)


@dataclass
class MaintenanceRequest:
    request_id: str
    room_number: str
    priority: MaintenancePriority
    description: str = ""
    submitted_at: float = field(default_factory=time.time)

    def __lt__(self, other: "MaintenanceRequest") -> bool:
        if not isinstance(other, MaintenanceRequest):
            return NotImplemented
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.submitted_at < other.submitted_at


class HotelEntity:
    def __init__(self, entity_id: str):
        self._entity_id = entity_id

    @property
    def entity_id(self) -> str:
        return self._entity_id


class Room(HotelEntity):
    def __init__(self, number: str, room_type: RoomType, floor: int):
        super().__init__(number)
        self._number = number
        self._type = room_type
        self._floor = floor
        self._price = ROOM_PRICES[room_type]
        self._status = RoomStatus.CLEAN
        self._guest: Optional[Guest] = None
        self._charges: List[float] = []
        self._cleaned_at: float = time.time()
        self._lock = threading.RLock()

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
            return list(self._charges)

    @property
    def cleaned_at(self) -> float:
        return self._cleaned_at

    def is_available(self) -> bool:
        with self._lock:
            return self._status == RoomStatus.CLEAN and self._guest is None

    def mark_occupied(self, guest: Guest) -> None:
        with self._lock:
            self._status = RoomStatus.OCCUPIED
            self._guest = guest

    def mark_dirty(self) -> None:
        with self._lock:
            self._status = RoomStatus.DIRTY
            self._guest = None

    def mark_cleaning(self) -> None:
        with self._lock:
            self._status = RoomStatus.CLEANING

    def mark_clean(self) -> None:
        with self._lock:
            self._status = RoomStatus.CLEAN
            self._cleaned_at = time.time()

    def add_charge(self, amount: float) -> None:
        with self._lock:
            self._charges.append(round(float(amount), 2))

    def reset_charges(self) -> None:
        with self._lock:
            self._charges.clear()

    def to_dict(self) -> dict:
        with self._lock:
            return {
                "number": self._number,
                "type": self._type.value,
                "floor": self._floor,
                "price": self._price,
                "status": self._status.value,
                "guest": (
                    {
                        "guest_id": self._guest.guest_id,
                        "name": self._guest.name,
                        "check_in_date": self._guest.check_in_date,
                    }
                    if self._guest
                    else None
                ),
                "charges": list(self._charges),
                "cleaned_at": self._cleaned_at,
            }


class Employee(HotelEntity):
    def __init__(self, employee_id: str, name: str):
        super().__init__(employee_id)
        self._name = name

    @property
    def name(self) -> str:
        return self._name

    def handle_request(self, request: dict) -> dict:
        raise NotImplementedError


class _WorkerEmployee(Employee):
    """Employee that can be busy/free with a job."""

    def __init__(self, employee_id: str, name: str):
        super().__init__(employee_id, name)
        self._busy = False
        self._busy_lock = threading.Lock()

    def is_available(self) -> bool:
        with self._busy_lock:
            return not self._busy

    def take_job(self) -> bool:
        with self._busy_lock:
            if self._busy:
                return False
            self._busy = True
            return True

    def release(self) -> None:
        with self._busy_lock:
            self._busy = False


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


class Hotel:
    """In-memory container holding all rooms and a global allocation lock."""

    def __init__(self) -> None:
        self.rooms: Dict[str, Room] = {}
        self.allocation_lock = threading.RLock()

    def add_room(self, room: Room) -> None:
        self.rooms[room.number] = room

    @classmethod
    def standard_layout(cls) -> "Hotel":
        hotel = cls()
        floor1 = [
            ("101", RoomType.SINGLE),
            ("102", RoomType.DOUBLE),
            ("103", RoomType.DOUBLE),
            ("104", RoomType.SUITE),
            ("105", RoomType.ACCESSIBLE),
        ]
        floor2 = [
            ("201", RoomType.SINGLE),
            ("202", RoomType.DOUBLE),
            ("203", RoomType.DOUBLE),
            ("204", RoomType.SUITE),
            ("205", RoomType.ACCESSIBLE),
        ]
        for num, t in floor1:
            hotel.add_room(Room(num, t, floor=1))
            time.sleep(0.001)  # ensure distinct cleaned_at timestamps
        for num, t in floor2:
            hotel.add_room(Room(num, t, floor=2))
            time.sleep(0.001)
        return hotel

    def snapshot(self) -> dict:
        return {n: r.to_dict() for n, r in self.rooms.items()}
