import { motion } from 'framer-motion'
import { SparkIcon } from '../lib/icons'

const SCENARIOS = [
  ['TS-01', 'Check-in'],
  ['TS-02', 'Checkout 204'],
  ['TS-03', 'Clean 204'],
  ['TS-04', 'Order 301'],
  ['TS-05', 'Critical 115'],
  ['TS-06', 'Concurrent'],
  ['TS-07', 'No rooms'],
  ['TS-08', 'Invalid input'],
]

export default function ScenarioPanel({ onRun }) {
  return (
    <section className="panel mt-6 overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-cyan-500/15 text-cyan-200">
            <SparkIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-white">Test stsenariylar</h2>
            <p className="text-xs text-slate-400">Assignment TS-01 dan TS-08 gacha</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-8">
        {SCENARIOS.map(([id, label], index) => (
          <motion.button
            key={id}
            type="button"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.025 }}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onRun(id)}
            className="rounded-xl border border-white/10 bg-white/[0.045] px-3 py-3 text-left transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
          >
            <span className="block text-[11px] font-black uppercase tracking-wide text-cyan-200">{id}</span>
            <span className="mt-1 block truncate text-xs font-semibold text-slate-200">{label}</span>
          </motion.button>
        ))}
      </div>
    </section>
  )
}
