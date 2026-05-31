import { AnimatePresence, motion } from 'framer-motion'
import StatusBadge from './StatusBadge'
import { ROOM_STATUS, timeAgo } from '../lib/constants'
import { BedIcon, XIcon } from '../lib/icons'

const money = new Intl.NumberFormat('uz-UZ')

export default function RoomDetailModal({ room, orders, maintenance, onClose }) {
  const roomOrders = room ? orders.filter((o) => o.room === room.number) : []
  const roomTickets = room ? maintenance.filter((m) => m.room === room.number) : []
  const charges = roomOrders.reduce((sum, order) => sum + order.total, 0)

  return (
    <AnimatePresence>
      {room && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 px-4 py-8 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Modalni yopish"
                  className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="relative grid gap-4 overflow-y-auto p-5 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mehmon</p>
                <p className="mt-2 text-lg font-bold text-white">{room.guest || "Bo'sh"}</p>
                <p className="mt-3 text-sm text-slate-400">{room.type} / {room.floor}-qavat</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Room service</p>
                <p className="mt-2 text-lg font-bold text-white">{roomOrders.length} buyurtma</p>
                <p className="mt-3 text-sm text-slate-400">{money.format(charges)} som</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Texnik</p>
                <p className="mt-2 text-lg font-bold text-white">{roomTickets.length} so'rov</p>
                <p className="mt-3 text-sm text-slate-400">{timeAgo(room.cleanSince)}</p>
              </div>

              <div className="md:col-span-2">
                <h3 className="text-sm font-bold text-white">Buyurtmalar</h3>
                <div className="mt-3 space-y-2">
                  {roomOrders.length ? (
                    roomOrders.map((order) => (
                      <div key={order.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-slate-200">{order.status}</p>
                          <p className="text-sm font-bold text-white">{money.format(order.total)} som</p>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                          {order.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-500">Buyurtma yo'q</p>
                  )}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white">Maintenance</h3>
                <div className="mt-3 space-y-2">
                  {roomTickets.length ? (
                    roomTickets.map((ticket) => (
                      <div key={ticket.id} className="rounded-xl border border-white/10 bg-black/15 p-3">
                        <p className="text-sm font-semibold text-slate-200">{ticket.priority} / {ticket.status}</p>
                        <p className="mt-1 text-xs text-slate-400">{ticket.issue}</p>
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-white/10 bg-black/15 p-3 text-sm text-slate-500">Ochiq so'rov yo'q</p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
