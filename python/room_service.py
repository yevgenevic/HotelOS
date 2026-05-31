from __future__ import annotations

import threading
import time
import uuid
from typing import Dict, Iterable, List

from broker import MessageBroker
from models import (
    Hotel,
    OrderItem,
    OrderStatus,
    RoomServiceOrder,
    RoomServiceStaff,
)


MENU: Dict[str, float] = {
    "coffee": 4.50,
    "tea": 3.00,
    "sandwich": 8.00,
    "burger": 12.00,
    "water": 2.00,
    "juice": 5.00,
}


class RoomServiceService:
    def __init__(
        self,
        hotel: Hotel,
        broker: MessageBroker,
        prep_seconds: float = 1.0,
        deliver_seconds: float = 2.0,
        finalize_seconds: float = 1.0,
    ):
        self._hotel = hotel
        self._broker = broker
        self._prep = prep_seconds
        self._deliver = deliver_seconds
        self._finalize = finalize_seconds
        self._orders: Dict[str, RoomServiceOrder] = {}
        self._staff = RoomServiceStaff("RS1", "Dilshod")
        self._lock = threading.Lock()

    @property
    def menu(self) -> Dict[str, float]:
        return dict(MENU)

    def place_order(self, room_number: str, items: Iterable) -> dict:
        if room_number not in self._hotel.rooms:
            return {"ok": False, "error": f"Unknown room: {room_number}"}

        order_items: List[OrderItem] = []
        for entry in items:
            if isinstance(entry, dict):
                name = entry.get("name")
                qty = int(entry.get("quantity", 1))
            else:
                name, qty = entry[0], int(entry[1])
            if name not in MENU:
                return {"ok": False, "error": f"Unknown menu item: {name}"}
            order_items.append(OrderItem(name=name, quantity=qty, unit_price=MENU[name]))

        order = RoomServiceOrder(
            order_id=str(uuid.uuid4())[:8],
            room_number=room_number,
            items=order_items,
        )
        with self._lock:
            self._orders[order.order_id] = order

        self._broker.publish(
            "order.placed",
            {
                "order_id": order.order_id,
                "room_number": room_number,
                "items": [
                    {
                        "name": i.name,
                        "quantity": i.quantity,
                        "unit_price": i.unit_price,
                        "total": i.total,
                    }
                    for i in order_items
                ],
                "total": order.total,
                "status": order.status.value,
            },
        )
        self._publish_status(order)
        threading.Thread(
            target=self._process_order, args=(order,), daemon=True
        ).start()
        return {"ok": True, "order_id": order.order_id, "total": order.total}

    def _publish_status(self, order: RoomServiceOrder) -> None:
        self._broker.publish(
            "order.status_update",
            {
                "order_id": order.order_id,
                "room_number": order.room_number,
                "status": order.status.value,
                "total": order.total,
            },
        )

    def _process_order(self, order: RoomServiceOrder) -> None:
        time.sleep(self._prep)
        order.status = OrderStatus.PREPARING
        self._publish_status(order)

        time.sleep(self._deliver)
        order.status = OrderStatus.DELIVERING
        self._publish_status(order)

        time.sleep(self._finalize)
        order.status = OrderStatus.DELIVERED
        self._publish_status(order)

        room = self._hotel.rooms.get(order.room_number)
        if room is not None:
            room.add_charge(order.total)
            self._broker.publish(
                "room.charge_added",
                {
                    "room_number": order.room_number,
                    "amount": order.total,
                    "reason": "room_service",
                    "order_id": order.order_id,
                },
            )
