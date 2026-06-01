from __future__ import annotations

import asyncio
import json
import os
import sys
from typing import Set, Optional
from urllib.parse import parse_qs, urlparse

VALID_TOKEN = os.getenv("HOTELOS_TOKEN", "hotel2024")

import websockets

# Allow running as `python dashboard/server.py` from the python/ dir.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from broker import MessageBroker  # noqa: E402
from housekeeping import HousekeepingService  # noqa: E402
from maintenance import MaintenanceService  # noqa: E402
from models import Hotel  # noqa: E402
from reception import ReceptionService  # noqa: E402
from room_service import RoomServiceService  # noqa: E402


CHANNELS = [
    "reception.check_in",
    "room.vacated",
    "room.cleaning_started",
    "room.cleaned",
    "order.placed",
    "order.status_update",
    "room.charge_added",
    "maintenance.request",
    "maintenance.assigned",
    "maintenance.resolved",
    "dashboard.full_state",
]


class DashboardServer:
    def __init__(self, hotel: Hotel, broker: MessageBroker,
                 host: str = "localhost", port: int = 8765,
                 room_svc: Optional[RoomServiceService] = None,
                 maintenance_svc: Optional[MaintenanceService] = None):
        self._hotel = hotel
        self._broker = broker
        self._host = host
        self._port = port
        self._room_svc = room_svc
        self._maintenance_svc = maintenance_svc
        self._clients: Set = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    @staticmethod
    def _extract_token(websocket) -> str:
        try:
            path = websocket.path
        except AttributeError:
            path = websocket.request.path  # websockets >= 13
        qs = parse_qs(urlparse(path).query)
        return qs.get("token", [""])[0]

    async def _client(self, websocket):
        token = self._extract_token(websocket)
        if token != VALID_TOKEN:
            await websocket.close(1008, "Unauthorized: invalid token")
            return
        # Send snapshot first, then join the broadcast set, so the snapshot
        # is guaranteed to be the very first message the client sees.
        try:
            full = {
                "channel": "dashboard.full_state",
                "data": {
                    "rooms": self._hotel.snapshot(),
                    "orders": self._room_svc.get_active_orders() if self._room_svc else [],
                    "maintenance": self._maintenance_svc.get_active_requests() if self._maintenance_svc else [],
                },
            }
            await websocket.send(json.dumps(full, default=str))
            self._clients.add(websocket)
            async for _ in websocket:
                pass  # we don't accept commands; broadcast-only
        finally:
            self._clients.discard(websocket)

    @staticmethod
    def _sanitise(channel: str, data: dict) -> dict:
        """Strip sensitive fields before broadcasting to all clients."""
        if channel == "room.vacated" and data.get("bill"):
            bill = {k: v for k, v in data["bill"].items() if k != "charge_items"}
            return {**data, "bill": bill}
        return data

    def _on_event(self, channel: str, data: dict) -> None:
        if self._loop is None:
            return
        safe_data = self._sanitise(channel, data)
        payload = json.dumps({"channel": channel, "data": safe_data}, default=str)
        asyncio.run_coroutine_threadsafe(self._broadcast(payload), self._loop)

    async def _broadcast(self, payload: str) -> None:
        if not self._clients:
            return
        await asyncio.gather(
            *[c.send(payload) for c in list(self._clients)],
            return_exceptions=True,
        )

    async def serve(self) -> None:
        self._loop = asyncio.get_running_loop()
        self._broker.subscribe_pattern("*", self._on_event)
        self._broker.start()
        async with websockets.serve(self._client, self._host, self._port):
            print(f"[dashboard] ws://{self._host}:{self._port} ready")
            await asyncio.Future()


def main() -> None:
    hotel = Hotel.standard_layout()
    broker = MessageBroker()
    # Instantiate services so their subscriptions stay active and events fire.
    ReceptionService(hotel, broker)
    HousekeepingService(hotel, broker)
    room_svc = RoomServiceService(hotel, broker)
    maintenance = MaintenanceService(hotel, broker)
    server = DashboardServer(hotel, broker, room_svc=room_svc, maintenance_svc=maintenance)
    try:
        asyncio.run(server.serve())
    except KeyboardInterrupt:
        broker.stop()


if __name__ == "__main__":
    main()
