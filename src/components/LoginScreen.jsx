import { useState } from 'react'
import { motion } from 'framer-motion'
import { BuildingIcon, LockIcon } from '../lib/icons'

export default function LoginScreen({ onLogin, validToken = 'hotel2024' }) {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [showHint, setShowHint] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (token.trim() !== validToken) {
      setError('Noto\'g\'ri token. Demo uchun: hotel2024')
      return
    }
    onLogin(token.trim())
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <motion.form
        initial={{ opacity: 0, y: 18, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        onSubmit={submit}
        className="panel relative w-full max-w-md overflow-hidden p-6 shadow-[0_28px_90px_rgba(0,0,0,0.42)]"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/12 via-transparent to-emerald-400/10" />
        <div className="relative">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 text-white shadow-lg shadow-cyan-500/25">
            <BuildingIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-tight text-white">HotelOS</h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            GrandStay mehmonxonasi — operatsion boshqaruv paneli
          </p>

          {/* Credential hint for demo */}
          <div className="mt-5 flex items-start gap-2 rounded-lg border border-cyan-400/20 bg-cyan-400/8 px-3 py-2.5 text-xs text-cyan-300">
            <span className="mt-0.5 shrink-0">ℹ</span>
            <span>
              Demo kirish tokeni:{' '}
              <button
                type="button"
                onClick={() => { setShowHint((v) => !v); setToken(validToken) }}
                className="font-mono font-bold underline decoration-dotted hover:text-cyan-100"
              >
                {showHint ? validToken : '••••••••••'}
              </button>
              {' '}(ko'rish / to'ldirish uchun bosing)
            </span>
          </div>

          <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Access token
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:ring-2 focus-within:ring-cyan-300/60">
            <LockIcon className="h-4 w-4 text-slate-400" />
            <input
              value={token}
              onChange={(e) => {
                setToken(e.target.value)
                setError('')
              }}
              type="text"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm font-medium text-white outline-none placeholder:text-slate-600"
              placeholder="hotel2024"
            />
          </div>
          {error && <p className="mt-2 text-sm font-medium text-red-300">{error}</p>}

          <button
            type="submit"
            className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 text-sm font-black text-slate-950 shadow-lg shadow-cyan-400/20 transition hover:bg-cyan-200 active:scale-[0.98]"
          >
            <LockIcon className="h-4 w-4" />
            Kirish
          </button>
        </div>
      </motion.form>
    </main>
  )
}
