import { forwardRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ACTIVITY_TYPE, timeAgo } from '../lib/constants'
import { Icon, ActivityIcon } from '../lib/icons'

const item = {
  initial: { opacity: 0, y: -20, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { opacity: 0, y: 8, scale: 0.9, transition: { duration: 0.2, ease: 'easeIn' } },
}

const EventRow = forwardRef(function EventRow({ event }, ref) {
  const cfg = ACTIVITY_TYPE[event.type] ?? ACTIVITY_TYPE.system
  return (
    <motion.li ref={ref} layout variants={item} initial="initial" animate="animate" exit="exit">
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full ${cfg.bg} ${cfg.text}`}
        >
          <Icon name={cfg.icon} className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-slate-200">{event.message}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">{timeAgo(event.timestamp)}</p>
        </div>
      </div>
    </motion.li>
  )
})

/**
 * Rolling activity log — keeps the latest 20 events (capped in the data hook).
 * New events slide up from the bottom; as the list fills, the oldest are
 * squeezed out via `mode="popLayout"`.
 */
export default function ActivityLog({ activity }) {
  return (
    <section className="panel flex max-h-[24rem] flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-sky-500/15 text-sky-300">
          <ActivityIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">Faoliyat tarixi</h2>
          <p className="text-xs text-slate-400">Oxirgi 20 ta hodisa</p>
        </div>
      </div>

      <div className="scroll-area mask-fade-y mt-4 flex-1 overflow-y-auto pr-1">
        {activity.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <ActivityIcon className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">Faoliyat yo'q</p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {activity.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  )
}
