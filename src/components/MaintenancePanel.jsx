import { forwardRef, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { PRIORITY, SPRING, timeAgo } from '../lib/constants'
import { WrenchIcon, CheckIcon } from '../lib/icons'

const item = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: { opacity: 0, x: -28, scale: 0.95, transition: { duration: 0.22, ease: 'easeIn' } },
}

const MaintenanceRow = forwardRef(function MaintenanceRow({ ticket, onAssign }, ref) {
  const reduce = useReducedMotion()
  const cfg = PRIORITY[ticket.priority] ?? PRIORITY.LOW

  return (
    <motion.li ref={ref} layout variants={item} initial="initial" animate="animate" exit="exit">
      <div className="glass relative overflow-hidden rounded-xl py-3 pl-4 pr-3">
        {/* priority accent bar — pulses for CRITICAL */}
        <span className={`absolute inset-y-0 left-0 w-1 ${cfg.accent} opacity-80`} />
        {cfg.pulse && !reduce && (
          <motion.span
            className="absolute inset-y-0 left-0 w-1 bg-red-500"
            animate={{ opacity: [0.9, 0.2, 0.9] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex items-center">
                {cfg.pulse && !reduce && (
                  <span className="absolute -left-0.5 h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse-ring" />
                )}
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cfg.chip}`}
                >
                  {cfg.label}
                </span>
              </span>
              <span className="text-xs font-semibold text-slate-200">Xona {ticket.room}</span>
              {ticket.status === 'ASSIGNED' && (
                <span className="rounded-md border border-cyan-300/20 bg-cyan-300/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan-200">
                  Biriktirilgan
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-300">{ticket.issue}</p>
            <p className="mt-1 text-[11px] text-slate-500">{timeAgo(ticket.reportedAt)}</p>
          </div>

          <button
            type="button"
            onClick={() => onAssign(ticket.id)}
            disabled={ticket.status === 'ASSIGNED'}
            aria-label={`Xona ${ticket.room} nosozligini biriktirish`}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 text-xs font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
          >
            <CheckIcon className="h-4 w-4" />
            {ticket.status === 'ASSIGNED' ? 'Olindi' : 'Biriktirish'}
          </button>
        </div>
      </div>
    </motion.li>
  )
})

/** Maintenance queue, priority-sorted. Assigning a ticket animates it out. */
export default function MaintenancePanel({ maintenance, onAssign }) {
  const sorted = useMemo(
    () =>
      [...maintenance].sort((a, b) => {
        const ra = PRIORITY[a.priority]?.rank ?? 99
        const rb = PRIORITY[b.priority]?.rank ?? 99
        if (ra !== rb) return ra - rb
        return a.reportedAt - b.reportedAt
      }),
    [maintenance],
  )

  const criticalCount = sorted.filter((t) => t.priority === 'CRITICAL').length

  return (
    <section className="panel flex max-h-[26rem] flex-col p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/15 text-orange-300">
          <WrenchIcon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-white">Texnik xizmat</h2>
          <p className="text-xs text-slate-400">
            <span className="tnum">{sorted.length}</span> ta so&apos;rov
            {criticalCount > 0 && (
              <span className="ml-1.5 font-medium text-red-300">
                · <span className="tnum">{criticalCount}</span> kritik
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="scroll-area mask-fade-y mt-4 flex-1 overflow-y-auto pr-1">
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckIcon className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-400">Hammasi joyida — ochiq so&apos;rovlar yo&apos;q</p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {sorted.map((ticket) => (
                <MaintenanceRow key={ticket.id} ticket={ticket} onAssign={onAssign} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
    </section>
  )
}
