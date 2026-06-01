import { forwardRef } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from 'framer-motion'
import { ROOM_STATUS, SPRING } from '../lib/constants'
import StatusBadge from './StatusBadge'
import { BedIcon, UserIcon } from '../lib/icons'

const variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: SPRING },
  exit: { opacity: 0, scale: 0.85, transition: { duration: 0.18, ease: 'easeIn' } },
}

const RoomCard = forwardRef(function RoomCard(
  { room, onClick, highlightStatuses = [], onQuickCheckout },
  ref,
) {
  const reduce = useReducedMotion()
  const cfg = ROOM_STATUS[room.status] ?? ROOM_STATUS.CLEAN

  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const rotateX = useSpring(useTransform(py, [-0.5, 0.5], [9, -9]), SPRING)
  const rotateY = useSpring(useTransform(px, [-0.5, 0.5], [-9, 9]), SPRING)

  const isHighlighted = highlightStatuses.includes(room.status)
  const highlightColor =
    room.status === 'DIRTY'
      ? 'border-amber-400'
      : room.status === 'MAINTENANCE'
      ? 'border-orange-400'
      : 'border-cyan-400'

  function handleMove(e) {
    if (reduce) return
    const rect = e.currentTarget.getBoundingClientRect()
    px.set((e.clientX - rect.left) / rect.width - 0.5)
    py.set((e.clientY - rect.top) / rect.height - 0.5)
  }
  function reset() {
    px.set(0)
    py.set(0)
  }

  return (
    <motion.div
      ref={ref}
      layout
      layoutId={`room-${room.id}`}
      variants={variants}
      exit="exit"
      whileHover={reduce ? undefined : { scale: 1.03 }}
      whileTap={(!reduce && onClick) ? { scale: 0.98 } : undefined}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
      className={`group relative [perspective:900px] ${onClick ? 'cursor-pointer' : ''}`}
    >
      <motion.div
        style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 900 }}
        className={`panel relative h-full overflow-hidden rounded-2xl p-4 ring-1 ring-white/5 transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_28px_80px_rgba(0,0,0,0.42)] ${cfg.ring}`}
      >
        {/* Hover glow layers */}
        <div className="pointer-events-none absolute -inset-10 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100">
          <div className={`h-full w-full bg-gradient-to-br ${cfg.glow} via-cyan-400/10 to-transparent`} />
        </div>
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${cfg.glow} via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
        />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Status accent bar */}
        <div className={`absolute inset-x-0 top-0 h-1 ${cfg.bar} opacity-80 transition-colors duration-500`} />

        {/* Pulsing border highlight (housekeeper dirty / technician maintenance) */}
        {isHighlighted && !reduce && (
          <motion.div
            className={`pointer-events-none absolute inset-0 rounded-2xl border-2 ${highlightColor}`}
            animate={{ opacity: [0.85, 0.18, 0.85] }}
            transition={{ duration: 1.7, repeat: Infinity, ease: 'easeInOut' }}
          />
        )}

        {/* Quick checkout overlay (receptionist only, OCCUPIED rooms) */}
        {onQuickCheckout && room.status === 'OCCUPIED' && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-black/65 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onQuickCheckout(room.number) }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-cyan-300 px-4 text-xs font-bold text-slate-950 shadow-lg transition hover:bg-cyan-200 active:scale-95"
            >
              Checkout
            </button>
          </div>
        )}

        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Xona</p>
            <p className="tnum text-3xl font-bold leading-tight text-white">{room.number}</p>
          </div>
          <StatusBadge status={room.status} map={ROOM_STATUS} size="xs" />
        </div>

        <div className="relative mt-2 flex min-w-0 items-center gap-1.5 text-sm text-slate-300">
          <BedIcon className="h-4 w-4 shrink-0 text-slate-400" />
          <span className="truncate">{room.type}</span>
        </div>

        <div className="relative mt-3 border-t border-white/10 pt-3">
          {room.guest ? (
            <div className="flex items-center gap-2">
              <span className={`grid h-7 w-7 place-items-center rounded-full ${cfg.chip}`}>
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm font-medium text-slate-200">{room.guest}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span className="grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-white/5">
                <UserIcon className="h-3.5 w-3.5" />
              </span>
              <span>Bo&apos;sh</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
})

export default RoomCard
