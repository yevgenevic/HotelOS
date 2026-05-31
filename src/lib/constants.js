// ---------------------------------------------------------------------------
// Shared design tokens & domain config
//
// NOTE: Tailwind's JIT compiler only keeps classes that appear *literally* in
// source. That's why every status maps to complete class strings here instead
// of being built dynamically like `text-${color}-400` (which would get purged).
// ---------------------------------------------------------------------------

/** The one spring used across the whole app — keeps motion rhythm consistent. */
export const SPRING = { type: 'spring', stiffness: 300, damping: 30 }
export const SPRING_SOFT = { type: 'spring', stiffness: 260, damping: 26 }

// --- Room housekeeping status -----------------------------------------------
// CLEAN = green · DIRTY = red · CLEANING = yellow · OCCUPIED = blue
export const ROOM_STATUS = {
  CLEAN: {
    label: 'Toza',
    dot: 'bg-emerald-400',
    text: 'text-emerald-300',
    chip: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
    bar: 'bg-emerald-400',
    glow: 'from-emerald-500/25',
    ring: 'group-hover:ring-emerald-400/40',
  },
  DIRTY: {
    label: 'Iflos',
    dot: 'bg-red-400',
    text: 'text-red-300',
    chip: 'border-red-400/30 bg-red-500/15 text-red-300',
    bar: 'bg-red-400',
    glow: 'from-red-500/25',
    ring: 'group-hover:ring-red-400/40',
  },
  CLEANING: {
    label: 'Tozalanmoqda',
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    chip: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
    bar: 'bg-amber-400',
    glow: 'from-amber-500/25',
    ring: 'group-hover:ring-amber-400/40',
  },
  OCCUPIED: {
    label: 'Band',
    dot: 'bg-blue-400',
    text: 'text-blue-300',
    chip: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
    bar: 'bg-blue-400',
    glow: 'from-blue-500/25',
    ring: 'group-hover:ring-blue-400/40',
  },
  MAINTENANCE: {
    label: 'Texnik',
    dot: 'bg-orange-400',
    text: 'text-orange-300',
    chip: 'border-orange-400/30 bg-orange-500/15 text-orange-300',
    bar: 'bg-orange-400',
    glow: 'from-orange-500/25',
    ring: 'group-hover:ring-orange-400/40',
  },
}

export const ROOM_STATUS_ORDER = ['CLEAN', 'OCCUPIED', 'CLEANING', 'DIRTY', 'MAINTENANCE']

// --- Order lifecycle status -------------------------------------------------
export const ORDER_STATUS = {
  PENDING: {
    label: 'Kutilmoqda',
    dot: 'bg-amber-400',
    chip: 'border-amber-400/30 bg-amber-500/15 text-amber-300',
  },
  PREPARING: {
    label: 'Tayyorlanmoqda',
    dot: 'bg-blue-400',
    chip: 'border-blue-400/30 bg-blue-500/15 text-blue-300',
  },
  READY: {
    label: 'Tayyor',
    dot: 'bg-emerald-400',
    chip: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300',
  },
  DELIVERED: {
    label: 'Yetkazildi',
    dot: 'bg-slate-400',
    chip: 'border-slate-400/30 bg-slate-500/15 text-slate-300',
  },
}

// --- Maintenance priority ---------------------------------------------------
// CRITICAL = red (pulsing) · HIGH = dark orange · MEDIUM = amber · LOW = sky
export const PRIORITY = {
  CRITICAL: {
    label: 'Kritik',
    rank: 0,
    dot: 'bg-red-500',
    text: 'text-red-300',
    chip: 'border-red-400/40 bg-red-500/20 text-red-200',
    accent: 'bg-red-500',
    pulse: true,
  },
  HIGH: {
    label: 'Yuqori',
    rank: 1,
    dot: 'bg-orange-500',
    text: 'text-orange-300',
    chip: 'border-orange-400/40 bg-orange-500/20 text-orange-200',
    accent: 'bg-orange-500',
    pulse: false,
  },
  MEDIUM: {
    label: "O'rta",
    rank: 2,
    dot: 'bg-amber-400',
    text: 'text-amber-300',
    chip: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
    accent: 'bg-amber-400',
    pulse: false,
  },
  LOW: {
    label: 'Past',
    rank: 3,
    dot: 'bg-sky-400',
    text: 'text-sky-300',
    chip: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
    accent: 'bg-sky-400',
    pulse: false,
  },
}

// --- Activity event styling -------------------------------------------------
// `text`/`bg` are full literal classes so Tailwind's JIT keeps them.
export const ACTIVITY_TYPE = {
  room: { text: 'text-blue-300', bg: 'bg-blue-500/15', icon: 'bed' },
  order: { text: 'text-violet-300', bg: 'bg-violet-500/15', icon: 'tray' },
  maintenance: { text: 'text-orange-300', bg: 'bg-orange-500/15', icon: 'wrench' },
  guest: { text: 'text-emerald-300', bg: 'bg-emerald-500/15', icon: 'user' },
  system: { text: 'text-slate-300', bg: 'bg-slate-500/15', icon: 'activity' },
}

// --- Helpers ----------------------------------------------------------------

/** Compact, relative "x daqiqa oldin" timestamp (Uzbek). */
export function timeAgo(ts) {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seconds < 10) return 'hozir'
  if (seconds < 60) return `${seconds} soniya oldin`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} daqiqa oldin`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} soat oldin`
  const days = Math.floor(hours / 24)
  return `${days} kun oldin`
}

/** Local HH:MM clock string. */
export function clock(ts) {
  return new Date(ts).toLocaleTimeString('uz-UZ', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
