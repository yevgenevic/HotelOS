# HotelOS — Real-Time Hotel Management System

**BTEC Unit 4: Programming | Assignment: HotelOS**

A real-time hotel operations platform built with a microservices architecture,
Redis Pub/Sub message broker, and a WebSocket-powered live dashboard.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    HotelOS System                        │
│                                                          │
│  ┌──────────────┐   ┌─────────────────────────────────┐ │
│  │   Frontend   │   │         Python Backend           │ │
│  │  React + Vite│◄──│  ┌──────────┐ ┌──────────────┐  │ │
│  │  WebSocket   │   │  │Reception │ │  Housekeeping │  │ │
│  │  Dashboard   │   │  │ Service  │ │   Service     │  │ │
│  └──────────────┘   │  └────┬─────┘ └──────┬───────┘  │ │
│                     │       │               │           │ │
│                     │  ┌────▼───────────────▼───────┐  │ │
│                     │  │    Redis Pub/Sub Broker     │  │ │
│                     │  └────┬───────────────┬───────┘  │ │
│                     │       │               │           │ │
│                     │  ┌────▼─────┐ ┌──────▼───────┐   │ │
│                     │  │  Room    │ │ Maintenance  │   │ │
│                     │  │ Service  │ │   Service    │   │ │
│                     │  └──────────┘ └──────────────┘   │ │
│                     │                                   │ │
│                     │  ┌─────────────────────────────┐  │ │
│                     │  │  WebSocket Dashboard Server  │  │ │
│                     │  │     ws://localhost:8765      │  │ │
│                     │  └─────────────────────────────┘  │ │
│                     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer            | Technology              | Reason                                   |
|------------------|-------------------------|------------------------------------------|
| Backend language | Python 3.10+            | Clear OOP, readable, rich stdlib         |
| Message broker   | Redis Pub/Sub           | Zero-config, low latency, reliable fanout|
| Real-time push   | WebSocket (websockets)  | Native browser support, bidirectional    |
| REST API         | FastAPI + SQLAlchemy    | Auto-docs, JWT auth, async-ready         |
| Frontend         | React 18 + Vite + Tailwind | Component model maps to dashboard panels |
| Auth             | JWT + bcrypt            | Stateless tokens, safe password hashing  |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+ (frontend only)
- Redis running on `localhost:6379`

### Run the demo (8 test scenarios, no frontend needed)

```bash
cd python
pip install -r requirements.txt
python run_demo.py
```

### Run the live dashboard (backend + frontend)

**Terminal 1 — Backend WebSocket server:**
```bash
cd python
pip install -r requirements.txt
python dashboard/server.py
```

**Terminal 2 — Frontend dev server:**
```bash
npm install
npm run dev
```

Open `http://localhost:5173` → enter token `hotel2024` → live dashboard.

### Run the REST API

```bash
cd python
uvicorn api.main:app --reload
```

API docs at `http://localhost:8000/docs`

---

## Test Scenarios (TS-01 → TS-08)

| ID    | Scenario                                      | Expected behaviour                                  |
|-------|-----------------------------------------------|-----------------------------------------------------|
| TS-01 | Floor-2 DOUBLE check-in                       | Assigns longest-clean Double on floor 2             |
| TS-02 | Check-out room 102 + bill calculation         | Bill = nights × rate + charges; room → DIRTY        |
| TS-03 | Housekeeping cleans room 102                  | Room → CLEANING → CLEAN; dashboard updates via WS   |
| TS-04 | Room 101 orders 2×coffee + 1×sandwich         | Order pipeline; charge added to bill after delivery |
| TS-05 | CRITICAL maintenance for room 105             | Pushed to front of priority queue; tech assigned    |
| TS-06 | Two simultaneous SUITE check-ins              | No double-booking; allocation_lock serialises       |
| TS-07 | All SUITEs occupied — third guest requests    | Clean "No rooms available" error, no crash          |
| TS-08 | Invalid room type "PENTHOUSE"                 | Validation error; system stays healthy              |

---

## Broker Channels

| Channel                  | Publisher          | Subscriber(s)                     |
|--------------------------|--------------------|-----------------------------------|
| `reception.check_in`     | ReceptionService   | DashboardServer                   |
| `room.vacated`           | ReceptionService   | HousekeepingService, Dashboard    |
| `room.cleaning_started`  | HousekeepingService| DashboardServer                   |
| `room.cleaned`           | HousekeepingService| ReceptionService, Dashboard       |
| `order.placed`           | RoomServiceService | DashboardServer                   |
| `order.status_update`    | RoomServiceService | DashboardServer                   |
| `room.charge_added`      | RoomServiceService | ReceptionService, Dashboard       |
| `maintenance.request`    | MaintenanceService | DashboardServer                   |
| `maintenance.assigned`   | MaintenanceService | DashboardServer                   |
| `maintenance.resolved`   | MaintenanceService | DashboardServer                   |
| `dashboard.full_state`   | DashboardServer    | WebSocket clients (on connect)    |

---

## Git Log

```
e2c0c25 Project update
ed74575 first commit
9d79f62 docs: embed git log --oneline in README
10bf05d docs: project + backend READMEs, env config, assignment brief
6c32a3b feat(frontend): live data hook (WS adapter + mock fallback)
288f12e feat(frontend): panel UI components with 3D tilt room cards
64b6780 test(backend): TS-01..TS-08 scenario demo + dashboard smoke
52c2c67 feat(backend): WebSocket dashboard fan-out + run_dashboard
f60249c feat(backend): maintenance service (priority queue)
e9e7ae0 feat(backend): room service (async order pipeline)
69a4e33 feat(backend): housekeeping service (cleaning queue)
ac8332b feat(backend): reception service (check-in, check-out, billing)
c3f16c4 feat(backend): add domain models (Hotel, Room, Guest, enums)
9cdce23 feat(backend): add Redis Pub/Sub message broker
364a064 chore: scaffold Vite + React + Tailwind project
```
