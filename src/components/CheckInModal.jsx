import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useToast } from './Toast'
import Select from './Select'
import * as api from '../lib/api'
import { UserIcon, BedIcon, CheckIcon, XIcon } from '../lib/icons'
import { SPRING_SOFT } from '../lib/constants'

const ROOM_TYPE_OPTS = [
  { value: 'Single', label: 'Single' },
  { value: 'Double', label: 'Double' },
  { value: 'Suite', label: 'Suite' },
  { value: 'Accessible', label: 'Accessible' },
]
const FLOOR_OPTS = [
  { value: '', label: 'Istalgan qavat' },
  { value: '1', label: '1-qavat' },
  { value: '2', label: '2-qavat' },
  { value: '3', label: '3-qavat' },
  { value: '4', label: '4-qavat' },
]
const PROXIMITY_OPTS = [
  { value: '', label: "Muhim emas" },
  { value: 'elevator', label: 'Liftga yaqin' },
  { value: 'stairs', label: 'Zinapoyaga yaqin' },
  { value: 'middle', label: "O'rtada" },
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

function SuccessView({ name, data, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={SPRING_SOFT}
      className="flex flex-col items-center gap-4 py-6"
    >
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
        <CheckIcon className="h-8 w-8" />
      </span>
      <div className="text-center">
        <p className="text-lg font-bold text-white">{name} joylashtirildi</p>
        {data?.room_number && (
          <p className="mt-1 text-sm text-slate-400">
            Xona:{' '}
            <span className="font-semibold text-cyan-300">{data.room_number}</span>
            {data.guest_id && (
              <>
                {' '}· Mehmon ID:{' '}
                <span className="font-semibold text-slate-200">{data.guest_id}</span>
              </>
            )}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-300 px-8 text-sm font-bold text-slate-950 transition hover:bg-cyan-200 active:scale-95"
      >
        Yopish
      </button>
    </motion.div>
  )
}

export default function CheckInModal({ open, onClose, checkinGuest }) {
  const toast = useToast()
  const [name, setName] = useState('')
  const [type, setType] = useState('Double')
  const [floor, setFloor] = useState('')
  const [proximity, setProximity] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState('')
  const [shakeKey, setShakeKey] = useState(0)

  function resetForm() {
    setName('')
    setType('Double')
    setFloor('')
    setProximity('')
    setLoading(false)
    setSuccess(null)
    setError('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Mehmon ismi talab qilinadi")
      setShakeKey((k) => k + 1)
      return
    }
    setLoading(true)
    setError('')

    const res = await api.checkin({
      guest_name: name.trim(),
      room_type: type.toUpperCase(),
      floor_preference: floor ? Number(floor) : undefined,
      proximity_preference: proximity || undefined,
    })

    if (res.ok) {
      setSuccess(res.data)
      toast(`${name} joylashtirildi`, 'success')
    } else {
      checkinGuest({ name: name.trim(), type, floor: floor || undefined, proximity: proximity || undefined })
      toast(`${name} joylashtirildi`, 'success')
      handleClose()
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center glass-backdrop px-4 py-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => e.target === e.currentTarget && handleClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Yangi mehmon joylash"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="panel glass-shimmer relative w-full max-w-md p-6"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/10 via-transparent to-indigo-500/8" />

            <div className="relative z-10 flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <BedIcon className="h-5 w-5" />
                </span>
                <h2 className="text-base font-bold text-white">Yangi mehmon joylash</h2>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Yopish"
                className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            <div className="relative z-10">
              {success ? (
                <SuccessView name={name} data={success} onClose={handleClose} />
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Mehmon ismi <span className="text-red-400">*</span>
                    </label>
                    <div className="glass-input rounded-xl px-3 py-2.5 flex items-center gap-2 transition">
                      <UserIcon className="h-4 w-4 shrink-0 text-slate-400" />
                      <input
                        value={name}
                        onChange={(e) => { setName(e.target.value); setError('') }}
                        type="text"
                        autoFocus
                        placeholder="Ism Familiya"
                        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Xona turi
                    </label>
                    <Select value={type} onChange={setType} options={ROOM_TYPE_OPTS} />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Qavat (ixtiyoriy)
                      </label>
                      <Select value={floor} onChange={setFloor} options={FLOOR_OPTS} />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Joylashuv (ixtiyoriy)
                      </label>
                      <Select value={proximity} onChange={setProximity} options={PROXIMITY_OPTS} />
                    </div>
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.p
                        key={shakeKey}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, x: [0, -8, 8, -5, 5, 0] }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        role="alert"
                        className="text-sm font-medium text-red-300"
                      >
                        {error}
                      </motion.p>
                    )}
                  </AnimatePresence>

                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl glass-button px-4 text-sm font-black text-cyan-100 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <SpinnerSvg className="h-4 w-4" />
                        Joylashtirilmoqda…
                      </>
                    ) : (
                      <>
                        <BedIcon className="h-4 w-4" />
                        Joylash
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
