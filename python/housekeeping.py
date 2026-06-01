"""
housekeeping.py — HousekeepingService: cleaning queue management.

Paradigms demonstrated:
  - EVENT-DRIVEN : subscribes to "room.vacated"; automatically enqueues and
                   starts cleaning without any direct call from ReceptionService.
  - PROCEDURAL   : start_cleaning() follows a strict ordered sequence of steps.
  - OOP          : uses Housekeeper (from models) which inherits _WorkerEmployee.
"""

from __future__ import annotations

import threading
import time
from collections import deque
from typing import Deque, List, Optional

from broker import MessageBroker
from models import Hotel, Housekeeper


class HousekeepingService:
    """
    Manages the room-cleaning pipeline.

    EVENT-DRIVEN design:
      - Subscribes to "room.vacated" at construction time.
      - When Reception publishes that event, _on_room_vacated() fires
        automatically — no polling, no direct call from Reception.
      - After cleaning, publishes "room.cleaned" so the dashboard panel
        updates instantly via WebSocket.

    Data structures:
      - self._queue : collections.deque — FIFO queue of room numbers awaiting
                      cleaning (O(1) append and popleft).
      - self._housekeepers : List[Housekeeper] — pool of workers; each tracked
                             individually for busy/free state.
    """

    def __init__(
        self,
        hotel: Hotel,
        broker: MessageBroker,
        clean_seconds: float = 2.0,
    ):
        self._hotel          = hotel
        self._broker         = broker
        self._clean_seconds  = clean_seconds     # simulated cleaning duration
        self._queue: Deque[str] = deque()        # FIFO: rooms awaiting cleaning
        self._queue_lock     = threading.Lock()

        # Worker pool — 3 housekeepers available simultaneously.
        self._housekeepers: List[Housekeeper] = [
            Housekeeper("H1", "Malika"),
            Housekeeper("H2", "Zulfiya"),
            Housekeeper("H3", "Nodira"),
        ]

        # EVENT-DRIVEN: register handler — fires whenever "room.vacated" arrives.
        self._broker.subscribe("room.vacated", self._on_room_vacated)

    @property
    def housekeepers(self) -> List[Housekeeper]:
        return list(self._housekeepers)

    @property
    def queue_size(self) -> int:
        with self._queue_lock:
            return len(self._queue)

    # ---- EVENT-DRIVEN — event handler -------------------------------------

    def _on_room_vacated(self, data: dict) -> None:
        """
        EVENT-DRIVEN example — full event path:
          1. TRIGGER  : ReceptionService calls room.mark_dirty() then publishes
                        "room.vacated" on the broker.
          2. DELIVERY : Redis Pub/Sub delivers the message to this handler.
          3. REACTION : We enqueue the room number and attempt to start cleaning.

        ReceptionService does not know this method exists.  Decoupling is
        complete: adding a new subscriber (e.g. billing audit) requires zero
        changes to ReceptionService.
        """
        room_number = data.get("room_number")
        if not room_number:
            return
        with self._queue_lock:
            self._queue.append(room_number)
        self.start_cleaning()

    # ---- PROCEDURAL — ordered cleaning sequence ---------------------------

    def _next_available(self) -> Optional[Housekeeper]:
        """Return first free housekeeper, atomically claiming them."""
        for h in self._housekeepers:
            if h.take_job():
                return h
        return None

    def start_cleaning(self) -> None:
        """
        PROCEDURAL example — step-by-step sequence:
          Step 1: Check queue is non-empty.
          Step 2: Claim a free housekeeper (return if none available).
          Step 3: Dequeue the next room number.
          Step 4: Mark room as CLEANING and publish event.
          Step 5: Spawn a background thread to simulate cleaning duration.
        """
        with self._queue_lock:
            if not self._queue:
                return                    # Step 1: nothing to clean

        housekeeper = self._next_available()
        if housekeeper is None:
            return                        # Step 2: all staff busy — retry on next event

        with self._queue_lock:
            if not self._queue:
                housekeeper.release()
                return
            room_number = self._queue.popleft()   # Step 3: FIFO dequeue

        room = self._hotel.rooms.get(room_number)
        if room is None:
            housekeeper.release()
            return

        room.mark_cleaning()              # Step 4a: update room state
        self._broker.publish(             # Step 4b: notify dashboard
            "room.cleaning_started",
            {"room_number": room.number, "housekeeper": housekeeper.name},
        )
        threading.Thread(                 # Step 5: non-blocking background task
            target=self._perform_clean,
            args=(room, housekeeper),
            daemon=True,
        ).start()

    def _perform_clean(self, room, housekeeper: Housekeeper) -> None:
        """
        Runs in a background thread — simulates physical cleaning time.
        On completion, marks room CLEAN and publishes "room.cleaned" so the
        WebSocket dashboard panel updates without any manual refresh (TS-03).
        """
        try:
            time.sleep(self._clean_seconds)    # simulate cleaning duration
            room.mark_clean()
            # EVENT-DRIVEN: publish completion — dashboard reacts via WebSocket.
            self._broker.publish(
                "room.cleaned",
                {"room_number": room.number, "housekeeper": housekeeper.name},
            )
        finally:
            housekeeper.release()   # always free worker even if an error occurs

        # Drain any rooms that queued up while this worker was busy.
        self.start_cleaning()
