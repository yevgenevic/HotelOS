# HotelOS — Real-Time Hotel Management System

HotelOS is a real-time, comprehensive hotel operations platform built with a microservices-inspired architecture, Redis Pub/Sub message broker, and a WebSocket-powered live React dashboard. It enables real-time synchronization of operations across various hotel departments including Reception, Housekeeping, Room Service, and Maintenance.

This project was originally built for **BTEC Unit 4: Programming | Assignment**.

![HotelOS Dashboard](https://img.shields.io/badge/Status-Active-success)
![Python Backend](https://img.shields.io/badge/Backend-Python%203.10%2B-blue)
![Frontend](https://img.shields.io/badge/Frontend-React%2018%20%7C%20Vite-cyan)
![Broker](https://img.shields.io/badge/Message%20Broker-Redis%20Pub%2FSub-red)

---

## 🌟 Features

- **Reception Service:** Handle check-ins, check-outs, and intelligent room allocations. Calculates final billing with room charges automatically.
- **Housekeeping Service:** Tracks dirty rooms, assigns housekeepers via a cleaning queue, and alerts reception when a room is ready.
- **Room Service:** Asynchronous order pipeline. Guests can order food/drinks, and room service can update order statuses. Charges are automatically posted to the guest's room bill.
- **Maintenance Service:** Priority queue-based system for handling room issues (e.g., critical AC failure vs standard lightbulb change). Dispatches available technicians efficiently.
- **Real-Time Dashboard:** A responsive, interactive React front-end dashboard that connects to a WebSocket server to reflect real-time updates as events happen across the hotel.
- **Role-Based Views:** Dashboard interface changes dynamically based on the role (Receptionist, Housekeeper, Room Service, Technician, Admin).

---

## 🏗️ Architecture Overview

HotelOS employs a decoupled architecture where backend services communicate via Redis Pub/Sub, ensuring that components remain independent and scalable.

```text
┌─────────────────────────────────────────────────────────┐
│                    HotelOS System                       │
│                                                         │
│  ┌──────────────┐   ┌─────────────────────────────────┐ │
│  │   Frontend   │   │         Python Backend          │ │
│  │  React + Vite│◄──│  ┌──────────┐ ┌──────────────┐  │ │
│  │  WebSocket   │   │  │Reception │ │ Housekeeping │  │ │
│  │  Dashboard   │   │  │ Service  │ │   Service    │  │ │
│  └──────────────┘   │  └────┬─────┘ └──────┬───────┘  │ │
│                     │       │              │          │ │
│                     │  ┌────▼──────────────▼───────┐  │ │
│                     │  │   Redis Pub/Sub Broker    │  │ │
│                     │  └────┬──────────────┬───────┘  │ │
│                     │       │              │          │ │
│                     │  ┌────▼─────┐ ┌──────▼───────┐  │ │
│                     │  │   Room   │ │ Maintenance  │  │ │
│                     │  │ Service  │ │   Service    │  │ │
│                     │  └──────────┘ └──────────────┘  │ │
│                     │                                 │ │
│                     │  ┌─────────────────────────────┐│ │
│                     │  │ WebSocket Dashboard Server  ││ │
│                     │  │     ws://localhost:8765     ││ │
│                     │  └─────────────────────────────┘│ │
│                     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 💻 Tech Stack

| Layer            | Technology                 | Reason                                       |
|------------------|----------------------------|----------------------------------------------|
| **Backend**      | Python 3.10+               | Clear OOP, readable, robust async libraries  |
| **Broker**       | Redis Pub/Sub              | Zero-config, low latency, reliable fan-out   |
| **Real-time Push**| WebSocket (`websockets`)  | Native browser support, bidirectional push   |
| **API**          | FastAPI + SQLAlchemy       | Auto-docs, JWT auth, async-ready             |
| **Frontend**     | React 18 + Vite + Tailwind | Performant component model mapping to panels |
| **Auth**         | JWT + bcrypt               | Stateless tokens, safe password hashing      |

---

## 🚀 Quick Start

### Prerequisites
- **Python:** 3.10+
- **Node.js:** 18+ (for frontend)
- **Redis:** Running locally on `localhost:6379` (e.g., via Docker: `docker run -p 6379:6379 -d redis`)

### Option 1: Run the Backend Demo (No Frontend Required)
Run the automated test scenarios to see the backend systems working together in the terminal.

```bash
cd python
pip install -r requirements.txt
python run_demo.py
```

### Option 2: Run the Live Dashboard
Launch the full stack with real-time sync.

**1. Start the Backend WebSocket server:**
```bash
cd python
pip install -r requirements.txt
python dashboard/server.py
```

**2. Start the Frontend dev server:**
```bash
# In a new terminal tab at the project root
npm install
npm run dev
```
Open `http://localhost:5173` in your browser. Enter the token `hotel2024` to access the live dashboard.

### Option 3: Run the REST API
If you want to interact with the FastAPI backend:

```bash
cd python
pip install -r requirements.txt
uvicorn api.main:app --reload
```
API documentation will be available at `http://localhost:8000/docs`.

---

## 🧪 Test Scenarios (Demo)

The `run_demo.py` script automatically runs the following scenarios to validate system integrity:

| ID    | Scenario Description                          | Expected Behaviour                                  |
|-------|-----------------------------------------------|-----------------------------------------------------|
| **TS-01** | Floor-2 DOUBLE check-in                       | Assigns the longest-clean Double room on floor 2.   |
| **TS-02** | Check-out room 102 + bill calculation         | Calculates bill (nights × rate + charges); room → DIRTY. |
| **TS-03** | Housekeeping cleans room 102                  | Room → CLEANING → CLEAN; dashboard updates via WS.  |
| **TS-04** | Room 101 orders 2× coffee + 1× sandwich       | Order pipeline updates; charge is added to room bill upon delivery. |
| **TS-05** | CRITICAL maintenance for room 105             | Pushed to the front of the priority queue; technician assigned immediately. |
| **TS-06** | Two simultaneous SUITE check-ins              | No double-booking occurs; `allocation_lock` correctly serialises the requests. |
| **TS-07** | All SUITEs occupied — third guest requests    | Graceful rejection with "No rooms available" error; no system crash. |
| **TS-08** | Invalid room type "PENTHOUSE" requested       | System catches validation error; application remains healthy. |

---

## 📡 Broker Channels

The Redis Pub/Sub channels used for cross-service communication:

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
| `dashboard.full_state`   | DashboardServer    | WebSocket clients (on connection) |

---

## 📄 License

This project is open-source. Feel free to use it for educational purposes or as a starting point for building real-time dashboard applications.
