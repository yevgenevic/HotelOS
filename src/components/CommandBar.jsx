import { SearchIcon } from '../lib/icons'

export default function CommandBar({ query, onQueryChange, notice }) {
  return (
    <section className="panel mt-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/15 px-3 py-2.5">
        <SearchIcon className="h-4 w-4 shrink-0 text-cyan-200" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-white outline-none placeholder:text-slate-500"
          placeholder="Xona, mehmon, status yoki tur..."
        />
      </div>
      <div className="min-w-0 rounded-xl border border-cyan-300/15 bg-cyan-300/10 px-3 py-2 text-xs font-semibold text-cyan-100 sm:max-w-md">
        <p className="truncate">{notice}</p>
      </div>
    </section>
  )
}
