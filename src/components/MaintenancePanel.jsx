import { forwardRef, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useToast } from './Toast'
import Select from './Select'
import * as api from '../lib/api'
import { PRIORITY, SPRING, timeAgo } from '../lib/constants'
import { WrenchIcon, CheckIcon, PlusIcon, XIcon } from '../lib/icons'

const PRIORITY_OPTS = [
  { value: 'CRITICAL', label: 'Kritik' },
  { value: 'HIGH', label: 'Yuqori' },
  { value: 'NORMAL', label: "O'rta" },
  { value: 'LOW', label: 'Past' },
]

const item = {
  initial: { opacity: 0, y: 16, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: SPRING },
  exit: { opacity: 0, x: -28, scale: 0.95, transition: { duration: 0.22, ease: 'easeIn' } },
}

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

const MaintenanceRow = forwardRef(function MaintenanceRow({ ticket, onAssign, onResolve, canAct }, ref) {
  const toast = useToast()
  const reduce = useReducedMotion()
  const cfg = PRIORITY[ticket.priority] ?? PRIORITY.LOW
  const [assignLoading, setAssignLoading] = useState(false)
  const [resolveLoading, setResolveLoading] = useState(false)

  async function handleAssign() {
    setAssignLoading(true)
    const res = await api.assignIssue(ticket.id)
    if (res.ok) {
      toast(`Ariza biriktirildi`, 'success')
    } else {
      onAssign(ticket.id)
    }
    setAssignLoading(false)
  }

  async function handleResolve() {
    setResolveLoading(true)
    const res = await api.resolveIssue(ticket.id)
    if (res.ok) {
      toast('Ariza hal qilindi', 'success')
    } else {
      onResolve(ticket.id)
      toast('Ariza hal qilindi (demo)', 'success')
    }
    setResolveLoading(false)
  }

  return (
    <motion.li ref={ref} layout variants={item} initial="initial" animate="animate" exit="exit">
      <div className="glass relative overflow-hidden rounded-xl py-3 pl-4 pr-3">
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
            <div className="flex flex-wrap items-center gap-2">
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
            {ticket.assignedTo && (
              <p className="mt-0.5 text-[11px] text-slate-500">→ {ticket.assignedTo}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">{timeAgo(ticket.reportedAt)}</p>
          </div>

          {canAct && (
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                onClick={handleAssign}
                disabled={ticket.status === 'ASSIGNED' || assignLoading}
                aria-label={`Xona ${ticket.room} nosozligini biriktirish`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-2.5 text-[11px] font-semibold text-cyan-300 transition hover:bg-cyan-500/20 active:scale-95 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/5 disabled:text-slate-500"
              >
                {assignLoading ? <SpinnerSvg className="h-3 w-3" /> : null}
                {ticket.status === 'ASSIGNED' ? 'Olindi' : 'Tayinlash'}
              </button>
              {ticket.status === 'ASSIGNED' && (
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={resolveLoading}
                  aria-label="Hal etildi"
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 text-[11px] font-semibold text-emerald-300 transition hover:bg-emerald-500/20 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resolveLoading ? <SpinnerSvg className="h-3 w-3" /> : <CheckIcon className="h-3 w-3" />}
                  Hal etildi
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.li>
  )
})

function IssueForm({ onSubmit, onCancel }) {
  const [room, setRoom] = useState('')
  const [priority, setPriority] = useState('NORMAL')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!room.trim()) {
      setError('Xona raqami kiritilishi kerak')
      setShakeKey((k) => k + 1)
      return
    }
    if (!description.trim()) {
      setError('Muammo tavsifi kiritilishi kerak')
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    await onSubmit(room.trim(), priority, description.trim())
    setLoading(false)
  }

  const fieldCls =
    'w-full rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-orange-300/50 focus:outline-none focus:ring-1 focus:ring-orange-300/30 transition'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="glass rounded-xl p-4 mb-3"
    >
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white">Yangi muammo</p>
        <button
          type="button"
          onClick={onCancel}
          className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:text-white"
        >
          <XIcon className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            value={room}
            onChange={(e) => { setRoom(e.target.value); setError('') }}
            type="text"
            placeholder="Xona raqami"
            className={fieldCls}
          />
          <Select value={priority} onChange={setPriority} options={PRIORITY_OPTS} />
        </div>

        <textarea
          value={description}
          onChange={(e) => { setDescription(e.target.value); setError('') }}
          placeholder="Muammo tavsifi…"
          rows={2}
          className={`${fieldCls} resize-none`}
        />

        <AnimatePresence>
          {error && (
            <motion.p
              key={shakeKey}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, x: [0, -6, 6, -4, 4, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              role="alert"
              className="text-xs font-medium text-red-300"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-orange-400/30 bg-orange-500/15 text-xs font-bold text-orange-300 transition hover:bg-orange-500/25 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? <SpinnerSvg className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
          Muammo qo'shish
        </button>
      </form>
    </motion.div>
  )
}

export default function MaintenancePanel({ maintenance, onAssign, onResolve, onAddIssue, role }) {
  const toast = useToast()
  const [showForm, setShowForm] = useState(false)

  const canAdd = role === 'technician' || role === 'admin'
  const canAct = role === 'technician' || role === 'admin'

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

  async function handleAddIssue(room, priority, description) {
    const res = await api.submitIssue({
      room_number: room,
      priority,
      description,
    })
    if (res.ok) {
      toast(`Xona ${room} uchun muammo qo'shildi`, 'success')
    } else {
      onAddIssue(room, description, priority)
      toast(`Xona ${room} uchun muammo qo'shildi (demo)`, 'success')
    }
    setShowForm(false)
  }

  return (
    <section className="panel flex max-h-[30rem] flex-col p-5">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-orange-500/15 text-orange-300">
            <WrenchIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Texnik xizmat</h2>
            <p className="text-xs text-slate-400">
              <span className="tnum">{sorted.length}</span> ta so'rov
              {criticalCount > 0 && (
                <span className="ml-1.5 font-medium text-red-300">
                  · <span className="tnum">{criticalCount}</span> kritik
                </span>
              )}
            </p>
          </div>
        </div>

        {canAdd && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition active:scale-95 ${
              showForm
                ? 'border-slate-400/20 bg-white/5 text-slate-400 hover:bg-white/10'
                : 'border-orange-400/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/20'
            }`}
          >
            {showForm ? <XIcon className="h-3.5 w-3.5" /> : <PlusIcon className="h-3.5 w-3.5" />}
            {showForm ? 'Bekor' : "Muammo qo'shish"}
          </button>
        )}
      </div>

      <motion.div layout className="scroll-area mask-fade-y mt-4 flex-1 overflow-y-auto pr-1">
        <AnimatePresence mode="popLayout" initial={false}>
          {showForm && (
            <IssueForm key="form" onSubmit={handleAddIssue} onCancel={() => setShowForm(false)} />
          )}
        </AnimatePresence>

        {sorted.length === 0 && !showForm ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-10 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-emerald-500/15 text-emerald-300">
              <CheckIcon className="h-5 w-5" />
            </span>
            <p className="text-sm text-slate-400">Ochiq muammolar yo'q</p>
          </div>
        ) : (
          <motion.ul layout className="flex flex-col gap-2.5">
            <AnimatePresence mode="popLayout" initial={false}>
              {sorted.map((ticket) => (
                <MaintenanceRow
                  key={ticket.id}
                  ticket={ticket}
                  onAssign={onAssign}
                  onResolve={onResolve}
                  canAct={canAct}
                />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </motion.div>
    </section>
  )
}
