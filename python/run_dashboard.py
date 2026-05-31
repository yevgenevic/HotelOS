"""Run the dashboard WebSocket server plus a steady stream of demo events
so connected frontends actually see hotel activity in real time.
"""
from __future__ import annotations

import asyncio
import random
import threading
import time

from broker import MessageBroker
from dashboard.server import DashboardServer
from housekeeping import HousekeepingService
from maintenance import MaintenanceService
from models import Hotel, MaintenancePriority, RoomType
from reception import ReceptionService
from room_service import RoomServiceService


GUEST_NAMES = [
    "Aziz Karimov", "Dilnoza Yusupova", "Bobur Aliyev", "Madina Saidova",
    "Jasur Tursunov", "Nilufar Rashidova", "Sardor Umarov", "Kamola Ergasheva",
    "Sofia Rossi", "Aisha Rahman",
]

ISSUES = [
    "Dush suvi oqmayapti", "Wi-Fi uzilib qolmoqda", "Eshik qulfi buzilgan",
    "Lampochka kuygan", "Issiq suv yo'q",
]


def event_driver(reception, room_service_svc, maintenance, hotel) -> None:
    """Generate a steady stream of plausible hotel events."""
    menu_items = list(room_service_svc.menu.keys())
    types = list(RoomType)
    priorities = list(MaintenancePriority)
    time.sleep(2.0)  # let the WebSocket server come up

    while True:
        try:
            roll = random.random()
            occupied = [r.number for r in hotel.rooms.values() if r.guest is not None]

            if roll < 0.4:
                reception.check_in(
                    random.choice(GUEST_NAMES),
                    random.choice(types),
                    floor_preference=random.choice([None, 1, 2]),
                )
            elif roll < 0.65 and occupied:
                room_no = random.choice(occupied)
                item = random.choice(menu_items)
                room_service_svc.place_order(room_no, [(item, random.randint(1, 2))])
            elif roll < 0.82:
                room_no = random.choice(list(hotel.rooms.keys()))
                maintenance.submit_request(
                    room_no, random.choice(priorities), random.choice(ISSUES),
                )
            elif occupied:
                reception.check_out(random.choice(occupied))
        except Exception as exc:
            print(f"[driver] error: {exc!r}")

        time.sleep(random.uniform(2.0, 4.5))


async def main() -> None:
    hotel = Hotel.standard_layout()
    broker = MessageBroker()
    reception = ReceptionService(hotel, broker)
    HousekeepingService(hotel, broker)
    room_svc = RoomServiceService(hotel, broker)
    maintenance = MaintenanceService(hotel, broker)

    server = DashboardServer(hotel, broker)
    threading.Thread(
        target=event_driver,
        args=(reception, room_svc, maintenance, hotel),
        daemon=True,
    ).start()
    print("[run_dashboard] starting — dashboard + demo event driver")
    try:
        await server.serve()
    finally:
        broker.stop()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n[run_dashboard] stopped")
