import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'

const MAX_ORDERS = 14
const MAX_ACTIVITY = 20
const WS_URL = import.meta.env.VITE_WS_URL

const VALID_TOKEN = import.meta.env.VITE_HOTELOS_TOKEN || 'hotel2024'

function getWsUrl() {
  if (!WS_URL) return null
  const token = localStorage.getItem('hotelos-token') || ''
  return token === VALID_TOKEN ? `${WS_URL}?token=${encodeURIComponent(token)}` : null
}

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
    notice: 'Tizim tayyor. Xonalar, buyurtmalar va texnik xizmatlar real-time kuzatilmoqda.',
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
function reducer(state, action) {
  switch (action.type) {
    case 'state:snapshot':
      return { ...state, ...action.payload }
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
      const orderMessage = action.payload.room
        ? `Xona ${action.payload.room} buyurtmasi: ${ORDER_FLOW_LABEL[action.payload.status] ?? action.payload.status}`
        : `Buyurtma: ${ORDER_FLOW_LABEL[action.payload.status] ?? action.payload.status}`
      return addActivity(
        {
          ...state,
          orders: state.orders.map((o) => (o.id === action.payload.id ? { ...o, ...action.payload } : o)),
        },
        orderMessage,
        'order',
      )
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
    case 'maintenance:resolve':
      return addActivity(
        { ...state, maintenance: state.maintenance.filter((m) => m.id !== action.payload.id) },
        'Ariza hal qilindi',
        'maintenance',
      )
    case 'guest:checkin': {
      const { name, type, floor, proximity } = action.payload
      const room = chooseRoom(state.rooms, { type, floor: floor ? Number(floor) : undefined, proximity })
      if (!room) return addActivity(state, `${type} xona mavjud emas`, 'guest')
      return addActivity(
        updateRoom(state, { ...room, status: 'OCCUPIED', guest: name }),
        `${name} ${room.number}-xonaga joylashdi`,
        'guest',
      )
    }
    case 'guest:checkin:direct': {
      const { name, roomNumber } = action.payload
      const room = state.rooms.find((r) => r.number === String(roomNumber))
      if (!room) return addActivity(state, 'Xona topilmadi', 'guest')
      return addActivity(
        updateRoom(state, { ...room, status: 'OCCUPIED', guest: name }),
        `${name} ${room.number}-xonaga joylashdi`,
        'guest',
      )
    }
    case 'guest:checkout': {
      const roomNum = String(action.payload.roomNumber)
      const room = state.rooms.find((r) => r.number === roomNum)
      if (!room) return addActivity(state, 'Xona topilmadi', 'guest')
      const charges = state.orders.filter((o) => o.room === roomNum).reduce((s, o) => s + o.total, 0)
      const bill = (room.rate ?? 640000) + charges
      return addActivity(
        updateRoom(state, { ...room, status: 'DIRTY', guest: null }),
        `${roomNum}-xona bo'shadi · hisob ${money.format(bill)} som`,
        'guest',
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

// Variant of evRoomLifecycle that skips rooms manually assigned by the user
// so a real check-in isn't immediately overwritten by the mock simulator.
function evRoomLifecycleFiltered(state, manualRooms) {
  const eligible = state.rooms.filter((r) => !manualRooms.has(r.number))
  if (!eligible.length) return []
  const room = { ...pick(eligible) }
  if (room.status === 'CLEAN') {
    room.status = 'OCCUPIED'
    room.guest = pick(NAMES)
    return [
      { type: 'room:update', payload: room },
      { type: 'activity', payload: act('guest', `${room.guest} ${room.number}-xonaga joylashdi`) },
    ]
  }
  if (room.status === 'OCCUPIED') {
    const guest = room.guest
    room.status = 'DIRTY'
    room.guest = null
    return [
      { type: 'room:update', payload: room },
      { type: 'activity', payload: act('guest', `${guest || 'Mehmon'} ${room.number}-xonadan chiqdi`) },
    ]
  }
  room.status = room.status === 'DIRTY' ? 'CLEANING' : 'CLEAN'
  room.cleanSince = room.status === 'CLEAN' ? Date.now() : room.cleanSince
  return [
    { type: 'room:update', payload: room },
    { type: 'activity', payload: act('room', `${room.number}-xona holati: ${room.status}`) },
  ]
}

function nextEventsSafe(state, manualRooms) {
  const total = EVENTS.reduce((s, e) => s + e.w, 0)
  let r = Math.random() * total
  for (const e of EVENTS) {
    if ((r -= e.w) < 0) {
      if (e.fn === evRoomLifecycle) return evRoomLifecycleFiltered(state, manualRooms)
      return e.fn(state)
    }
  }
  return evRoomLifecycleFiltered(state, manualRooms)
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
      const orders = (data.orders || []).map((o) => ({
        id: o.order_id,
        room: String(o.room_number),
        items: (o.items || []).map((i) => ({ name: i.name, qty: i.quantity })),
        total: o.total,
        status: ORDER_STATUS_TO_FRONT[o.status] || 'PENDING',
        createdAt: Date.now(),
      }))
      const maintenance = (data.maintenance || []).map((m) => ({
        id: m.request_id,
        room: String(m.room_number),
        issue: m.description || 'Nosozlik',
        priority: PRIORITY_TO_FRONT[m.priority] || 'MEDIUM',
        status: m.status,
        assignedTo: m.assigned_to,
        reportedAt: m.submitted_at ? Math.round(m.submitted_at * 1000) : Date.now(),
      }))
      return [{ type: 'state:snapshot', payload: { rooms, orders, maintenance } }]
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
        roomPatch(data.room_number, { status: 'CLEANING', housekeeper: data.housekeeper }),
        { type: 'activity', payload: act('room', `${data.housekeeper} ${data.room_number}-xonani tozalamoqda`) },
      ]
    case 'room.cleaned':
      return [
        roomPatch(data.room_number, { status: 'CLEAN', cleanSince: Date.now(), housekeeper: null }),
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
      return [{
        type: 'order:update',
        payload: {
          id: data.order_id,
          room: String(data.room_number),
          status: ORDER_STATUS_TO_FRONT[data.status] || 'PREPARING',
        },
      }]
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
      return [
        { type: 'maintenance:new', payload: ticket },
        roomPatch(data.room_number, { status: 'MAINTENANCE' }),
      ]
    }
    case 'maintenance.assigned':
      return [{
        type: 'maintenance:assign',
        payload: { id: data.request_id, room: String(data.room_number), assignedTo: data.technician },
      }]
    case 'maintenance.resolved':
      return [
        { type: 'maintenance:resolve', payload: { id: data.request_id } },
        { type: 'activity', payload: act('maintenance', `Ariza ${data.request_id} hal qilindi`) },
      ]
    default:
      return []
  }
}

export function useMockHotelData() {
  const [state, dispatch] = useReducer(reducer, undefined, seed)
  const wsUrl = useMemo(getWsUrl, [])
  const [status, setStatus] = useState(wsUrl ? 'connecting' : 'mock')
  const socketRef = useRef(null)
  const stateRef = useRef(state)
  const manualRoomsRef = useRef(new Set())
  stateRef.current = state

  const [checkouts, setCheckouts] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('hotelos-checkout-archive') || '[]')
    } catch {
      return []
    }
  })

  useEffect(() => {
    if (!wsUrl) return undefined
    const socket = new WebSocket(wsUrl)
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

  const resolveTicket = useCallback((id, notes = '') => {
    sendOrDispatch({ type: 'maintenance:resolve', payload: { id, notes } })
  }, [sendOrDispatch])

  const checkinGuest = useCallback((params) => {
    const room = chooseRoom(stateRef.current.rooms, {
      type: params.type,
      floor: params.floor ? Number(params.floor) : undefined,
      proximity: params.proximity || undefined,
    })
    if (!room) {
      dispatch({ type: 'activity', payload: act('guest', `${params.type || ''} xona topilmadi`) })
      return
    }
    manualRoomsRef.current.add(room.number)
    sendOrDispatch({ type: 'guest:checkin:direct', payload: { name: params.name, roomNumber: room.number } })
  }, [sendOrDispatch])

  const checkoutGuest = useCallback((roomNumber) => {
    manualRoomsRef.current.delete(String(roomNumber))
    // Get room details before dispatching checkout to capture guest name and orders
    const room = stateRef.current.rooms.find((r) => r.number === String(roomNumber))
    if (room && room.guest) {
      const roomNum = String(roomNumber)
      const charges = stateRef.current.orders.filter((o) => o.room === roomNum).reduce((s, o) => s + o.total, 0)
      const bill = (room.rate ?? 640000) + charges
      const record = {
        id: `arc-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        roomNumber: roomNum,
        roomType: room.type,
        roomRate: room.rate ?? 640000,
        guestName: room.guest,
        checkInTime: room.cleanSince || (Date.now() - 24 * 60 * 60 * 1000),
        checkOutTime: Date.now(),
        orders: stateRef.current.orders.filter((o) => o.room === roomNum).map(o => ({
          id: o.id,
          items: o.items,
          total: o.total,
          status: o.status
        })),
        totalBill: bill
      }
      try {
        const archive = JSON.parse(localStorage.getItem('hotelos-checkout-archive') || '[]')
        archive.unshift(record)
        localStorage.setItem('hotelos-checkout-archive', JSON.stringify(archive.slice(0, 100)))
        setCheckouts(archive.slice(0, 100))
      } catch (e) {
        console.error(e)
      }
    }
    sendOrDispatch({ type: 'guest:checkout', payload: { roomNumber } })
  }, [sendOrDispatch])

  const clearCheckoutArchive = useCallback(() => {
    try {
      localStorage.setItem('hotelos-checkout-archive', '[]')
      setCheckouts([])
    } catch (e) {
      console.error(e)
    }
  }, [])

  const cleanRoom = useCallback((roomNumber) => {
    const room = stateRef.current.rooms.find((r) => r.number === String(roomNumber))
    if (!room) return
    sendOrDispatch({
      type: 'room:update',
      payload: { id: room.id, number: room.number, status: 'CLEAN', cleanSince: Date.now(), housekeeper: null }
    })
    sendOrDispatch({
      type: 'activity',
      payload: act('room', `${room.number}-xona tayyor`)
    })
  }, [sendOrDispatch])

  const addOrderMock = useCallback((room, items) => {
    sendOrDispatch({ type: 'order:new', payload: makeOrderForRoom(room, items) })
  }, [sendOrDispatch])

  const advanceOrder = useCallback((id, status) => {
    const order = stateRef.current.orders.find((o) => o.id === id)
    sendOrDispatch({ type: 'order:update', payload: { id, room: order?.room, status } })
  }, [sendOrDispatch])

  const addIssueMock = useCallback((room, issue, priority) => {
    const frontPriority = priority === 'NORMAL' ? 'MEDIUM' : priority
    sendOrDispatch({ type: 'maintenance:new', payload: makeTicket(room, issue, frontPriority) })
  }, [sendOrDispatch])

  return {
    ...state,
    status,
    mode: WS_URL ? 'websocket' : 'mock',
    checkouts,
    clearCheckoutArchive,
    assignTicket,
    resolveTicket,
    checkinGuest,
    checkoutGuest,
    cleanRoom,
    addOrderMock,
    advanceOrder,
    addIssueMock,
  }
}
