import { forwardRef, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StatusBadge from './StatusBadge'
import { useToast } from './Toast'
import * as api from '../lib/api'
import { ORDER_STATUS, SPRING, timeAgo } from '../lib/constants'
import { TrayIcon, PlusIcon, XIcon, CheckIcon } from '../lib/icons'

const money = new Intl.NumberFormat('uz-UZ')

const MOCK_MENU = [
  { id: 'm1', name: 'Qahva', price: 28000 },
  { id: 'm2', name: 'Sandvich', price: 42000 },
  { id: 'm3', name: 'Osh', price: 48000 },
  { id: 'm4', name: 'Sezar salat', price: 52000 },
  { id: 'm5', name: 'Margarita pitsa', price: 78000 },
  { id: 'm6', name: 'Mineral suv', price: 9000 },
]

const PROGRESS_STEPS = {
  PENDING: 1,
  PREPARING: 2,
  READY: 3,
  DELIVERED: 4,
}

const NEXT_ORDER_STEP = {
  PENDING: { frontStatus: 'PREPARING', apiStatus: 'PREPARING', label: 'Qabul qilish' },
  PREPARING: { frontStatus: 'READY', apiStatus: 'DELIVERING', label: 'Tayyor' },
  READY: { frontStatus: 'DELIVERED', apiStatus: 'DELIVERED', label: 'Yetkazildi' },
}

function SpinnerSvg({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden
      className={`animate-spin ${className}`}
    >
      <circle cx="12" cy="12" r="10" strokeDasharray="50" strokeDashoffset="38" />
    </svg>
  )
}

function OrderProgress({ status }) {
  const step = PROGRESS_STEPS[status] ?? 1
  const dots = ['PENDING', 'PREPARING', 'READY']
  return (
    <div className="mt-2 flex items-center gap-1.5">
      {dots.map((s, i) => {
        const active = i + 1 <= step
        return (
          <motion.span
            key={s}
            animate={active ? { scale: [1, 1.25, 1] } : {}}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${active ? 'bg-cyan-400' : 'bg-slate-600'}`}
          />
        )
      })}
      <span className="ml-1 text-[10px] text-slate-500">{ORDER_STATUS[status]?.label ?? status}</span>
    </div>
  )
}

const item = {
  initial: { opacity: 0, y: -24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: { opacity: 0, x: 28, transition: { duration: 0.2, ease: 'easeIn' } },
}

const OrderRow = forwardRef(function OrderRow({ order, canAct, onAdvance }, ref) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const next = NEXT_ORDER_STEP[order.status]

  async function handleAdvance() {
    if (!next) return
    setLoading(true)
    const res = await api.updateOrderStatus(order.id, next.apiStatus)
    onAdvance?.(order.id, next.frontStatus)
    toast(
      res.ok
        ? `Xona ${order.room} buyurtmasi: ${ORDER_STATUS[next.frontStatus].label}`
        : `Xona ${order.room} buyurtmasi: ${ORDER_STATUS[next.frontStatus].label} (demo)`,
      'success',
    )
    setLoading(false)
  }
  const summary = order.items.map((i) => `${i.qty}× ${i.name}`).join(' · ')
  return (
    <motion.li ref={ref} layout variants={item} initial="initial" animate="animate" exit="exit">
      <div className="glass rounded-xl p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-slate-200">
              <TrayIcon className="h-3.5 w-3.5 text-slate-400" />
              Xona {order.room}
            </span>
            <span className="text-[11px] text-slate-500">{timeAgo(order.createdAt)}</span>
          </div>
          <StatusBadge status={order.status} map={ORDER_STATUS} size="xs" />
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-slate-300">{summary}</p>
        {order.status !== 'DELIVERED' && <OrderProgress status={order.status} />}
        <div className="mt-3 flex items-center justify-between gap-3">
          {canAct && next ? (
            <button
              type="button"
              onClick={handleAdvance}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/10 px-2.5 text-[11px] font-bold text-violet-200 transition hover:bg-violet-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <SpinnerSvg className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
              {next.label}
            </button>
          ) : (
            <span />
          )}
          <div className="text-right">
            <span className="tnum text-sm font-semibold text-white">{money.format(order.total)}</span>
            <span className="ml-1 text-xs text-slate-400">so'm</span>
          </div>
        </div>
      </div>
    </motion.li>
  )
})

function OrderForm({ menu, onSubmit, onCancel }) {
  const [room, setRoom] = useState('')
  const [qty, setQty] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  const total = menu.reduce((s, item) => s + item.price * (qty[item.id] || 0), 0)

  function inc(id) {
    setQty((q) => ({ ...q, [id]: (q[id] || 0) + 1 }))
    setError('')
  }
  function dec(id) {
    setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) - 1) }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!room.trim()) {
      setError('Xona raqami kiritilishi kerak')
      setShakeKey((k) => k + 1)
      return
    }
    const items = menu.filter((m) => (qty[m.id] || 0) > 0).map((m) => ({ ...m, qty: qty[m.id] }))
    if (!items.length) {
      setError("Kamida bitta mahsulot tanlang")
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    await onSubmit(room.trim(), items)
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="glass rounded-xl p-4 mb-3"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">Yangi buyurtma</p>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          value={room}
          onChange={(e) => { setRoom(e.target.value); setError('') }}
          type="text"
          placeholder="Xona raqami"
          className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-cyan-300/50 focus:outline-none focus:ring-1 focus:ring-cyan-300/30 transition"
        />

        <div className="flex flex-wrap gap-2">
          {menu.map((m) => {
            const count = qty[m.id] || 0
            const active = count > 0
            return (
              <div
                key={m.id}
                className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition ${
                  active
                    ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200'
                    : 'border-white/10 bg-white/5 text-slate-300'
                }`}
              >
                <span className="text-xs font-medium">{m.name}</span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => dec(m.id)}
                    disabled={count === 0}
                    className="grid h-5 w-5 place-items-center rounded-md text-xs font-bold leading-none transition hover:bg-white/10 disabled:opacity-30"
                  >
                    −
                  </button>
                  <span className="tnum w-4 text-center text-xs font-bold">{count}</span>
                  <button
                    type="button"
                    onClick={() => inc(m.id)}
                    className="grid h-5 w-5 place-items-center rounded-md text-xs font-bold leading-none transition hover:bg-white/10"
                  >
                    +
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              key={shakeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              role="alert"
              className="text-xs font-medium text-red-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <div className="flex items-center justify-between gap-3">
          {total > 0 && (
            <span className="tnum text-sm font-semibold text-slate-300">{money.format(total)} so'm</span>
          )}
          <button
            type="submit"
            disabled={loading}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-cyan-300 px-4 text-xs font-black text-slate-950 transition hover:bg-cyan-200 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <SpinnerSvg className="h-3.5 w-3.5" /> : null}
            Yuborish
          </button>
        </div>
      </form>
    </motion.div>
  )
}

export default function OrderFeed({ orders, role, onPlaceOrder, onAdvanceOrder }) {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)
  const [menu, setMenu] = useState(MOCK_MENU)
  const canOrder = role === 'roomservice' || role === 'admin'
  const active = orders.filter((o) => o.status !== 'DELIVERED').length

  useEffect(() => {
    if (!canOrder) return
    api.getMenu().then((res) => {
      if (res.ok && Array.isArray(res.data?.items ?? res.data)) {
        const items = res.data?.items ?? res.data
        setMenu(items.map((i, idx) => ({ id: i.id ?? `api-${idx}`, name: i.name, price: i.price })))
      }
    })
  }, [canOrder])

  async function handleSubmit(room, items) {
    const res = await api.placeOrder({
      room_number: room,
      items: items.map((i) => ({ name: i.name, quantity: i.qty })),
    })
    if (res.ok) {
      toast(`Xona ${room} buyurtmasi qabul qilindi`, 'success')
    } else {
      onPlaceOrder(room, items)
      toast(`Xona ${room} buyurtmasi qabul qilindi (demo)`, 'success')
    }
    setShowForm(false)
  }

  return (
    <section className="panel flex max-h-[30rem] flex-col p-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-violet-500/15 text-violet-300">
            <TrayIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Room Service</h2>
            <p className="text-xs text-slate-400">
              <span className="tnum">{active}</span> ta faol buyurtma
            </p>
          </div>
        </div>

        {canOrder && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition active:scale-95 ${
              showForm
                ? 'border-slate-400/20 bg-white/5 text-slate-400 hover:bg-white/10'
                : 'border-violet-400/30 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'
            }`}
          >
            {showForm ? <XIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
            {showForm ? 'Bekor' : 'Buyurtma berish'}
          </button>
        )}
      </div>

      <motion.div layout className="scroll-area mask-fade-y mt-4 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {showForm && (
            <OrderForm key="form" menu={menu} onSubmit={handleSubmit} onCancel={() => setShowForm(false)} />
          )}
        </AnimatePresence>

        {orders.length === 0 && !showForm ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <TrayIcon className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">Hozircha buyurtma yo'q</p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {orders.map((order) => (
                <OrderRow
                  key={order.id}
                  order={order}
                  canAct={canOrder}
                  onAdvance={onAdvanceOrder}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </motion.div>
    </section>
  )
}
