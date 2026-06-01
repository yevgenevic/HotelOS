import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, AlertIcon, ActivityIcon } from '../lib/icons'

const ToastCtx = createContext(() => {})
let nextId = 0

const VARIANTS = {
  success: {
    wrap: 'border-emerald-300/50 bg-white/70',
    icon: 'bg-emerald-100 text-emerald-600',
    text: 'text-emerald-800',
    Icon: CheckIcon,
  },
  error: {
    wrap: 'border-red-300/50 bg-white/70',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-800',
    Icon: AlertIcon,
  },
  info: {
    wrap: 'border-indigo-300/50 bg-white/70',
    icon: 'bg-indigo-100 text-indigo-600',
    text: 'text-slate-700',
    Icon: ActivityIcon,
  },
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const toast = useCallback((message, type = 'info') => {
    const id = ++nextId
    setToasts((prev) => [...prev, { id, message, type }])
    timers.current[id] = setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
      delete timers.current[id]
    }, 3000)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 sm:bottom-6 sm:right-6 no-print"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {toasts.map((t) => {
            const v = VARIANTS[t.type] ?? VARIANTS.info
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 56, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 56, scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 340, damping: 28 }}
                className={`pointer-events-auto flex min-w-[240px] max-w-sm items-start gap-3 rounded-2xl border ${v.wrap} px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.10)] backdrop-blur-xl`}
              >
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${v.icon}`}>
                  <v.Icon className="h-3.5 w-3.5" />
                </span>
                <p className={`text-sm font-medium leading-snug ${v.text}`}>{t.message}</p>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
