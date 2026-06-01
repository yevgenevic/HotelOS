"""
maintenance.py — MaintenanceService: priority queue + technician assignment.

Paradigms demonstrated:
  - PROCEDURAL   : submit_request() follows a strict numbered sequence.
  - EVENT-DRIVEN : publishes "maintenance.request" and "maintenance.assigned"
                   so the dashboard updates in real time.
  - OOP          : uses Technician (inherits _WorkerEmployee) and
                   MaintenanceRequest (with __lt__ for heap ordering).

Data structure:
  - self._queue  : Python heapq (min-heap priority queue).
    MaintenanceRequest.__lt__ defines ordering:
      CRITICAL (1) < HIGH (2) < NORMAL (3) < LOW (4)
    Equal priorities resolved by submitted_at (earlier = first).
"""

from __future__ import annotations

import heapq
import threading
import uuid
from typing import Dict, List, Optional, Union

from broker import MessageBroker
from models import Hotel, MaintenancePriority, MaintenanceRequest, Technician


class MaintenanceService:
    """
    Handles fault reports and technician dispatch.

    Priority queue algorithm:
      Incoming requests are pushed onto a min-heap keyed by
      (priority.value, submitted_at).  The most urgent, earliest-submitted
      request is always popped first — satisfying the assignment spec
      (Critical before High before Normal before Low; FIFO within same level).
    """

    def __init__(self, hotel: Hotel, broker: MessageBroker):
        self._hotel       = hotel
        self._broker      = broker

        # Min-heap: MaintenanceRequest.__lt__ provides ordering.
        self._queue:       List[MaintenanceRequest]     = []
        self._queue_lock   = threading.Lock()
        self._assign_lock  = threading.Lock()   # prevents double-assignment race

        self._technicians: List[Technician] = [
            Technician("T1", "Bobur"),
            Technician("T2", "Jahongir"),
        ]
        self._assignments: Dict[str, Technician]         = {}
        self._requests:    Dict[str, MaintenanceRequest] = {}

    @property
    def technicians(self) -> List[Technician]:
        return list(self._technicians)

    @property
    def queue_size(self) -> int:
        with self._queue_lock:
            return len(self._queue)

    def get_active_requests(self) -> list:
        """Return a list of serialized active maintenance requests for the dashboard snapshot."""
        with self._queue_lock:
            result = []
            for req in self._requests.values():
                tech = self._assignments.get(req.request_id)
                result.append({
                    "request_id":  req.request_id,
                    "room_number": req.room_number,
                    "priority":    req.priority.name,
                    "description": req.description,
                    "status":      "ASSIGNED" if tech else "OPEN",
                    "assigned_to": tech.name if tech else None,
                    "submitted_at": req.submitted_at,
                })
            return result

    @staticmethod
    def _coerce_priority(
        value: Union[str, MaintenancePriority],
    ) -> Optional[MaintenancePriority]:
        """Input validation: accept enum or case-insensitive string."""
        if isinstance(value, MaintenancePriority):
            return value
        if isinstance(value, str):
            try:
                return MaintenancePriority[value.upper()]
            except KeyError:
                return None
        return None

    # ---- PROCEDURAL — submit request sequence -----------------------------

    def submit_request(
        self,
        room_number: str,
        priority: Union[str, MaintenancePriority],
        description: str = "",
    ) -> dict:
        """
        PROCEDURAL example — step-by-step fault-report sequence:

          Step 1: Validate priority string → MaintenancePriority enum.
          Step 2: Validate room exists in hotel.
          Step 3: Mark room status as MAINTENANCE (blocks check-in).
          Step 4: Create MaintenanceRequest and push onto priority heap.
          Step 5: Publish "maintenance.request" event for dashboard.
          Step 6: Call assign_next() to dispatch to a free technician.
        """
        # Step 1: Validate priority.
        prio = self._coerce_priority(priority)
        if prio is None:
            return {"ok": False, "error": f"Invalid priority: {priority!r}"}

        # Step 2: Validate room.
        if room_number not in self._hotel.rooms:
            return {"ok": False, "error": f"Unknown room: {room_number}"}

        # Step 3: Block room from new check-ins while under repair.
        self._hotel.rooms[room_number].mark_maintenance()

        # Step 4: Build request and push onto priority heap.
        req = MaintenanceRequest(
            request_id=str(uuid.uuid4())[:8],
            room_number=room_number,
            priority=prio,
            description=description,
        )
        with self._queue_lock:
            heapq.heappush(self._queue, req)       # O(log n) push
            self._requests[req.request_id] = req

        # Step 5: Publish event — dashboard shows ticket immediately.
        self._broker.publish(
            "maintenance.request",
            {
                "request_id":  req.request_id,
                "room_number": room_number,
                "priority":    prio.name,
                "description": description,
            },
        )

        # Step 6: Attempt immediate technician assignment.
        self.assign_next()
        return {"ok": True, "request_id": req.request_id, "priority": prio.name}

    def _next_technician(self) -> Optional[Technician]:
        """Return first available technician, atomically claiming them."""
        for t in self._technicians:
            if t.take_job():
                return t
        return None

    def assign_next(self, request_id: Optional[str] = None) -> Optional[dict]:
        """
        Pop the highest-priority request or a specific request and assign it to a free technician.

        Race-condition protection (relevant to TS-06 / Debug Log XATO-03):
          _assign_lock ensures only one thread can dequeue + assign at a time.
          Without this lock, two simultaneous submit_request() calls could
          both pop the same request from the heap.
        """
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
                if request_id is not None:
                    # Find specific request in queue, remove it and re-heapify
                    target = None
                    for req in self._queue:
                        if req.request_id == request_id:
                            target = req
                            break
                    if target is not None:
                        self._queue.remove(target)
                        heapq.heapify(self._queue)
                        req = target
                    else:
                        technician.release()
                        return None
                else:
                    req = heapq.heappop(self._queue)   # O(log n) pop — highest priority first
            self._assignments[req.request_id] = technician

        # EVENT-DRIVEN: publish assignment so dashboard shows technician name.
        self._broker.publish(
            "maintenance.assigned",
            {
                "request_id":  req.request_id,
                "room_number": req.room_number,
                "technician":  technician.name,
                "priority":    req.priority.name,
            },
        )
        return {"request_id": req.request_id, "technician": technician.name}

    def resolve(self, request_id: str) -> dict:
        """
        Mark a maintenance request as resolved.

        Sequence:
          1. Release the assigned technician.
          2. Mark room DIRTY so Housekeeping cleans it before re-assignment.
          3. Publish "room.vacated" to trigger the housekeeping pipeline.
          4. Publish "maintenance.resolved" for the dashboard.
          5. Attempt to assign next queued request (if any).
        """
        with self._assign_lock:
            technician = self._assignments.pop(request_id, None)
        if technician is None:
            return {"ok": False, "error": "Unknown or unassigned request"}
        technician.release()   # Step 1

        req  = self._requests.pop(request_id, None)
        if req is not None:
            room = self._hotel.rooms.get(req.room_number)
            if room is not None:
                room.mark_dirty()                 # Step 2
                self._broker.publish(             # Step 3
                    "room.vacated",
                    {
                        "room_number": req.room_number,
                        "guest_id":    None,
                        "bill":        None,
                    },
                )

        self._broker.publish(                     # Step 4
            "maintenance.resolved",
            {
                "request_id":  request_id,
                "technician":  technician.name,
                "room_number": req.room_number if req else None,
            },
        )
        self.assign_next()                        # Step 5
        return {"ok": True}
