# HotelOS — Real Vaqtli Mehmonxona Boshqaruv Tizimi

GrandStay mehmonxonasi uchun operatsion boshqaruv tizimi. To'rtta bo'limni
(Qabul, Tozalash, Xona xizmati, Texnik xizmat) bitta platformada birlashtiradi:
mikroservislar Redis Pub/Sub orqali gaplashadi, operatsiyalar paneli esa
WebSocket orqali jonli yangilanadi.

**Stack:** Backend — Python (Redis Pub/Sub + `websockets`) ·
Frontend — React + Vite + Tailwind + Framer Motion.

---

## Ikki ishlash rejimi

Panel ikki rejimda ishlaydi va backend uzilsa avtomatik mock rejimga qaytadi:

| Rejim | Qachon | Ma'lumot manbai |
| --- | --- | --- |
| **Backend (to'liq tizim)** | `.env` da `VITE_WS_URL` o'rnatilgan va backend ishlayotganda | Haqiqiy mikroservislar + Redis (`ws://localhost:8765`) |
| **Mock (mustaqil)** | `.env` yo'q yoki backend ishlamayotganda | Brauzer ichidagi simulyator |

---

## Old shartlar

* **Python 3.10+**
* **Redis** — `localhost:6379` da ishlab turishi kerak (Pub/Sub uchun)
* **Node.js 18+** (frontend uchun)

Redis ishga tushirish (Windows, agar o'rnatilgan bo'lsa):

```bash
redis-server
```

---

## Ishga tushirish (to'liq tizim)

Ikkita terminal kerak. Redis ishlab turgani tekshiring.

```bash
# 1-terminal — Backend (Python + Redis)
cd python
pip install -r requirements.txt
python run_dashboard.py        # dashboard (ws://:8765) + jonli hodisa generatori

# 2-terminal — Frontend
npm install
npm run dev
```

Brauzer ochiladi: **http://localhost:5173** · Login token: ixtiyoriy (≥4 belgi).

> `.env` fayli frontendni backendga ulaydi (`VITE_WS_URL=ws://localhost:8765`).
> Backend ishlamasa, panel xavfsiz tarzda mock rejimga qaytadi (o'ng yuqorida
> "Demo live" ko'rinadi).

### Faqat frontend (mock rejim)

```bash
npm install && npm run dev
```

Backend yoki Redis kerak emas — panel darhol mock ma'lumot bilan ishlaydi.

---

## Test stsenariylari (TS-01 … TS-08)

Redis ishlab turganda:

```bash
cd python
python run_demo.py          # 8/8 PASS — TS-01..TS-08 Redis orqali end-to-end
python smoke_dashboard.py   # dashboard WebSocket protokolini tekshiradi
```

`run_demo.py` 8 ta stsenariyni haqiqiy mikroservislar va Redis Pub/Sub orqali
sinaydi (check-in, hisob-kitob, tozalash, buyurtma, kritik nosozlik, bir vaqtli
check-in, xona yo'qligi, yaroqsiz kiritish).

---

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `cd python && python run_dashboard.py` | Dashboard WS server + jonli hodisa oqimi |
| `cd python && python run_demo.py` | TS-01..TS-08 stsenariy testi (Redis kerak) |
| `cd python && python smoke_dashboard.py` | Dashboard protokol smoke testi |
| `npm run dev` | Vite dev server (frontend) |
| `npm run build` | Production build (`dist/`) |

---

## Panel (4 ta ko'rinish)

1. **Xonalar** — kursorga ergashuvchi **3D tilt** kartalar, status rangi bo'yicha
   yorug'lik, qavat/qidiruv filtri. `CLEAN`=yashil · `DIRTY`=qizil ·
   `CLEANING`=sariq · `OCCUPIED`=ko'k · `MAINTENANCE`=kulrang.
2. **Room Service** — yangi buyurtma tepadan slide-in; status crossfade.
3. **Texnik xizmat** — prioritet bo'yicha tartiblangan; `CRITICAL` pulsing.
4. **Faoliyat tarixi** — oxirgi 20 hodisa; `mode="popLayout"` bilan oqim.

Yuqorida: KPI satri, jonli ulanish indikatori, login, kun/tun rejimi.

> **Eslatma:** Panel'dagi TS-01..TS-08 tugmalari brauzer ichida lokal demo
> sifatida ishlaydi (dashboard server faqat broadcast qiladi, buyruq qabul
> qilmaydi). Backend stsenariylarini tekshirish uchun `python run_demo.py`
> ishlating.

---

## Arxitektura

```
                         ┌──────────────────────────────┐
   Brauzer paneli  ◄────►│ dashboard/server.py  (ws:8765)│  WebSocket fan-out
                         └───────────────┬───────────────┘
                                         │ psubscribe "*"
                         ┌───────────────▼───────────────┐
                         │     Redis Pub/Sub  (:6379)     │
                         └──┬────────┬────────┬────────┬──┘
                  publish/subscribe (servislar bir-birini ko'rmaydi)
        ┌──────────────┬──┴───┬───────┴──────┬─────────┴────┐
   ┌────▼─────┐  ┌─────▼────┐  ┌────────▼─────┐  ┌──────────▼────┐
   │reception │  │housekeep.│  │ room_service │  │  maintenance  │
   └──────────┘  └──────────┘  └──────────────┘  └───────────────┘
```

Backend ichki tafsilotlari, kanallar (channels) ro'yxati va Redis sozlamalari:
[`python/README.md`](python/README.md).

---

## Git tarixi (`git log --oneline`)

```
docs: project + backend READMEs, env config, assignment brief
feat(frontend): live data hook (WS adapter + mock fallback)
feat(frontend): panel UI components with 3D tilt room cards
test(backend): TS-01..TS-08 scenario demo + dashboard smoke
feat(backend): WebSocket dashboard fan-out + run_dashboard
feat(backend): maintenance service (priority queue)
feat(backend): room service (async order pipeline)
feat(backend): housekeeping service (cleaning queue)
feat(backend): reception service (check-in, check-out, billing)
feat(backend): domain models (Hotel, Room, Guest, enums)
feat(backend): add Redis Pub/Sub message broker
chore: scaffold Vite + React + Tailwind project
```

---

## Loyiha tuzilmasi

```
HotelOS/
├── .env / .env.example          # frontend -> backend ulanishi (VITE_WS_URL)
├── index.html, package.json, vite/tailwind/postcss config
├── python/                      # BACKEND (Python + Redis Pub/Sub)
│   ├── run_dashboard.py         # dashboard WS + jonli hodisa generatori
│   ├── run_demo.py              # TS-01..TS-08 stsenariy testi
│   ├── smoke_dashboard.py       # dashboard protokol smoke testi
│   ├── broker.py                # Redis Pub/Sub wrapper
│   ├── models.py                # OOP: entity'lar, Hotel konteyneri
│   ├── reception.py             # Qabul: check-in/out, hisob-kitob
│   ├── housekeeping.py          # Tozalash navbati + 3 tozalovchi
│   ├── room_service.py          # Menyu + async buyurtma oqimi
│   ├── maintenance.py           # Ustuvorlik navbati + 2 texnik
│   ├── dashboard/server.py      # WebSocket fan-out (ws://:8765)
│   ├── requirements.txt
│   └── README.md                # backend arxitekturasi + kanallar
└── src/                         # FRONTEND (React)
    ├── App.jsx, main.jsx, index.css
    ├── hooks/useMockHotelData.js  # WS ulanish + backend adapter + mock fallback
    ├── lib/  (constants, icons)
    └── components/  (RoomCard, RoomGrid, OrderFeed, MaintenancePanel,
                      ActivityLog, ScenarioPanel, RoomDetailModal, …)
```
