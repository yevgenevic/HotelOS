import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SPRING } from '../lib/constants'

const money = new Intl.NumberFormat('uz-UZ')

function PrinterIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  )
}

function SearchIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function TrashIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  )
}

function XIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function CheckoutArchive({ checkouts, onClearArchive }) {
  const [search, setSearch] = useState('')
  const [activeInvoice, setActiveInvoice] = useState(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return checkouts
    return checkouts.filter(
      (c) =>
        c.guestName.toLowerCase().includes(q) ||
        c.roomNumber.toLowerCase().includes(q) ||
        c.roomType.toLowerCase().includes(q)
    )
  }, [checkouts, search])

  function handlePrintInvoice(inv) {
    setActiveInvoice(inv)
  }

  function triggerPrint() {
    window.print()
  }

  function formatDateTime(ts) {
    const d = new Date(ts)
    return d.toLocaleString('uz-UZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function calculateNights(c) {
    const diff = Math.max(1, c.checkOutTime - c.checkInTime)
    return Math.max(1, Math.round(diff / (24 * 60 * 60 * 1000)))
  }

  return (
    <section className="panel glass-shimmer flex flex-col p-5 h-full max-h-[30rem]">
      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold text-white">Chiqish arxivi (Cheklar)</h2>
          <p className="text-xs text-slate-400">
            Jami <span className="tnum font-medium text-slate-200">{checkouts.length}</span> ta chek
          </p>
        </div>

        {checkouts.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (confirm("Haqiqatan ham butun cheklar arxivini tozalamoqchimisiz?")) {
                onClearArchive()
              }
            }}
            className="glass-button inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-300/40 bg-red-100/50 px-2.5 text-[11px] font-bold text-red-700 transition hover:bg-red-100 active:scale-95"
          >
            <TrashIcon className="h-3.5 w-3.5" />
            Tozalash
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="relative z-10 mb-3.5">
        <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-500">
          <SearchIcon className="h-4 w-4" />
        </span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          type="text"
          placeholder="Mehmon ismi yoki xona raqami bo'yicha izlash..."
          className="glass-input w-full rounded-xl border border-slate-200/50 bg-white/50 py-2.5 pl-10 pr-4 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-400/50 focus:outline-none focus:ring-1 focus:ring-indigo-400/30 transition"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-700"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Grid listing */}
      <div className="scroll-area mask-fade-y flex-1 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-12 text-center">
            <SearchIcon className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-400">Arxivda cheklar topilmadi</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map((item) => (
              <div key={item.id} className="glass glass-shimmer rounded-xl p-3 border border-slate-200/40 flex items-center justify-between gap-3 hover:border-slate-300/60 transition relative">
                <div className="relative z-10 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded bg-indigo-100/60 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                      Xona {item.roomNumber}
                    </span>
                    <span className="text-xs font-semibold text-white truncate">{item.guestName}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-400 truncate">
                    {item.roomType} · {formatDateTime(item.checkOutTime)}
                  </p>
                </div>
                <div className="relative z-10 flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <span className="tnum text-xs font-bold text-cyan-200">{money.format(item.totalBill)}</span>
                    <span className="ml-0.5 text-[10px] text-slate-500">so'm</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrintInvoice(item)}
                    aria-label="Chekni chop etish"
                    className="glass-button grid h-8 w-8 place-items-center rounded-lg border border-indigo-300/40 bg-indigo-100/50 text-indigo-600 transition hover:bg-indigo-100 active:scale-95"
                  >
                    <PrinterIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* High-Fidelity Printable Receipt Modal overlay */}
      <AnimatePresence>
        {activeInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/40 backdrop-blur-md p-4 no-print-bg">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={SPRING}
              className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white p-6 shadow-2xl text-slate-800 printable-invoice border border-slate-200"
              role="dialog"
              aria-modal="true"
            >
              {/* Receipt Body */}
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-black tracking-widest text-slate-400 uppercase">Grandstay Hotel & Spa</span>
                <h3 className="mt-1 text-sm font-bold text-slate-900">TO'LOV KVTANSIYASI (ARXIV)</h3>
                <div className="mt-1.5 h-[1px] w-full border-t border-dashed border-slate-300" />
              </div>

              {/* Receipt Meta */}
              <div className="mt-4 flex flex-col gap-1.5 text-xs text-slate-500">
                <div className="flex justify-between">
                  <span>Kvitansiya No:</span>
                  <span className="font-mono text-slate-900">{activeInvoice.id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mehmon:</span>
                  <span className="font-semibold text-slate-900">{activeInvoice.guestName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Xona:</span>
                  <span className="font-semibold text-slate-900">Xona {activeInvoice.roomNumber} ({activeInvoice.roomType})</span>
                </div>
                <div className="flex justify-between">
                  <span>Joylashish vaqti:</span>
                  <span className="text-slate-900">{formatDateTime(activeInvoice.checkInTime)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chiqish vaqti:</span>
                  <span className="text-slate-900">{formatDateTime(activeInvoice.checkOutTime)}</span>
                </div>
              </div>

              <div className="mt-3.5 h-[1px] w-full border-t border-dashed border-slate-300" />

              {/* Bill Details */}
              <div className="mt-4 flex flex-col gap-2 text-xs">
                <div className="flex justify-between font-medium text-slate-900">
                  <span>Xona ijrasi ({calculateNights(activeInvoice)} kecha)</span>
                  <span className="tnum">{money.format(activeInvoice.roomRate * calculateNights(activeInvoice))} so'm</span>
                </div>

                {activeInvoice.orders.length > 0 && (
                  <div className="flex flex-col gap-1 pl-2 border-l-2 border-slate-200 mt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">Qo'shimcha xizmatlar:</span>
                    {activeInvoice.orders.map((o, idx) => (
                      <div key={o.id || idx} className="flex justify-between text-[11px] text-slate-600">
                        <span>Room Service #{o.id || idx + 1}</span>
                        <span className="tnum">+{money.format(o.total)} so'm</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 h-[1px] w-full border-t border-dashed border-slate-300" />

              {/* Total */}
              <div className="mt-4 flex items-center justify-between text-slate-900">
                <span className="text-xs font-black uppercase tracking-wider">Jami to'lov:</span>
                <div>
                  <span className="tnum text-base font-black">{money.format(activeInvoice.totalBill)}</span>
                  <span className="ml-1 text-[11px] font-bold text-slate-500">so'm</span>
                </div>
              </div>

              <div className="mt-4 flex flex-col items-center text-center">
                <div className="h-[1px] w-full border-t border-dashed border-slate-300" />
                <p className="mt-3 text-[10px] uppercase font-bold tracking-wider text-slate-400">Tashrifingiz uchun rahmat!</p>
              </div>

              {/* Modal Actions */}
              <div className="mt-6 flex gap-3 no-print">
                <button
                  type="button"
                  onClick={() => setActiveInvoice(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-black text-slate-600 transition hover:bg-slate-100"
                >
                  Yopish
                </button>
                <button
                  type="button"
                  onClick={triggerPrint}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 py-2.5 text-xs font-black text-white transition hover:bg-indigo-400"
                >
                  <PrinterIcon className="h-3.5 w-3.5" />
                  Chop etish
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  )
}
