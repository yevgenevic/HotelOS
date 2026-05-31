from __future__ import annotations

import heapq
import threading
import uuid
from typing import Dict, List, Optional, Union

from broker import MessageBroker
from models import Hotel, MaintenancePriority, MaintenanceRequest, Technician


class MaintenanceService:
    def __init__(self, hotel: Hotel, broker: MessageBroker):
        self._hotel = hotel
        self._broker = broker
        self._queue: List[MaintenanceRequest] = []
        self._queue_lock = threading.Lock()
        self._assign_lock = threading.Lock()
        self._technicians: List[Technician] = [
            Technician("T1", "Bobur"),
            Technician("T2", "Jahongir"),
        ]
        self._assignments: Dict[str, Technician] = {}
        self._requests: Dict[str, MaintenanceRequest] = {}

    @property
    def technicians(self) -> List[Technician]:
        return list(self._technicians)

    @property
    def queue_size(self) -> int:
        with self._queue_lock:
            return len(self._queue)

    @staticmethod
    def _coerce_priority(
        value: Union[str, MaintenancePriority]
    ) -> Optional[MaintenancePriority]:
        if isinstance(value, MaintenancePriority):
            return value
        if isinstance(value, str):
            try:
                return MaintenancePriority[value.upper()]
            except KeyError:
                return None
        return None

    def submit_request(
        self,
        room_number: str,
        priority: Union[str, MaintenancePriority],
        description: str = "",
    ) -> dict:
        prio = self._coerce_priority(priority)
        if prio is None:
            return {"ok": False, "error": f"Invalid priority: {priority!r}"}
        if room_number not in self._hotel.rooms:
            return {"ok": False, "error": f"Unknown room: {room_number}"}

        req = MaintenanceRequest(
            request_id=str(uuid.uuid4())[:8],
            room_number=room_number,
            priority=prio,
            description=description,
        )
        with self._queue_lock:
            heapq.heappush(self._queue, req)
            self._requests[req.request_id] = req

        self._broker.publish(
            "maintenance.request",
            {
                "request_id": req.request_id,
                "room_number": room_number,
                "priority": prio.name,
                "description": description,
            },
        )
        self.assign_next()
        return {"ok": True, "request_id": req.request_id, "priority": prio.name}

    def _next_technician(self) -> Optional[Technician]:
        for t in self._technicians:
            if t.take_job():
                return t
        return None

    def assign_next(self) -> Optional[dict]:
        with self._assign_lock:
            with self._queue_lock:
                if not self._queue:
                    return None
            technician = self._next_technician()
            if technician is None:
                return None
            with self._queue_lock:
                if not self._queue:
                    technician.release()
                    return None
                req = heapq.heappop(self._queue)
            self._assignments[req.request_id] = technician

        self._broker.publish(
            "maintenance.assigned",
            {
                "request_id": req.request_id,
                "room_number": req.room_number,
                "technician": technician.name,
                "priority": req.priority.name,
            },
        )
        return {"request_id": req.request_id, "technician": technician.name}

    def resolve(self, request_id: str) -> dict:
        with self._assign_lock:
            technician = self._assignments.pop(request_id, None)
        if technician is None:
            return {"ok": False, "error": "Unknown or unassigned request"}
        technician.release()
        self._broker.publish(
            "maintenance.resolved",
            {"request_id": request_id, "technician": technician.name},
        )
        self.assign_next()
        return {"ok": True}
