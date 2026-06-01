import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { SPRING } from '../lib/constants'

/**
 * Animated status pill: a colored dot + label inside a tinted chip.
 *
 * When `status` changes the whole chip crossfades to the new color/label
 * (the "rang animatsiyasi" requested for orders). Status is conveyed by dot +
 * text, never color alone — so it stays readable for color-blind users.
 *
 * @param {string} status  status key (e.g. "CLEAN", "PENDING")
 * @param {object} map     a config map from constants (ROOM_STATUS / ORDER_STATUS)
 */
export default function StatusBadge({ status, map, size = 'sm' }) {
  const reduce = useReducedMotion()
  const cfg =
    map[status] ?? {
      label: status,
      dot: 'bg-slate-400',
      chip: 'border-white/10 bg-white/5 text-slate-300',
    }

  const pad = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'

  return (
    <span className="relative inline-flex shrink-0">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={status}
          initial={reduce ? false : { opacity: 0, y: -4, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.92 }}
          transition={SPRING}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-full border font-medium ${pad} ${cfg.chip}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
          <span className="truncate">{cfg.label}</span>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
