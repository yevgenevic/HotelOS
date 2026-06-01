import { useState } from 'react'
import { motion } from 'framer-motion'
import { BuildingIcon, LockIcon } from '../lib/icons'
import Select from './Select'

const MOCK_USERS = {
  admin:        { password: 'hotel2024' },
  receptionist: { password: 'hotel2024' },
  housekeeper:  { password: 'hotel2024' },
  roomservice:  { password: 'hotel2024' },
  technician:   { password: 'hotel2024' },
}

const ROLES = [
  { value: 'admin',        label: 'Administrator' },
  { value: 'receptionist', label: 'Receptionist'  },
  { value: 'housekeeper',  label: 'Housekeeper'   },
  { value: 'roomservice',  label: 'Room Service'  },
  { value: 'technician',   label: 'Technician'    },
]

export default function LoginScreen({ onLogin, validToken = 'hotel2024' }) {
  const [role, setRole] = useState('admin')
  const [password, setPassword] = useState(MOCK_USERS.admin.password)
  const [error, setError] = useState('')

  function handleRoleChange(newRole) {
    setRole(newRole)
    setPassword(MOCK_USERS[newRole]?.password ?? validToken)
    setError('')
  }

  async function submit(e) {
    e.preventDefault()
    setError('')
    
    const BASE = import.meta.env.VITE_API_URL
    if (BASE) {
      try {
        const usernameMap = {
          admin: 'admin',
          receptionist: 'receptionist',
          housekeeper: 'housekeeper',
          roomservice: 'roomservice',
          technician: 'technician',
        }
        const username = usernameMap[role] || role
        const details = {
          username: username,
          password: password,
        }
        
        let formBody = []
        for (const property in details) {
          const encodedKey = encodeURIComponent(property)
          const encodedValue = encodeURIComponent(details[property])
          formBody.push(encodedKey + "=" + encodedValue)
        }
        formBody = formBody.join("&")

        const res = await fetch(`${BASE}/auth/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
          },
          body: formBody
        })
        
        const data = await res.json().catch(() => null)
        if (res.ok && data?.access_token) {
          onLogin(data.access_token, data.role)
          return
        } else {
          setError(data?.detail || data?.error || `Noto'g'ri parol`)
          return
        }
      } catch (err) {
        console.warn('Backend login connection failed, falling back to mock login.', err)
      }
    }

    const expected = MOCK_USERS[role]?.password ?? validToken
    if (password.trim() !== expected) {
      setError(`Noto'g'ri parol`)
      return
    }
    onLogin(password.trim(), role)
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

          <label className="mt-6 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Role
          </label>
          <div className="mt-2">
            <Select value={role} onChange={handleRoleChange} options={ROLES} />
          </div>

          <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-400">
            Password
          </label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 focus-within:ring-2 focus-within:ring-cyan-300/60 transition">
            <LockIcon className="h-4 w-4 text-slate-400" />
            <input
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError('') }}
              type="text"
              autoComplete="current-password"
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
