import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StatusBadge from './StatusBadge'
import { useToast } from './Toast'
import * as api from '../lib/api'
import { ROOM_STATUS, ORDER_STATUS, PRIORITY, timeAgo } from '../lib/constants'
import { BedIcon, XIcon, CheckIcon } from '../lib/icons'

const money = new Intl.NumberFormat('uz-UZ')

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

function BillBreakdown({ bill, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="rounded-2xl border border-emerald-400/20 bg-emerald-950/40 p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/20 text-emerald-300">
          <CheckIcon className="h-4 w-4" />
        </span>
        <h3 className="font-bold text-emerald-200">Checkout bajarildi</h3>
      </div>

      <div className="space-y-2 text-sm">
        {bill.nights != null && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">
              {bill.nights} tun × {money.format(bill.rate)} so'm
            </span>
            <span className="tnum font-semibold text-slate-200">
              {money.format(bill.nights * bill.rate)} so'm
            </span>
          </div>
        )}
        {bill.charges > 0 && (
          <div className="flex justify-between gap-4">
            <span className="text-slate-400">Room service</span>
            <span className="tnum font-semibold text-slate-200">
              {money.format(bill.charges)} so'm
            </span>
          </div>
        )}
        <div className="border-t border-white/10 pt-2">
          <div className="flex justify-between gap-4">
            <span className="font-bold text-white">Jami</span>
            <span className="tnum text-lg font-black text-emerald-300">
              {money.format(bill.total)} so'm
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-300 active:scale-95"
      >
        Yopish
      </button>
    </motion.div>
  )
}

export default function RoomDetailModal({ room, orders, maintenance, onClose, role, onCheckout, onClean }) {
  const toast = useToast()
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [cleanLoading, setCleanLoading] = useState(false)
  const [bill, setBill] = useState(null)

  const roomOrders = room ? orders.filter((o) => o.room === room.number) : []
  const roomTickets = room ? maintenance.filter((m) => m.room === room.number) : []
  const charges = roomOrders.reduce((sum, order) => sum + order.total, 0)
  const canCheckout = role === 'receptionist' || role === 'admin'
  const canClean = role === 'housekeeper' || role === 'admin'

  function handleClose() {
    setBill(null)
    setCheckoutLoading(false)
    setCleanLoading(false)
    onClose()
  }

  async function handleCheckout() {
    setCheckoutLoading(true)
    const res = await api.checkout(room.number)
    if (res.ok && res.data) {
      const b = {
        nights: res.data.nights ?? 1,
        rate: res.data.rate ?? room.rate ?? 480000,
        charges: res.data.charges ?? charges,
        total: res.data.grand_total ?? res.data.total ?? (res.data.nights ?? 1) * (res.data.rate ?? room.rate ?? 480000) + charges,
      }
      setBill(b)
      toast(`${room.number}-xona checkout qilindi`, 'success')
    } else {
      onCheckout(room.number)
      const localBill = {
        nights: 1,
        rate: room.rate ?? 480000,
        charges,
        total: (room.rate ?? 480000) + charges,
      }
      setBill(localBill)
      toast(`${room.number}-xona checkout qilindi (demo)`, 'success')
    }
    setCheckoutLoading(false)
  }

  async function handleClean() {
    setCleanLoading(true)
    const res = await api.cleanRoom(room.number)
    if (res.ok) {
      toast(`${room.number}-xona toza deb belgilandi`, 'success')
      handleClose()
    } else {
      onClean(room.number)
      toast(`${room.number}-xona toza deb belgilandi (demo)`, 'success')
      handleClose()
    }
    setCleanLoading(false)
  }

  return (
    <AnimatePresence>
      {room && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-8 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 28, rotateX: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 260, damping: 28 }}
            className="panel relative max-h-[88dvh] w-full max-w-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-transparent to-emerald-400/10" />

            <div className="relative flex items-start justify-between gap-4 border-b border-white/10 p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-200">
                  <BedIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Xona</p>
                  <h2 className="text-3xl font-black leading-none text-white">{room.number}</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={room.status} map={ROOM_STATUS} size="sm" />
                {canCheckout && room.status === 'OCCUPIED' && !bill && (
                  <button
                    type="button"
                    onClick={handleCheckout}
                    disabled={checkoutLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/30 bg-red-500/10 px-3 text-xs font-bold text-red-300 transition hover:bg-red-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checkoutLoading ? <SpinnerSvg className="h-3.5 w-3.5" /> : null}
                    Checkout
                  </button>
                )}
                {canClean && (room.status === 'DIRTY' || room.status === 'CLEANING') && (
                  <button
                    type="button"
                    onClick={handleClean}
                    disabled={cleanLoading}
                    className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 text-xs font-bold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cleanLoading ? <SpinnerSvg className="h-3.5 w-3.5" /> : null}
                    Tozalash
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Modalni yopish"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                {bill ? (
                  <BillBreakdown key="bill" bill={bill} onClose={handleClose} />
                ) : (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="grid gap-4 md:grid-cols-3"
                  >
                    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mehmon</p>
                      <p className="mt-2 text-lg font-bold text-white">{room.guest || "Bo'sh"}</p>
                      <p className="mt-3 text-sm text-slate-400">
                        {room.type} / {room.floor}-qavat
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{timeAgo(room.cleanSince)}</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room service</p>
                      <p className="mt-2 text-lg font-bold text-white">
                        <span className="tnum">{roomOrders.length}</span> buyurtma
                      </p>
                      <p className="mt-3 tnum text-sm text-slate-400">{money.format(charges)} so'm</p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Texnik</p>
                      <p className="mt-2 text-lg font-bold text-white">
                        <span className="tnum">{roomTickets.length}</span> so'rov
                      </p>
                      <p className="mt-3 tnum text-sm text-slate-400">
                        {money.format(room.rate ?? 480000)} so'm/tun
                      </p>
                    </div>

                    <div className="md:col-span-2">
                      <h3 className="text-sm font-bold text-white">Buyurtmalar</h3>
                      <div className="mt-3 space-y-2">
                        {roomOrders.length ? (
                          roomOrders.map((order) => (
                            <div key={order.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                              <div className="flex items-center justify-between gap-3">
                                <StatusBadge status={order.status} map={ORDER_STATUS} size="xs" />
                                <p className="tnum text-sm font-bold text-white">
                                  {money.format(order.total)} so'm
                                </p>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                                {order.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-500">
                            Buyurtma yo'q
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-white">Nosozliklar</h3>
                      <div className="mt-3 space-y-2">
                        {roomTickets.length ? (
                          roomTickets.map((ticket) => {
                            const cfg = PRIORITY[ticket.priority] ?? PRIORITY.LOW
                            return (
                              <div key={ticket.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.chip}`}
                                  >
                                    {cfg.label}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{ticket.status}</span>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">{ticket.issue}</p>
                              </div>
                            )
                          })
                        ) : (
                          <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-500">
                            Ochiq so'rov yo'q
                          </p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
