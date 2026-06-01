import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import RoomCard from './RoomCard'
import { ROOM_STATUS, ROOM_STATUS_ORDER, SPRING } from '../lib/constants'
import { BedIcon } from '../lib/icons'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } },
}

/** Filter chip that doubles as a status legend (color + label + live count). */
function FilterChip({ active, onClick, dot, label, count }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-white/20 bg-white/10 text-white'
          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.07] hover:text-slate-200'
      }`}
    >
      {dot && <span className={`h-2 w-2 rounded-full ${dot}`} />}
      {label}
      <span className="tnum rounded-full bg-white/10 px-1.5 text-[10px] font-semibold text-slate-200">
        {count}
      </span>
    </button>
  )
}

/**
 * Responsive room grid (2 cols mobile → up to 4 cols on large screens).
 * Staggered entrance, layout animation, and status filtering — all driven by
 * Framer Motion with `mode="popLayout"` so filtered tiles reflow smoothly.
 */
export default function RoomGrid({
  rooms,
  query = '',
  selectedFloor = 'ALL',
  onFloorChange,
  onRoomSelect,
  highlightStatuses = [],
  onQuickCheckout,
}) {
  const [filter, setFilter] = useState('ALL')

  const counts = useMemo(() => {
    const c = { ALL: rooms.length }
    for (const key of ROOM_STATUS_ORDER) c[key] = 0
    for (const r of rooms) c[r.status] = (c[r.status] ?? 0) + 1
    return c
  }, [rooms])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = rooms.filter((room) => {
      const matchesStatus = filter === 'ALL' || room.status === filter
      const matchesFloor = selectedFloor === 'ALL' || String(room.floor) === String(selectedFloor)
      const haystack = `${room.number} ${room.type} ${room.status} ${room.guest ?? ''}`.toLowerCase()
      const matchesQuery = !q || haystack.includes(q)
      return matchesStatus && matchesFloor && matchesQuery
    })
    return [...list].sort((a, b) =>
      String(a.number).localeCompare(String(b.number), undefined, { numeric: true }),
    )
  }, [rooms, filter, query, selectedFloor])

  const floors = useMemo(
    () => ['ALL', ...Array.from(new Set(rooms.map((room) => room.floor))).sort((a, b) => a - b)],
    [rooms],
  )

  return (
    <section className="panel flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-500/15 text-indigo-300">
            <BedIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Xonalar holati</h2>
            <p className="text-xs text-slate-400">
              <span className="tnum">{rooms.length}</span> ta xona kuzatilmoqda
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-1 flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-black/15 p-1">
            {floors.map((floor) => (
              <button
                key={floor}
                type="button"
                onClick={() => onFloorChange?.(floor)}
                aria-pressed={selectedFloor === floor}
                className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  selectedFloor === floor
                    ? 'bg-cyan-300 text-slate-950'
                    : 'text-slate-400 hover:bg-white/10 hover:text-slate-200'
                }`}
              >
                {floor === 'ALL' ? 'Qavat' : floor}
              </button>
            ))}
          </div>
          <FilterChip
            active={filter === 'ALL'}
            onClick={() => setFilter('ALL')}
            label="Hammasi"
            count={counts.ALL}
          />
          {ROOM_STATUS_ORDER.map((key) => (
            <FilterChip
              key={key}
              active={filter === key}
              onClick={() => setFilter(key)}
              dot={ROOM_STATUS[key].dot}
              label={ROOM_STATUS[key].label}
              count={counts[key] ?? 0}
            />
          ))}
        </div>
      </div>

      <motion.div
        layout
        variants={container}
        initial="hidden"
        animate="show"
        className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-[repeat(auto-fit,minmax(10.5rem,1fr))]"
      >
        <AnimatePresence mode="popLayout">
          {visible.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              onClick={onRoomSelect ? () => onRoomSelect(room) : undefined}
              highlightStatuses={highlightStatuses}
              onQuickCheckout={onQuickCheckout}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {visible.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={SPRING}
          className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center"
        >
          <BedIcon className="h-8 w-8 text-slate-600" />
          <p className="text-sm text-slate-400">Bu holatdagi xonalar yo&apos;q</p>
        </motion.div>
      )}
    </section>
  )
}
