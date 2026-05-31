from __future__ import annotations

import threading
import time
from collections import deque
from typing import Deque, List, Optional

from broker import MessageBroker
from models import Hotel, Housekeeper


class HousekeepingService:
    def __init__(self, hotel: Hotel, broker: MessageBroker, clean_seconds: float = 2.0):
        self._hotel = hotel
        self._broker = broker
        self._clean_seconds = clean_seconds
        self._queue: Deque[str] = deque()
        self._queue_lock = threading.Lock()
        self._housekeepers: List[Housekeeper] = [
            Housekeeper("H1", "Malika"),
            Housekeeper("H2", "Zulfiya"),
            Housekeeper("H3", "Nodira"),
        ]
        self._broker.subscribe("room.vacated", self._on_room_vacated)

    @property
    def housekeepers(self) -> List[Housekeeper]:
        return list(self._housekeepers)

    @property
    def queue_size(self) -> int:
        with self._queue_lock:
            return len(self._queue)

    def _on_room_vacated(self, data: dict) -> None:
        room_number = data.get("room_number")
        if not room_number:
            return
        with self._queue_lock:
            self._queue.append(room_number)
        self.start_cleaning()

    def _next_available(self) -> Optional[Housekeeper]:
        for h in self._housekeepers:
            if h.take_job():
                return h
        return None

    def start_cleaning(self) -> None:
        with self._queue_lock:
            if not self._queue:
                return
        housekeeper = self._next_available()
        if housekeeper is None:
            return  # all busy — will retry when one finishes
        with self._queue_lock:
            if not self._queue:
                housekeeper.release()
                return
            room_number = self._queue.popleft()

        room = self._hotel.rooms.get(room_number)
        if room is None:
            housekeeper.release()
            return

        room.mark_cleaning()
        self._broker.publish(
            "room.cleaning_started",
            {"room_number": room.number, "housekeeper": housekeeper.name},
        )
        threading.Thread(
            target=self._perform_clean, args=(room, housekeeper), daemon=True
        ).start()

    def _perform_clean(self, room, housekeeper: Housekeeper) -> None:
        try:
            time.sleep(self._clean_seconds)
            room.mark_clean()
            self._broker.publish(
                "room.cleaned",
                {"room_number": room.number, "housekeeper": housekeeper.name},
            )
        finally:
            housekeeper.release()
        # Drain any pending work.
        self.start_cleaning()
