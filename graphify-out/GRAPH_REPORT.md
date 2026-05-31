# Graph Report - HotelOS  (2026-05-31)

## Corpus Check
- 39 files · ~18,468 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 348 nodes · 755 edges · 26 communities (22 shown, 4 thin omitted)
- Extraction: 67% EXTRACTED · 33% INFERRED · 0% AMBIGUOUS · INFERRED: 250 edges (avg confidence: 0.52)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9d79f62c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]

## God Nodes (most connected - your core abstractions)
1. `MessageBroker` - 51 edges
2. `Hotel` - 45 edges
3. `Room` - 31 edges
4. `ReceptionService` - 30 edges
5. `MaintenanceService` - 27 edges
6. `RoomServiceService` - 25 edges
7. `HousekeepingService` - 24 edges
8. `RoomType` - 19 edges
9. `RoomStatus` - 18 edges
10. `MaintenancePriority` - 14 edges

## Surprising Connections (you probably didn't know these)
- `DashboardServer` --uses--> `MessageBroker`  [INFERRED]
  python/dashboard/server.py → python/broker.py
- `datetime` --uses--> `MessageBroker`  [INFERRED]
  python/reception.py → python/broker.py
- `Guest` --uses--> `MessageBroker`  [INFERRED]
  python/reception.py → python/broker.py
- `MaintenancePriority` --uses--> `MessageBroker`  [INFERRED]
  python/maintenance.py → python/broker.py
- `Hotel` --uses--> `MessageBroker`  [INFERRED]
  python/dashboard/server.py → python/broker.py

## Import Cycles
- 1-file cycle: `python/reception.py -> python/reception.py`

## Communities (26 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.12
Nodes (24): datetime, Guest, Guest, Hotel, In-memory container holding all rooms and a global allocation lock., Receptionist, Room, RoomStatus (+16 more)

### Community 1 - "Community 1"
Cohesion: 0.10
Nodes (34): act(), adaptBackendEnvelope(), addActivity(), chooseRoom(), evAdvanceOrder(), EVENTS, evMaintenance(), evNewOrder() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.11
Nodes (20): DashboardServer, main(), MaintenancePriority, Hotel, int, MessageBroker, str, MaintenanceService (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (14): HandlerFn, Housekeeper, PatternHandlerFn, MessageBroker, bool, int, str, Thin Redis Pub/Sub wrapper with separate pub and sub connections. (+6 more)

### Community 4 - "Community 4"
Cohesion: 0.18
Nodes (12): Enum, OrderItem, OrderStatus, float, RoomServiceOrder, RoomServiceStaff, float, Hotel (+4 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (7): Employee, HotelEntity, bool, int, str, Employee that can be busy/free with a job., _WorkerEmployee

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (19): dependencies, framer-motion, react, react-dom, description, devDependencies, autoprefixer, postcss (+11 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (12): item, money, OrderRow, money, RoomDetailModal(), ORDER_STATUS, ROOM_STATUS, SPRING (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (7): roomRows, SCENARIOS, useMockHotelData(), BuildingIcon(), SparkIcon(), App(), MOBILE_TABS

### Community 9 - "Community 9"
Cohesion: 0.17
Nodes (11): Arxitektura, Buyruqlar, Faqat frontend (mock rejim), Git tarixi (`git log --oneline`), HotelOS — Real Vaqtli Mehmonxona Boshqaruv Tizimi, Ikki ishlash rejimi, Ishga tushirish (to'liq tizim), Loyiha tuzilmasi (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.17
Nodes (6): EventRow, item, TONES, ACTIVITY_TYPE, ActivityIcon(), Icon()

### Community 11 - "Community 11"
Cohesion: 0.18
Nodes (6): base, ICONS, LockIcon(), MoonIcon(), SearchIcon(), SunIcon()

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (6): RoomCard, variants, container, ROOM_STATUS_ORDER, BedIcon(), UserIcon()

### Community 13 - "Community 13"
Cohesion: 0.39
Nodes (4): build_system(), main(), HotelOS demo runner. Executes 8 test scenarios end-to-end against Redis., TestRun

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): Channels, HotelOS (Python backend), Layout, Requirements, Run the dashboard, Run the demo

### Community 15 - "Community 15"
Cohesion: 0.29
Nodes (5): item, MaintenanceRow, PRIORITY, CheckIcon(), WrenchIcon()

### Community 16 - "Community 16"
Cohesion: 0.40
Nodes (4): main(), int, str, Connect to the dashboard WebSocket, print the first N envelopes, exit.

## Knowledge Gaps
- **71 isolated node(s):** `name`, `private`, `version`, `type`, `description` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MessageBroker` connect `Community 3` to `Community 0`, `Community 2`, `Community 4`, `Community 13`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `Room` connect `Community 0` to `Community 4`, `Community 5`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Why does `Hotel` connect `Community 0` to `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 13`?**
  _High betweenness centrality (0.045) - this node is a cross-community bridge._
- **Are the 39 inferred relationships involving `MessageBroker` (e.g. with `DashboardServer` and `datetime`) actually correct?**
  _`MessageBroker` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 39 inferred relationships involving `Hotel` (e.g. with `DashboardServer` and `datetime`) actually correct?**
  _`Hotel` has 39 INFERRED edges - model-reasoned connections that need verification._
- **Are the 10 inferred relationships involving `Room` (e.g. with `datetime` and `Guest`) actually correct?**
  _`Room` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Are the 20 inferred relationships involving `ReceptionService` (e.g. with `DashboardServer` and `main()`) actually correct?**
  _`ReceptionService` has 20 INFERRED edges - model-reasoned connections that need verification._