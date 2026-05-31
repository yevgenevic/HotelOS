import { useCallback, useEffect, useReducer, useRef, useState } from 'react'

const MAX_ORDERS = 14
const MAX_ACTIVITY = 20
const WS_URL = import.meta.env.VITE_WS_URL

let seq = 0
const uid = (p) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]
const money = new Intl.NumberFormat('uz-UZ')

const ROOM_TYPES = ['Single', 'Double', 'Suite', 'Accessible']
const NAMES = [
  'Aziz Karimov',
  'Dilnoza Yusupova',
  'Bobur Aliyev',
  'Madina Saidova',
  'Jasur Tursunov',
  'Nilufar Rashidova',
  'Sardor Umarov',
  'Kamola Ergasheva',
  'Sofia Rossi',
  'Aisha Rahman',
]

const MENU = [
  { name: 'Qahva', price: 28000 },
  { name: 'Sandvich', price: 42000 },
  { name: 'Osh', price: 48000 },
  { name: 'Sezar salat', price: 52000 },
  { name: 'Margarita pitsa', price: 78000 },
  { name: 'Mineral suv', price: 9000 },
]

const ISSUES = [
  'Dush suvi oqmayapti',
  'Wi-Fi uzilib qolmoqda',
  'Eshik qulfi buzilgan',
  'Lampochka kuygan',
  'Issiq suv yoq',
]

const PRIORITY = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
const ORDER_FLOW = { PENDING: 'PREPARING', PREPARING: 'READY', READY: 'DELIVERED' }
const ORDER_FLOW_LABEL = { PREPARING: 'tayyorlanmoqda', READY: 'tayyor', DELIVERED: 'yetkazildi' }

const act = (type, message, ts = Date.now()) => ({ id: uid('act'), type, message, timestamp: ts })

function makeRoom(number, type, status, guest = null, cleanAgo = 60, proximity = 'middle') {
  return {
    id: `r${number}`,
    number,
    floor: Number(String(number)[0]),
    type,
    status,
    guest,
    cleanSince: Date.now() - cleanAgo * 60 * 1000,
    proximity,
    rate: type === 'Suite' ? 950000 : type === 'Accessible' ? 720000 : type === 'Double' ? 640000 : 480000,
  }
}

function seed() {
  const rooms = [
    makeRoom('101', 'Single', 'OCCUPIED', 'Liam Obrien', 110, 'elevator'),
    makeRoom('102', 'Suite', 'CLEAN', null, 260),
    makeRoom('103', 'Accessible', 'CLEANING', null, 90),
    makeRoom('115', 'Double', 'CLEAN', null, 540, 'stairs'),
    makeRoom('201', 'Family', 'DIRTY', null, 30),
    makeRoom('202', 'Double', 'OCCUPIED', 'Sofia Rossi', 180),
    makeRoom('203', 'Suite', 'CLEAN', null, 320, 'elevator'),
    makeRoom('204', 'Double', 'OCCUPIED', 'Madina Saidova', 420),
    makeRoom('301', 'Double', 'OCCUPIED', 'Aziz Karimov', 120, 'elevator'),
    makeRoom('302', 'Double', 'CLEAN', null, 880),
    makeRoom('303', 'Single', 'OCCUPIED', 'Nilufar Rashidova', 160),
    makeRoom('304', 'Suite', 'CLEAN', null, 740),
    makeRoom('401', 'Single', 'CLEAN', null, 360),
    makeRoom('402', 'Accessible', 'CLEAN', null, 210),
    makeRoom('403', 'Double', 'CLEAN', null, 980, 'stairs'),
    makeRoom('404', 'Suite', 'OCCUPIED', 'Sardor Umarov', 140),
  ]

  const orders = [
    makeOrderForRoom('301', [
      { name: 'Qahva', qty: 2, price: 28000 },
      { name: 'Sandvich', qty: 1, price: 42000 },
    ], 'PREPARING', 21),
    makeOrderForRoom('204', [{ name: 'Osh', qty: 1, price: 48000 }], 'READY', 14),
    makeOrderForRoom('101', [{ name: 'Mineral suv', qty: 2, price: 9000 }], 'PENDING', 6),
  ]

  const maintenance = [
    makeTicket('115', 'Singan dush', 'CRITICAL', 18, 'OPEN'),
    makeTicket('402', 'Issiq suv yoq', 'LOW', 43, 'OPEN'),
    makeTicket('103', 'Lampochka kuygan', 'MEDIUM', 28, 'ASSIGNED'),
  ]

  return {
    rooms,
    orders,
    maintenance,
    notice: 'Demo stream tayyor. Scenario panel orqali TS-01..TS-08 ni ishga tushiring.',
    activity: [
      act('system', 'Boshqaruv paneli ishga tushdi', Date.now() - 4000),
      act('room', '305-xona tozalandi', Date.now() - 32000),
      act('guest', 'Yangi mehmon royxatdan otdi', Date.now() - 68000),
    ],
  }
}

function makeItems() {
  const count = rand(1, 3)
  const pool = [...MENU]
  const chosen = []
  for (let i = 0; i < count && pool.length; i++) {
    const item = pool.splice(rand(0, pool.length - 1), 1)[0]
    chosen.push({ ...item, qty: rand(1, 3) })
  }
  return chosen
}

function makeOrderForRoom(room, items, status = 'PENDING', ageMinutes = 0) {
  return {
    id: uid('ord'),
    room,
    items: items.map(({ name, qty }) => ({ name, qty })),
    total: items.reduce((s, i) => s + i.qty * i.price, 0),
    status,
    createdAt: Date.now() - ageMinutes * 60 * 1000,
  }
}

function makeOrder(rooms) {
  const occupied = rooms.filter((r) => r.status === 'OCCUPIED')
  const room = pick(occupied.length ? occupied : rooms)
  return makeOrderForRoom(room.number, makeItems())
}

function makeTicket(room, issue, priority, ageMinutes = 0, status = 'OPEN') {
  return {
    id: uid('mnt'),
    room,
    issue,
    priority,
    status,
    assignedTo: status === 'ASSIGNED' ? 'Texnik A' : null,
    reportedAt: Date.now() - ageMinutes * 60 * 1000,
  }
}

function chooseRoom(rooms, { type, floor, proximity }) {
  const typed = rooms.filter((r) => r.type === type && r.status === 'CLEAN')
  const preferred = typed.filter((r) => r.floor === floor)
  const pool = preferred.length ? preferred : typed
  return [...pool].sort((a, b) => {
    if (proximity && a.proximity !== b.proximity) {
      if (a.proximity === proximity) return -1
      if (b.proximity === proximity) return 1
    }
    return a.cleanSince - b.cleanSince
  })[0]
}

function addActivity(state, message, type = 'system') {
  return {
    ...state,
    notice: message,
    activity: [act(type, message), ...state.activity].slice(0, MAX_ACTIVITY),
  }
}

function updateRoom(state, room) {
  return {
    ...state,
    rooms: state.rooms.map((r) => (r.id === room.id ? { ...r, ...room } : r)),
  }
}

function scenario(state, id) {
  switch (id) {
    case 'TS-01': {
      const room = chooseRoom(state.rooms, { type: 'Double', floor: 3, proximity: 'elevator' })
      if (!room) return addActivity(state, 'TS-01: Double xona mavjud emas', 'guest')
      const updated = { ...room, status: 'OCCUPIED', guest: 'TS-01 Mehmon' }
      return addActivity(updateRoom(state, updated), `TS-01: ${room.number}-xona mehmon uchun tayinlandi`, 'guest')
    }
    case 'TS-02': {
      const room = state.rooms.find((r) => r.number === '204')
      if (!room) return addActivity(state, 'TS-02: 204-xona topilmadi', 'room')
      const charges = state.orders.filter((o) => o.room === '204').reduce((s, o) => s + o.total, 0)
      const bill = (room.rate ?? 640000) * 2 + charges
      return addActivity(
        updateRoom(state, { ...room, status: 'DIRTY', guest: null }),
        `TS-02: 204 checkout qilindi. Hisob: ${money.format(bill)} som. Xona iflos holatga otkazildi.`,
        'guest',
      )
    }
    case 'TS-03': {
      const room = state.rooms.find((r) => r.number === '204')
      if (!room) return addActivity(state, 'TS-03: 204-xona topilmadi', 'room')
      return addActivity(
        updateRoom(state, { ...room, status: 'CLEAN', guest: null, cleanSince: Date.now() }),
        'TS-03: 204-xona tozalanmoqda -> toza. Qabul paneli yangilandi.',
        'room',
      )
    }
    case 'TS-04': {
      const order = makeOrderForRoom('301', [
        { name: 'Qahva', qty: 2, price: 28000 },
        { name: 'Sandvich', qty: 1, price: 42000 },
      ])
      return addActivity(
        { ...state, orders: [order, ...state.orders].slice(0, MAX_ORDERS) },
        'TS-04: 301-xonadan 2 qahva va 1 sandvich buyurtmasi qabul qilindi.',
        'order',
      )
    }
    case 'TS-05': {
      const ticket = makeTicket('115', 'Singan dush', 'CRITICAL')
      const room = state.rooms.find((r) => r.number === '115')
      const next = room ? updateRoom(state, { ...room, status: 'MAINTENANCE' }) : state
      return addActivity(
        { ...next, maintenance: [ticket, ...next.maintenance] },
        'TS-05: 115-xona kritik texnik navbatning oldiga qoyildi.',
        'maintenance',
      )
    }
    case 'TS-06': {
      const available = [...state.rooms]
        .filter((room) => room.type === 'Double' && room.status === 'CLEAN')
        .sort((a, b) => a.cleanSince - b.cleanSince)
      const first = available[0]
      if (!first) return addActivity(state, 'TS-06: birinchi mehmon uchun xona mavjud emas', 'guest')
      const second = available[1]
      if (!second) return addActivity(state, 'TS-06: faqat bitta Double xona mavjud edi', 'guest')
      const rooms = state.rooms.map((room) => {
        if (room.id === first.id) return { ...room, status: 'OCCUPIED', guest: 'Concurrent Guest A' }
        if (room.id === second.id) return { ...room, status: 'OCCUPIED', guest: 'Concurrent Guest B' }
        return room
      })
      return addActivity({ ...state, rooms }, `TS-06: ${first.number} va ${second.number} alohida mehmonlarga berildi.`, 'guest')
    }
    case 'TS-07':
      return addActivity(state, 'TS-07: Sorov qilingan turdagi xonalar mavjud emas. Muqobil tur yoki waitlist taklif qilindi.', 'guest')
    case 'TS-08':
      return addActivity(state, 'TS-08: Notogri xona raqami rad etildi. Tizim barqaror ishlayapti.', 'system')
    default:
      return state
  }
}

function reducer(state, action) {
  switch (action.type) {
    case 'state:snapshot':
      return { ...state, ...action.payload }
    case 'scenario:run':
      return scenario(state, action.payload)
    case 'room:update': {
      const r = action.payload
      const exists = state.rooms.some((x) => x.id === r.id)
      return {
        ...state,
        rooms: exists ? state.rooms.map((x) => (x.id === r.id ? { ...x, ...r } : x)) : [...state.rooms, r],
      }
    }
    case 'order:new':
      return addActivity(
        { ...state, orders: [action.payload, ...state.orders].slice(0, MAX_ORDERS) },
        `Xona ${action.payload.room} dan yangi buyurtma (${money.format(action.payload.total)} som)`,
        'order',
      )
    case 'order:update':
      return {
        ...state,
        orders: state.orders.map((o) => (o.id === action.payload.id ? { ...o, ...action.payload } : o)),
      }
    case 'maintenance:new':
      return addActivity(
        { ...state, maintenance: [action.payload, ...state.maintenance] },
        `Xona ${action.payload.room}: ${action.payload.issue}`,
        'maintenance',
      )
    case 'maintenance:assign': {
      const assignedTo = action.payload.assignedTo || 'Texnik A'
      return addActivity(
        {
          ...state,
          maintenance: state.maintenance.map((m) =>
            m.id === action.payload.id ? { ...m, status: 'ASSIGNED', assignedTo } : m,
          ),
        },
        `Xona ${action.payload.room ?? ''} nosozligi ${assignedTo} ga biriktirildi`,
        'maintenance',
      )
    }
    case 'activity':
      return addActivity(state, action.payload.message, action.payload.type)
    default:
      return state
  }
}

function evRoomLifecycle(state) {
  const room = { ...pick(state.rooms) }
  if (room.status === 'CLEAN') {
    room.status = 'OCCUPIED'
    room.guest = pick(NAMES)
    return [{ type: 'room:update', payload: room }, { type: 'activity', payload: act('guest', `${room.guest} ${room.number}-xonaga joylashdi`) }]
  }
  if (room.status === 'OCCUPIED') {
    const guest = room.guest
    room.status = 'DIRTY'
    room.guest = null
    return [{ type: 'room:update', payload: room }, { type: 'activity', payload: act('guest', `${guest || 'Mehmon'} ${room.number}-xonadan chiqdi`) }]
  }
  room.status = room.status === 'DIRTY' ? 'CLEANING' : 'CLEAN'
  room.cleanSince = room.status === 'CLEAN' ? Date.now() : room.cleanSince
  return [{ type: 'room:update', payload: room }, { type: 'activity', payload: act('room', `${room.number}-xona holati: ${room.status}`) }]
}

function evNewOrder(state) {
  return [{ type: 'order:new', payload: makeOrder(state.rooms) }]
}

function evAdvanceOrder(state) {
  const open = state.orders.filter((o) => o.status !== 'DELIVERED')
  if (!open.length) return evNewOrder(state)
  const order = pick(open)
  const status = ORDER_FLOW[order.status]
  return [
    { type: 'order:update', payload: { id: order.id, status } },
    { type: 'activity', payload: act('order', `Xona ${order.room} buyurtmasi: ${ORDER_FLOW_LABEL[status]}`) },
  ]
}

function evMaintenance(state) {
  return [
    {
      type: 'maintenance:new',
      payload: makeTicket(pick(state.rooms).number, pick(ISSUES), pick(PRIORITY)),
    },
  ]
}

const EVENTS = [
  { fn: evRoomLifecycle, w: 4 },
  { fn: evNewOrder, w: 3 },
  { fn: evAdvanceOrder, w: 4 },
  { fn: evMaintenance, w: 2 },
]

function nextEvents(state) {
  const total = EVENTS.reduce((s, e) => s + e.w, 0)
  let r = Math.random() * total
  for (const e of EVENTS) {
    if ((r -= e.w) < 0) return e.fn(state)
  }
  return EVENTS[0].fn(state)
}

// --- Backend (HotelOS Python) adapter ---------------------------------------
// Backend publishes { channel, data } envelopes on Redis pub/sub channels and
// the Python WebSocket server fans them out unchanged. We translate them into
// the reducer's local action shape so the rest of the app stays unaware.

const RTYPE_TO_FRONT = { SINGLE: 'Single', DOUBLE: 'Double', SUITE: 'Suite', ACCESSIBLE: 'Accessible' }
const ORDER_STATUS_TO_FRONT = { RECEIVED: 'PENDING', PREPARING: 'PREPARING', DELIVERING: 'READY', DELIVERED: 'DELIVERED' }
const PRIORITY_TO_FRONT = { CRITICAL: 'CRITICAL', HIGH: 'HIGH', NORMAL: 'MEDIUM', LOW: 'LOW' }
const RATE_BY_TYPE = { Single: 480000, Double: 640000, Suite: 950000, Accessible: 720000 }

function mapBackendRoom(r) {
  const type = RTYPE_TO_FRONT[r.type] || r.type
  return {
    id: `r${r.number}`,
    number: String(r.number),
    floor: r.floor,
    type,
    status: r.status,
    guest: r.guest ? r.guest.name : null,
    cleanSince: r.cleaned_at ? Math.round(r.cleaned_at * 1000) : Date.now(),
    proximity: 'middle',
    rate: RATE_BY_TYPE[type] || 480000,
  }
}

function roomPatch(number, patch) {
  return { type: 'room:update', payload: { id: `r${number}`, number: String(number), ...patch } }
}

function adaptBackendEnvelope(envelope) {
  if (!envelope || !envelope.channel) return []
  const { channel, data = {} } = envelope
  switch (channel) {
    case 'dashboard.full_state': {
      const roomsMap = data.rooms || {}
      const rooms = Object.values(roomsMap).map(mapBackendRoom)
      return [{ type: 'state:snapshot', payload: { rooms, orders: [], maintenance: [] } }]
    }
    case 'reception.check_in':
      return [
        roomPatch(data.room_number, { status: 'OCCUPIED', guest: data.guest_name }),
        { type: 'activity', payload: act('guest', `${data.guest_name} ${data.room_number}-xonaga joylashdi`) },
      ]
    case 'room.vacated': {
      const total = data.bill && data.bill.grand_total
      return [
        roomPatch(data.room_number, { status: 'DIRTY', guest: null }),
        { type: 'activity', payload: act('guest', total != null ? `${data.room_number}-xona bo'shadi · hisob ${money.format(total)} som` : `${data.room_number}-xona bo'shadi`) },
      ]
    }
    case 'room.cleaning_started':
      return [
        roomPatch(data.room_number, { status: 'CLEANING' }),
        { type: 'activity', payload: act('room', `${data.housekeeper} ${data.room_number}-xonani tozalamoqda`) },
      ]
    case 'room.cleaned':
      return [
        roomPatch(data.room_number, { status: 'CLEAN', cleanSince: Date.now() }),
        { type: 'activity', payload: act('room', `${data.room_number}-xona tayyor`) },
      ]
    case 'order.placed': {
      const order = {
        id: data.order_id,
        room: String(data.room_number),
        items: (data.items || []).map((i) => ({ name: i.name, qty: i.quantity })),
        total: data.total,
        status: ORDER_STATUS_TO_FRONT[data.status] || 'PENDING',
        createdAt: Date.now(),
      }
      return [{ type: 'order:new', payload: order }]
    }
    case 'order.status_update':
      return [{ type: 'order:update', payload: { id: data.order_id, status: ORDER_STATUS_TO_FRONT[data.status] || 'PREPARING' } }]
    case 'room.charge_added':
      return [{ type: 'activity', payload: act('order', `${data.room_number}: +${money.format(data.amount)} som`) }]
    case 'maintenance.request': {
      const ticket = {
        id: data.request_id,
        room: String(data.room_number),
        issue: data.description || 'Nosozlik',
        priority: PRIORITY_TO_FRONT[data.priority] || 'MEDIUM',
        status: 'OPEN',
        assignedTo: null,
        reportedAt: Date.now(),
      }
      return [{ type: 'maintenance:new', payload: ticket }]
    }
    case 'maintenance.assigned':
      return [{
        type: 'maintenance:assign',
        payload: { id: data.request_id, room: String(data.room_number), assignedTo: data.technician },
      }]
    case 'maintenance.resolved':
      return [{ type: 'activity', payload: act('maintenance', `Ariza ${data.request_id} hal qilindi`) }]
    default:
      return []
  }
}

export function useMockHotelData() {
  const [state, dispatch] = useReducer(reducer, undefined, seed)
  const [status, setStatus] = useState(WS_URL ? 'connecting' : 'mock')
  const socketRef = useRef(null)
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => {
    if (!WS_URL) return undefined
    const socket = new WebSocket(WS_URL)
    socketRef.current = socket
    socket.onopen = () => setStatus('connected')
    socket.onclose = () => setStatus('mock')
    socket.onerror = () => setStatus('mock')
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        // New backend envelope: { channel, data }
        if (message.channel) {
          for (const action of adaptBackendEnvelope(message)) dispatch(action)
          return
        }
        // Legacy passthrough: { type, payload } or { rooms/orders/maintenance }
        if (message.type && message.payload !== undefined) dispatch(message)
        if (message.rooms || message.orders || message.maintenance) {
          dispatch({ type: 'state:snapshot', payload: message })
        }
      } catch {
        dispatch({ type: 'activity', payload: act('system', 'WebSocket xabari oqib bolmadi') })
      }
    }
    return () => socket.close()
  }, [])

  useEffect(() => {
    if (status === 'connected') return undefined
    let timer
    const tick = () => {
      for (const action of nextEvents(stateRef.current)) dispatch(action)
      timer = setTimeout(tick, rand(2200, 4200))
    }
    timer = setTimeout(tick, 1500)
    return () => clearTimeout(timer)
  }, [status])

  const sendOrDispatch = useCallback((action) => {
    const socket = socketRef.current
    if (socket && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(action))
    dispatch(action)
  }, [])

  const assignTicket = useCallback(
    (id) => {
      const ticket = stateRef.current.maintenance.find((t) => t.id === id)
      sendOrDispatch({ type: 'maintenance:assign', payload: { id, room: ticket?.room } })
    },
    [sendOrDispatch],
  )

  const runScenario = useCallback((id) => {
    dispatch({ type: 'scenario:run', payload: id })
  }, [])

  return { ...state, status, mode: WS_URL ? 'websocket' : 'mock', assignTicket, runScenario }
}
