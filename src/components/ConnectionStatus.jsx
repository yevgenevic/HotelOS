import { motion, useReducedMotion } from 'framer-motion'

const CONFIG = {
  connected: {
    label: 'Jonli',
    dot: 'bg-emerald-400',
    ring: 'bg-emerald-400',
    text: 'text-emerald-300',
    chip: 'border-emerald-400/30 bg-emerald-500/10',
  },
  connecting: {
    label: 'Ulanmoqda…',
    dot: 'bg-amber-400',
    ring: 'bg-amber-400',
    text: 'text-amber-300',
    chip: 'border-amber-400/30 bg-amber-500/10',
  },
  disconnected: {
    label: 'Uzildi',
    dot: 'bg-red-500',
    ring: 'bg-red-500',
    text: 'text-red-300',
    chip: 'border-red-400/30 bg-red-500/10',
  },
  mock: {
    label: 'Demo live',
    dot: 'bg-cyan-400',
    ring: 'bg-cyan-400',
    text: 'text-cyan-200',
    chip: 'border-cyan-400/30 bg-cyan-500/10',
  },
}

/**
 * Live feed indicator (top-right). Green/amber/red dot with a pulsing "ping"
 * ring while live. Respects reduced-motion (static dot, no ping).
 */
export default function ConnectionStatus({ status }) {
  const reduce = useReducedMotion()
  const cfg = CONFIG[status] ?? CONFIG.connecting
  const animated = (status === 'connected' || status === 'mock') && !reduce

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Ma'lumot oqimi: ${cfg.label}`}
      className={`inline-flex items-center gap-2.5 rounded-full border ${cfg.chip} px-3.5 py-1.5 backdrop-blur-xl`}
    >
      <span className="relative flex h-2.5 w-2.5 items-center justify-center">
        {animated && (
          <span
            className={`absolute inline-flex h-full w-full rounded-full ${cfg.ring} animate-pulse-ring`}
          />
        )}
        <motion.span
          className={`relative inline-flex h-2.5 w-2.5 rounded-full ${cfg.dot}`}
          animate={
            animated ? { scale: [1, 1.15, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }
          }
          transition={{ duration: 1.8, repeat: animated ? Infinity : 0, ease: 'easeInOut' }}
        />
      </span>
      <span className={`text-sm font-semibold tracking-tight ${cfg.text}`}>{cfg.label}</span>
    </div>
  )
}
