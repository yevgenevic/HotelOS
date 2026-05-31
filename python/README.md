# HotelOS (Python backend)

In-memory hotel management system. State lives in process memory; Redis is used
solely for Pub/Sub message routing. A WebSocket server fans events out to any
dashboard client that connects.

## Layout

```
python/
  models.py            # entities, enums, dataclasses, Hotel container
  broker.py            # Redis Pub/Sub wrapper (separate pub + sub connections)
  reception.py         # check-in, check-out, bill calculation
  housekeeping.py      # cleaning queue + 3 housekeepers
  room_service.py      # menu, async order pipeline
  maintenance.py       # priority queue + 2 technicians
  dashboard/server.py  # WebSocket fan-out on ws://localhost:8765
  run_demo.py          # 8 scenario tests
  requirements.txt
```

## Requirements

- Python 3.10+
- A reachable Redis at `localhost:6379`
- `pip install -r requirements.txt`  (or `python -m pip install -r requirements.txt`)

## Run the demo

```
python -m pip install -r requirements.txt
python run_demo.py
```

The demo runs eight scenarios:

| ID    | Scenario |
|-------|----------|
| TS-01 | Floor-2 DOUBLE check-in |
| TS-02 | Check-out room 102 + bill calculation |
| TS-03 | Housekeeping cleans room 102 |
| TS-04 | Room 101 orders 2x coffee + 1x sandwich |
| TS-05 | CRITICAL maintenance request for room 204 |
| TS-06 | Two simultaneous SUITE check-ins (no double-booking) |
| TS-07 | All SUITE rooms occupied -> rejection |
| TS-08 | Invalid room type -> graceful error, system healthy |

## Run the dashboard

```
python dashboard/server.py
```

Then connect any WebSocket client to `ws://localhost:8765`. On connect, you get
a `dashboard.full_state` payload; afterwards every Pub/Sub event is fanned out
as `{channel, data}`.

## Channels

```
reception.check_in
room.vacated
room.cleaning_started
room.cleaned
order.placed
order.status_update
room.charge_added
maintenance.request
maintenance.assigned
maintenance.resolved
dashboard.full_state
```
