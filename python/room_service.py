"""
room_service.py — RoomServiceService: menu orders and delivery pipeline.

Paradigms demonstrated:
  - PROCEDURAL   : _process_order() executes a strict timed sequence of status
                   transitions (Received → Preparing → Delivering → Delivered).
  - EVENT-DRIVEN : each status change is published as a broker event so the
                   dashboard panel updates in real time without polling.
  - OOP          : RoomServiceService encapsulates menu, order store, and staff.

Data structures:
  - MENU          : Dict[str, float] — O(1) price lookup by item name.
  - self._orders  : Dict[str, RoomServiceOrder] — order store keyed by order_id.
"""

from __future__ import annotations

import threading
import time
import uuid
from typing import Dict, Iterable, List

from broker import MessageBroker
from models import Hotel, OrderItem, OrderStatus, RoomServiceOrder, RoomServiceStaff


# Named constants: centralised menu avoids magic strings in caller code.
MENU: Dict[str, float] = {
    "coffee":   4.50,
    "tea":      3.00,
    "sandwich": 8.00,
    "burger":  12.00,
    "water":    2.00,
    "juice":    5.00,
}


class RoomServiceService:
    """
    Accepts food/drink orders and processes them through a delivery pipeline.

    EVENT-DRIVEN design:
      Each step of the pipeline publishes a broker event:
        "order.placed"        → dashboard adds order card
        "order.status_update" → dashboard updates card status in real time
        "room.charge_added"   → room bill updated after delivery

    The caller (or test runner) does not manage pipeline timing — the
    background thread drives the transitions automatically.
    """

    def __init__(
        self,
        hotel: Hotel,
        broker: MessageBroker,
        prep_seconds:      float = 1.0,
        deliver_seconds:   float = 2.0,
        finalize_seconds:  float = 1.0,
    ):
        self._hotel     = hotel
        self._broker    = broker
        self._prep      = prep_seconds
        self._deliver   = deliver_seconds
        self._finalize  = finalize_seconds
        self._orders:   Dict[str, RoomServiceOrder] = {}
        self._staff     = RoomServiceStaff("RS1", "Dilshod")
        self._lock      = threading.Lock()

    @property
    def menu(self) -> Dict[str, float]:
        return dict(MENU)

    def place_order(self, room_number: str, items: Iterable) -> dict:
        """
        Validate and register a room-service order.

        Input validation:
          - room_number must exist in the hotel.
          - Each item name must appear in MENU (unknown items rejected cleanly).
        """
        if room_number not in self._hotel.rooms:
            return {"ok": False, "error": f"Unknown room: {room_number}"}

        order_items: List[OrderItem] = []
        for entry in items:
            if isinstance(entry, dict):
                name = entry.get("name")
                qty  = int(entry.get("quantity", 1))
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

        # EVENT-DRIVEN: publish so dashboard shows the new order immediately.
        self._broker.publish(
            "order.placed",
            {
                "order_id":    order.order_id,
                "room_number": room_number,
                "items": [
                    {
                        "name":       i.name,
                        "quantity":   i.quantity,
                        "unit_price": i.unit_price,
                        "total":      i.total,
                    }
                    for i in order_items
                ],
                "total":  order.total,
                "status": order.status.value,
            },
        )
        self._publish_status(order)

        # Start pipeline in background thread so caller returns immediately.
        threading.Thread(
            target=self._process_order,
            args=(order,),
            daemon=True,
        ).start()
        return {"ok": True, "order_id": order.order_id, "total": order.total}

    def _publish_status(self, order: RoomServiceOrder) -> None:
        """Publish current order status — called after each pipeline step."""
        self._broker.publish(
            "order.status_update",
            {
                "order_id":    order.order_id,
                "room_number": order.room_number,
                "status":      order.status.value,
                "total":       order.total,
            },
        )

    def _process_order(self, order: RoomServiceOrder) -> None:
        """
        PROCEDURAL example — delivery pipeline sequence:

          Step 1: Wait prep time  → set status PREPARING  → publish event.
          Step 2: Wait deliver time → set status DELIVERING → publish event.
          Step 3: Wait finalize time → set status DELIVERED → publish event.
          Step 4: Add charge to room bill → publish "room.charge_added".

        Each status change triggers a dashboard update via WebSocket (TS-04).
        """
        # Step 1: Preparation phase.
        time.sleep(self._prep)
        order.status = OrderStatus.PREPARING
        self._publish_status(order)

        # Step 2: Delivery phase.
        time.sleep(self._deliver)
        order.status = OrderStatus.DELIVERING
        self._publish_status(order)

        # Step 3: Completion phase.
        time.sleep(self._finalize)
        order.status = OrderStatus.DELIVERED
        self._publish_status(order)

        # Step 4: Apply charge to the guest's room bill.
        room = self._hotel.rooms.get(order.room_number)
        if room is not None:
            room.add_charge(order.total)
            # EVENT-DRIVEN: ReceptionService subscribed to this; charge appears
            # in the bill when the guest checks out (TS-04).
            self._broker.publish(
                "room.charge_added",
                {
                    "room_number": order.room_number,
                    "amount":      order.total,
                    "reason":      "room_service",
                    "order_id":    order.order_id,
                },
            )
