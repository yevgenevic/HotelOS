import { useEffect, useState } from 'react'
import { animate, motion, useReducedMotion } from 'framer-motion'
import { SPRING } from '../lib/constants'
import { Icon } from '../lib/icons'

/** Counts up to `value` on change (instant when reduced-motion is on). */
function AnimatedNumber({ value }) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      return
    }
    const controls = animate(display, value, {
      duration: 0.5,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce])

  return <span className="tnum">{Math.round(display)}</span>
}

const TONES = {
  indigo: { bg: 'bg-indigo-500/15', fg: 'text-indigo-300' },
  blue: { bg: 'bg-blue-500/15', fg: 'text-blue-300' },
  emerald: { bg: 'bg-emerald-500/15', fg: 'text-emerald-300' },
  amber: { bg: 'bg-amber-500/15', fg: 'text-amber-300' },
  violet: { bg: 'bg-violet-500/15', fg: 'text-violet-300' },
  red: { bg: 'bg-red-500/15', fg: 'text-red-300' },
}

function StatCard({ icon, label, value, tone, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, rotateX: 4, rotateY: -3 }}
      transition={{ ...SPRING, delay: index * 0.04 }}
      className="panel group relative flex items-center gap-3 overflow-hidden p-3.5 [transform-style:preserve-3d]"
    >
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone.bg} ${tone.fg} shadow-[0_12px_32px_rgba(0,0,0,0.22)]`}>
        <Icon name={icon} className="h-5 w-5" />
      </span>
      <div className="relative min-w-0">
        <div className="text-2xl font-bold leading-none text-white">
          <AnimatedNumber value={value} />
        </div>
        <div className="mt-1 truncate text-xs font-medium text-slate-400">{label}</div>
      </div>
    </motion.div>
  )
}

/** KPI strip — at-a-glance hotel operations health, derived from live state. */
export default function StatBar({ rooms, orders, maintenance }) {
  const occupied = rooms.filter((r) => r.status === 'OCCUPIED').length
  const clean = rooms.filter((r) => r.status === 'CLEAN').length
  const needsCleaning = rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING').length
  const unavailable = rooms.filter((r) => r.status === 'MAINTENANCE').length
  const activeOrders = orders.filter((o) => o.status !== 'DELIVERED').length
  const critical = maintenance.filter((m) => m.priority === 'CRITICAL').length

  const stats = [
    { icon: 'building', label: 'Jami xonalar', value: rooms.length, tone: TONES.indigo },
    { icon: 'user', label: 'Band', value: occupied, tone: TONES.blue },
    { icon: 'check', label: "Bo'sh & toza", value: clean, tone: TONES.emerald },
    { icon: 'bed', label: unavailable ? 'Texnik/tozalash' : 'Tozalash kerak', value: needsCleaning + unavailable, tone: TONES.amber },
    { icon: 'tray', label: 'Faol buyurtma', value: activeOrders, tone: TONES.violet },
    { icon: 'alert', label: 'Kritik nosozlik', value: critical, tone: TONES.red },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
      {stats.map((s, i) => (
        <StatCard key={s.label} index={i} {...s} />
      ))}
    </div>
  )
}
