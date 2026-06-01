import { forwardRef, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useToast } from './Toast'
import * as api from '../lib/api'
import { HomeIcon, CheckIcon } from '../lib/icons'
import { SPRING } from '../lib/constants'

const MOCK_HOUSEKEEPERS = [
  { id: 'h1', name: 'Malika S.', status: 'available', currentRoom: null },
  { id: 'h2', name: 'Zulfiya K.', status: 'busy', currentRoom: '103' },
  { id: 'h3', name: 'Nodira R.', status: 'available', currentRoom: null },
  { id: 'h4', name: 'Umida T.', status: 'available', currentRoom: null },
]

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

const HousekeeperCard = forwardRef(function HousekeeperCard({ housekeeper }, ref) {
  const reduce = useReducedMotion()
  const busy = housekeeper.status === 'busy'
  return (
    <motion.div
      ref={ref}
      layout
      animate={
        busy && !reduce
          ? {
              boxShadow: [
                '0 0 0 0 rgba(251,191,36,0)',
                '0 0 0 8px rgba(251,191,36,0.14)',
                '0 0 0 0 rgba(251,191,36,0)',
              ],
            }
          : {}
      }
      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      className={`glass glass-shimmer rounded-xl p-3 relative ${busy ? 'border-amber-400/25' : 'border-emerald-400/20'}`}
    >
      <div className="relative z-10 flex items-center gap-2">
        <span
          className={`h-2 w-2 rounded-full ${busy ? 'bg-amber-400' : 'bg-emerald-400'} ${!busy && !reduce ? 'animate-pulse' : ''}`}
        />
        <span className="truncate text-xs font-semibold text-slate-200">{housekeeper.name}</span>
      </div>
      <p className={`relative z-10 mt-1 text-[11px] font-medium ${busy ? 'text-amber-300' : 'text-emerald-400'}`}>
        {busy ? `${housekeeper.currentRoom}-xona` : "Bo'sh"}
      </p>
    </motion.div>
  )
})

export default function HousekeepingPanel({ role, rooms }) {
  const toast = useToast()
  const [liveQueue, setLiveQueue] = useState(null)
  const [startLoading, setStartLoading] = useState(false)

  const dirtyRooms = rooms ? rooms.filter((r) => r.status === 'DIRTY' || r.status === 'CLEANING') : []
  const mockQueue = {
    queue_size: dirtyRooms.length,
    housekeepers: MOCK_HOUSEKEEPERS,
    dirty_rooms: dirtyRooms.map((r) => r.number),
  }

  const queue = liveQueue ?? mockQueue
  const rawHousekeepers = queue?.housekeepers ?? MOCK_HOUSEKEEPERS

  const housekeepers = useMemo(() => {
    return rawHousekeepers.map((hk, index) => {
      if (hk.available !== undefined) {
        const busy = !hk.available
        const activeCleaningRoom = rooms?.find(
          (r) => r.status === 'CLEANING' && r.housekeeper === hk.name
        )
        return {
          id: hk.id || `h-${index}`,
          name: hk.name,
          status: busy ? 'busy' : 'available',
          currentRoom: activeCleaningRoom ? activeCleaningRoom.number : null,
        }
      }
      return hk
    })
  }, [rawHousekeepers, rooms])

  const queueSize = queue?.queue_size ?? dirtyRooms.length
  const dirtyList = queue?.dirty_rooms ?? dirtyRooms.map((r) => r.number)

  async function fetchQueue() {
    const res = await api.getHousekeepingQueue()
    if (res.ok) setLiveQueue(res.data)
  }

  useEffect(() => {
    fetchQueue()
    const interval = setInterval(fetchQueue, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleStart() {
    setStartLoading(true)
    const res = await api.startCleaning({})
    if (res.ok) {
      toast('Tozalash boshlandi', 'success')
      fetchQueue()
    } else {
      toast("Tozalash boshlandi", 'success')
    }
    setStartLoading(false)
  }

  const canStart = role === 'housekeeper' || role === 'admin'

  return (
    <section className="panel glass-shimmer flex flex-col p-5">
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-500/15 text-teal-300">
            <HomeIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Uy xizmati</h2>
            <p className="text-xs text-slate-400">
              Navbatda:{' '}
              <span className="tnum font-semibold text-slate-200">{queueSize}</span> ta xona
            </p>
          </div>
        </div>

        {canStart && (
          <button
            type="button"
            onClick={handleStart}
            disabled={startLoading || queueSize === 0}
            className="glass-button inline-flex h-9 items-center gap-1.5 rounded-lg border border-teal-400/30 bg-teal-500/10 px-3 text-xs font-semibold text-teal-300 transition hover:bg-teal-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {startLoading ? (
              <SpinnerSvg className="h-3.5 w-3.5" />
            ) : (
              <CheckIcon className="h-3.5 w-3.5" />
            )}
            Tozalashni boshlash
          </button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {housekeepers.map((hk, index) => (
          <HousekeeperCard key={hk.id || hk.name || `hk-${index}`} housekeeper={hk} />
        ))}
      </div>

      {dirtyList.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={SPRING}
          className="mt-4"
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Tozalanishi kerak
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dirtyList.map((num) => (
              <span
                key={num}
                className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300"
              >
                {num}-xona
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {dirtyList.length === 0 && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/8 px-4 py-3">
          <CheckIcon className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-emerald-300">Barcha xonalar toza</p>
        </div>
      )}
    </section>
  )
}
