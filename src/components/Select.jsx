import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'

function ChevronDownIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/**
 * Accessible custom dropdown that renders its list via position:fixed so it
 * escapes any overflow:hidden ancestor (modals, scroll containers, etc.).
 *
 * Props:
 *   value    – currently selected value string
 *   onChange – called with the new value string (not a DOM event)
 *   options  – [{ value: string, label: string }]
 *   placeholder – shown when nothing is selected
 */
export default function Select({ value, onChange, options, placeholder = 'Tanlang' }) {
  const [open, setOpen] = useState(false)
  const [focusedIdx, setFocusedIdx] = useState(-1)
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 })
  const buttonRef = useRef(null)
  const listRef = useRef(null)

  const selected = options.find((o) => o.value === value)

  function updatePos() {
    if (!buttonRef.current) return
    const r = buttonRef.current.getBoundingClientRect()
    setPos({ top: r.bottom + 4, left: r.left, width: r.width })
  }

  function toggleOpen() {
    updatePos()
    setOpen((v) => !v)
    setFocusedIdx(Math.max(0, options.findIndex((o) => o.value === value)))
  }

  function selectOption(val) {
    onChange(val)
    setOpen(false)
    buttonRef.current?.focus()
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleDown(e) {
      if (!buttonRef.current?.contains(e.target) && !listRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleDown)
    return () => document.removeEventListener('mousedown', handleDown)
  }, [open])

  // Close when the viewport scrolls (position:fixed list would drift)
  useEffect(() => {
    if (!open) return
    function onScroll() { setOpen(false) }
    window.addEventListener('scroll', onScroll, true)
    return () => window.removeEventListener('scroll', onScroll, true)
  }, [open])

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        toggleOpen()
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedIdx((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setFocusedIdx((i) => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (focusedIdx >= 0 && focusedIdx < options.length) {
          selectOption(options[focusedIdx].value)
        }
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  return (
    <div className="relative w-full" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggleOpen}
        className="glass-input flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl px-3 text-sm transition hover:bg-white/[0.09] focus:outline-none"
      >
        <span className={`min-w-0 truncate text-left ${selected ? 'text-white' : 'text-slate-500'}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Portal escapes any CSS transform or overflow:hidden ancestor (e.g.
          framer-motion's rotateX on LoginScreen) so position:fixed works
          correctly relative to the actual viewport. */}
      {createPortal(
        <AnimatePresence>
          {open && (
            <motion.ul
              key="select-listbox"
              ref={listRef}
              role="listbox"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.14, ease: 'easeOut' }}
              style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9980 }}
              className="glass scroll-area max-h-56 overflow-y-auto rounded-xl border border-white/15 py-1 shadow-[0_16px_40px_rgba(0,0,0,0.55)]"
            >
              {options.map((opt, i) => (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={opt.value === value}
                  onClick={() => selectOption(opt.value)}
                  onMouseEnter={() => setFocusedIdx(i)}
                  className={`flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm transition-colors ${
                    opt.value === value
                      ? 'bg-cyan-500/20 text-cyan-200 backdrop-blur-sm'
                      : i === focusedIdx
                      ? 'bg-white/[0.10] text-slate-100 backdrop-blur-sm'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:backdrop-blur-sm'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors ${
                      opt.value === value ? 'bg-cyan-400' : 'bg-transparent'
                    }`}
                  />
                  {opt.label}
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
