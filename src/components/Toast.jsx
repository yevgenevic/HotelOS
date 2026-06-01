import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckIcon, AlertIcon, ActivityIcon } from '../lib/icons'

const ToastCtx = createContext(() => {})
let nextId = 0

const VARIANTS = {
  success: {
    wrap: 'border-emerald-500/30 bg-emerald-950/80',
    icon: 'bg-emerald-500/20 text-emerald-300',
    text: 'text-emerald-100',
    Icon: CheckIcon,
  },
  error: {
    wrap: 'border-red-500/30 bg-red-950/80',
    icon: 'bg-red-500/20 text-red-300',
    text: 'text-red-100',
    Icon: AlertIcon,
  },
  info: {
    wrap: 'border-cyan-500/30 bg-slate-900/80',
    icon: 'bg-cyan-500/20 text-cyan-300',
    text: 'text-slate-100',
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
        className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col-reverse gap-2 sm:bottom-6 sm:right-6"
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
                className={`pointer-events-auto flex min-w-[240px] max-w-sm items-start gap-3 rounded-2xl border ${v.wrap} px-4 py-3 shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl`}
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
