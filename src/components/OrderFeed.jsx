import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StatusBadge from './StatusBadge'
import { ORDER_STATUS, SPRING, timeAgo } from '../lib/constants'
import { TrayIcon } from '../lib/icons'

const money = new Intl.NumberFormat('uz-UZ')

const item = {
  initial: { opacity: 0, y: -24, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: { opacity: 0, x: 28, transition: { duration: 0.2, ease: 'easeIn' } },
}

const OrderRow = forwardRef(function OrderRow({ order }, ref) {
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

        <div className="mt-2 text-right">
          <span className="tnum text-sm font-semibold text-white">{money.format(order.total)}</span>
          <span className="ml-1 text-xs text-slate-400">so&apos;m</span>
        </div>
      </div>
    </motion.li>
  )
})

/** Room-service feed — newest order slides in from the top; status crossfades. */
export default function OrderFeed({ orders }) {
  const active = orders.filter((o) => o.status !== 'DELIVERED').length

  return (
    <section className="panel flex max-h-[26rem] flex-col p-5">
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

      <div className="scroll-area mask-fade-y mt-4 flex-1 overflow-y-auto pr-1">
        {orders.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <TrayIcon className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">Hozircha buyurtmalar yo&apos;q</p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {orders.map((order) => (
                <OrderRow key={order.id} order={order} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  )
}
