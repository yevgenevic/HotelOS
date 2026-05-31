"""HotelOS demo runner. Executes 8 test scenarios end-to-end against Redis."""
from __future__ import annotations

import sys
import threading
import time
from typing import Callable, List, Tuple

from broker import MessageBroker
from housekeeping import HousekeepingService
from maintenance import MaintenanceService
from models import Hotel, MaintenancePriority, RoomStatus, RoomType
from reception import ReceptionService
from room_service import RoomServiceService


class TestRun:
    def __init__(self) -> None:
        self.passed: List[str] = []
        self.failed: List[Tuple[str, str]] = []

    def case(self, name: str, fn: Callable[[], None]) -> None:
        print(f"\n--- {name} ---")
        try:
            fn()
        except AssertionError as exc:
            print(f"  FAIL: {exc}")
            self.failed.append((name, str(exc)))
            return
        except Exception as exc:
            print(f"  ERROR: {type(exc).__name__}: {exc}")
            self.failed.append((name, f"{type(exc).__name__}: {exc}"))
            return
        print(f"  PASS")
        self.passed.append(name)

    def summary(self) -> bool:
        total = len(self.passed) + len(self.failed)
        print("\n" + "=" * 60)
        print(f"  RESULT: {len(self.passed)}/{total} passed")
        print("=" * 60)
        for n in self.passed:
            print(f"  [PASS] {n}")
        for n, err in self.failed:
            print(f"  [FAIL] {n} :: {err}")
        print("=" * 60)
        return not self.failed


def wait_until(predicate: Callable[[], bool], timeout: float = 5.0, step: float = 0.05) -> bool:
    deadline = time.time() + timeout
    while time.time() < deadline:
        if predicate():
            return True
        time.sleep(step)
    return predicate()


def build_system():
    hotel = Hotel.standard_layout()
    broker = MessageBroker()
    reception = ReceptionService(hotel, broker)
    housekeeping = HousekeepingService(hotel, broker)
    room_service = RoomServiceService(hotel, broker)
    maintenance = MaintenanceService(hotel, broker)
    broker.start()
    return hotel, broker, reception, housekeeping, room_service, maintenance


def main() -> int:
    print("HotelOS demo starting...")
    try:
        hotel, broker, reception, housekeeping, room_service, maintenance = build_system()
    except Exception as exc:
        print(f"[FATAL] Could not initialise system: {exc}")
        print("Hint: ensure Redis is running on localhost:6379")
        return 2

    runs = TestRun()

    # --- TS-01: floor-2 double check-in ---------------------------------
    def ts01() -> None:
        result = reception.check_in("Alice", RoomType.DOUBLE, floor_preference=2)
        assert result["ok"], f"check-in failed: {result}"
        room_no = result["room_number"]
        assert room_no in {"202", "203"}, f"expected 202/203, got {room_no}"
        assert hotel.rooms[room_no].status == RoomStatus.OCCUPIED
        print(f"  Alice -> room {room_no}")
    runs.case("TS-01 check-in floor 2 double", ts01)

    # --- TS-02: check-out 102 with bill ---------------------------------
    def ts02() -> None:
        ci = reception.check_in("Bob", RoomType.DOUBLE)
        assert ci["ok"], f"check-in failed: {ci}"
        assert ci["room_number"] == "102", (
            f"expected oldest-clean DOUBLE = 102, got {ci['room_number']}"
        )
        # Backdate to simulate a 2-night stay and add an incidental charge.
        ci["guest"].check_in_date = time.time() - 2 * 86400
        hotel.rooms["102"].add_charge(15.0)
        out = reception.check_out("102")
        assert out["ok"], f"check-out failed: {out}"
        bill = out["bill"]
        assert bill["nights"] == 2, f"nights={bill['nights']}"
        assert bill["room_rate"] == 120.0, f"rate={bill['room_rate']}"
        assert bill["room_total"] == 240.0, f"room_total={bill['room_total']}"
        assert bill["room_charges"] == 15.0, f"room_charges={bill['room_charges']}"
        assert bill["grand_total"] == 255.0, f"grand_total={bill['grand_total']}"
        print(f"  Bob check-out: nights={bill['nights']} total=${bill['grand_total']}")
    runs.case("TS-02 check-out 102 + bill", ts02)

    # --- TS-03: housekeeping clean cycle --------------------------------
    def ts03() -> None:
        ok = wait_until(
            lambda: hotel.rooms["102"].status == RoomStatus.CLEAN, timeout=5.0
        )
        assert ok, f"room 102 status still {hotel.rooms['102'].status}"
        assert hotel.rooms["102"].guest is None
        print(f"  Room 102 cleaned, available again")
    runs.case("TS-03 housekeeping cleans 102", ts03)

    # --- TS-04: room service order --------------------------------------
    def ts04() -> None:
        ci = reception.check_in("Carol", RoomType.SINGLE)
        assert ci["ok"], f"check-in failed: {ci}"
        assert ci["room_number"] == "101", f"expected 101, got {ci['room_number']}"
        order = room_service.place_order("101", [("coffee", 2), ("sandwich", 1)])
        assert order["ok"], f"order failed: {order}"
        expected = 2 * 4.50 + 8.00  # 17.00
        assert abs(order["total"] - expected) < 0.01, f"order total={order['total']}"
        ok = wait_until(lambda: len(hotel.rooms["101"].charges) > 0, timeout=6.0)
        assert ok, "no charge applied to 101"
        charges = hotel.rooms["101"].charges
        assert len(charges) == 1, f"charges={charges}"
        assert abs(charges[0] - 17.0) < 0.01, f"charge={charges[0]}"
        print(f"  Carol ordered 2x coffee + 1x sandwich = ${charges[0]}")
    runs.case("TS-04 room service order + charge", ts04)

    # --- TS-05: maintenance CRITICAL request ---------------------------
    def ts05() -> None:
        captured = {}
        evt = threading.Event()

        def cap(data: dict) -> None:
            captured.update(data)
            evt.set()

        broker.subscribe("maintenance.assigned", cap)
        # Use room 105 (Accessible, floor 1) — not needed by any later test.
        res = maintenance.submit_request(
            "105", MaintenancePriority.CRITICAL, description="AC broken"
        )
        assert res["ok"], f"submit failed: {res}"
        assert evt.wait(timeout=2.0), "no maintenance.assigned event received"
        assert captured.get("room_number") == "105"
        assert captured.get("priority") == "CRITICAL"
        assert captured.get("technician") in {"Bobur", "Jahongir"}
        assert hotel.rooms["105"].status == RoomStatus.MAINTENANCE, (
            f"expected MAINTENANCE, got {hotel.rooms['105'].status}"
        )
        print(
            f"  Maintenance for 105 assigned to {captured['technician']} (CRITICAL)"
            f" | room status: {hotel.rooms['105'].status.value}"
        )
    runs.case("TS-05 maintenance CRITICAL 105", ts05)

    # --- TS-06: simultaneous check-ins, same type ----------------------
    def ts06() -> None:
        results: List[dict] = []
        results_lock = threading.Lock()

        def attempt(name: str) -> None:
            r = reception.check_in(name, RoomType.SUITE)
            with results_lock:
                results.append(r)

        t1 = threading.Thread(target=attempt, args=("Dave",))
        t2 = threading.Thread(target=attempt, args=("Eve",))
        t1.start(); t2.start()
        t1.join(); t2.join()

        oks = [r for r in results if r["ok"]]
        assert len(oks) == 2, f"both should succeed: {results}"
        rooms = {r["room_number"] for r in oks}
        assert rooms == {"104", "204"}, f"expected 104 & 204, got {rooms}"
        print(f"  Dave & Eve -> {sorted(rooms)} (no double-booking)")
    runs.case("TS-06 simultaneous check-ins", ts06)

    # --- TS-07: all rooms of type occupied -----------------------------
    def ts07() -> None:
        # Both suites now occupied from TS-06.
        res = reception.check_in("Frank", RoomType.SUITE)
        assert not res["ok"], f"check-in unexpectedly succeeded: {res}"
        assert "available" in res["error"].lower(), f"unexpected error: {res['error']}"
        print(f"  Frank rejected: {res['error']}")
    runs.case("TS-07 all suites occupied", ts07)

    # --- TS-08: invalid room type --------------------------------------
    def ts08() -> None:
        res = reception.check_in("Grace", "PENTHOUSE")
        assert not res["ok"], f"should have errored: {res}"
        assert "invalid" in res["error"].lower(), f"unexpected error: {res['error']}"
        # Service must remain healthy after a bad input.
        sanity = reception.check_in("Helen", RoomType.ACCESSIBLE)
        assert sanity["ok"], f"system unhealthy after bad input: {sanity}"
        print(f"  Grace rejected: {res['error']} (system still healthy)")
    runs.case("TS-08 invalid room type", ts08)

    ok = runs.summary()
    try:
        broker.stop()
    except Exception:
        pass
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
