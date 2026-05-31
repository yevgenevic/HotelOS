import { motion, useReducedMotion } from 'framer-motion'
import { BuildingIcon, SparkIcon } from '../lib/icons'

const roomRows = [
  ['bg-emerald-400/80', 'bg-blue-400/80', 'bg-amber-400/80', 'bg-emerald-400/80'],
  ['bg-blue-400/80', 'bg-emerald-400/80', 'bg-red-400/80', 'bg-blue-400/80'],
  ['bg-emerald-400/80', 'bg-emerald-400/80', 'bg-blue-400/80', 'bg-amber-400/80'],
  ['bg-amber-400/80', 'bg-blue-400/80', 'bg-emerald-400/80', 'bg-emerald-400/80'],
  ['bg-blue-400/80', 'bg-red-400/80', 'bg-emerald-400/80', 'bg-blue-400/80'],
]

function MiniRoom({ tone, index }) {
  return (
    <span
      className={`h-6 rounded-[0.35rem] border border-white/15 shadow-[0_0_18px_rgba(255,255,255,0.08)] ${tone}`}
      style={{ animationDelay: `${index * 120}ms` }}
    />
  )
}

function SignalRing({ delay, size }) {
  return (
    <span
      className="absolute rounded-full border border-cyan-300/20"
      style={{
        width: size,
        height: size,
        animationDelay: `${delay}ms`,
      }}
    />
  )
}

export default function HeroScene() {
  const reduce = useReducedMotion()

  return (
    <section className="hero-shell relative overflow-hidden rounded-[1.35rem] border border-white/10">
      <div className="absolute inset-0 hero-grid" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      <div className="relative grid min-h-[24rem] items-center gap-8 px-5 py-7 sm:px-7 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28 }}
          className="max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.16)]">
            <SparkIcon className="h-3.5 w-3.5" />
            Live operations cockpit
          </div>
          <h2 className="mt-4 max-w-xl text-3xl font-black leading-[0.98] tracking-tight text-white sm:text-5xl">
            HotelOS real-time boshqaruv paneli
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
            Xonalar, room service va texnik so'rovlar bitta jonli ekranda. 3D vizual qatlam
            operatsion holatni tezroq skan qilish uchun ishlaydi.
          </p>

          <div className="mt-6 grid max-w-xl grid-cols-3 gap-3">
            {[
              ['16', 'xona'],
              ['4', "bo'lim"],
              ['live', 'oqim'],
            ].map(([value, label]) => (
              <div
                key={label}
                className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3 shadow-inner shadow-white/5"
              >
                <div className="text-xl font-black text-white">{value}</div>
                <div className="mt-0.5 text-xs font-medium text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </motion.div>

        <div className="relative min-h-[21rem]">
          <div className="absolute inset-0 flex items-center justify-center">
            <SignalRing delay={0} size="18rem" />
            <SignalRing delay={650} size="23rem" />
            <SignalRing delay={1300} size="28rem" />
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, rotateX: 64, rotateZ: -14, y: 32 }}
            animate={{ opacity: 1, rotateX: 62, rotateZ: -13, y: reduce ? 0 : [0, -10, 0] }}
            transition={
              reduce
                ? { duration: 0.2 }
                : {
                    opacity: { duration: 0.6 },
                    rotateX: { type: 'spring', stiffness: 180, damping: 24 },
                    rotateZ: { type: 'spring', stiffness: 180, damping: 24 },
                    y: { duration: 5.4, repeat: Infinity, ease: 'easeInOut' },
                  }
            }
            className="hotel-stage absolute left-1/2 top-1/2 h-[17rem] w-[17rem] -translate-x-1/2 -translate-y-1/2"
          >
            <div className="hotel-shadow" />
            <div className="hotel-base" />
            <div className="hotel-tower">
              <div className="flex items-center justify-between border-b border-white/10 px-4 pb-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-300/15 text-cyan-100">
                  <BuildingIcon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-2 py-1 text-[10px] font-bold uppercase text-emerald-200">
                  synced
                </span>
              </div>
              <div className="mt-4 grid gap-2.5 px-4">
                {roomRows.map((row, rowIndex) => (
                  <div key={rowIndex} className="grid grid-cols-4 gap-2.5">
                    {row.map((tone, index) => (
                      <MiniRoom key={`${rowIndex}-${index}`} tone={tone} index={rowIndex * 4 + index} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="hotel-side hotel-side-right" />
            <div className="hotel-side hotel-side-left" />
          </motion.div>

          <motion.div
            initial={reduce ? false : { opacity: 0, x: 18, y: -8 }}
            animate={{ opacity: 1, x: 0, y: reduce ? 0 : [-5, 5, -5] }}
            transition={{ duration: 4.8, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
            className="floating-chip right-0 top-8"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.9)]" />
            8 xona tayyor
          </motion.div>
          <motion.div
            initial={reduce ? false : { opacity: 0, x: -18, y: 8 }}
            animate={{ opacity: 1, x: 0, y: reduce ? 0 : [6, -4, 6] }}
            transition={{ duration: 5.2, repeat: reduce ? 0 : Infinity, ease: 'easeInOut' }}
            className="floating-chip bottom-10 left-0"
          >
            <span className="h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_16px_rgba(252,211,77,0.9)]" />
            housekeeping queue
          </motion.div>
        </div>
      </div>
    </section>
  )
}
