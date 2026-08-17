import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useMarketers } from '../lib/hooks'
import { getMarketerStats } from '../lib/firestore'
import { formatMoney } from '../lib/format'

export default function Marketers() {
  const { marketers, loading } = useMarketers()
  const [stats, setStats] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all(marketers.map((m) => getMarketerStats(m.id))).then((results) => {
      if (cancelled) return
      const map = {}
      results.forEach((r) => (map[r.marketerId] = r))
      setStats(map)
    })
    return () => {
      cancelled = true
    }
  }, [marketers])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Marketers</h1>
          <p className="text-sm text-ink-soft">{marketers.length} on the team</p>
        </div>
        <Link to="/marketers/new" className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Add user
        </Link>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2 md:hidden">
        {marketers.map((m) => {
          const s = stats[m.id]
          return (
            <li key={m.id}>
              <Link to={`/marketers/${m.id}`} className="card block p-4 active:bg-paper/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{m.name}</p>
                    <p className="truncate text-xs text-ink-faint">{m.email}</p>
                  </div>
                  <span className="figure whitespace-nowrap text-sm text-teal">
                    {s ? formatMoney(s.totalCollected) : '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink-soft">
                  <span>{s?.customerCount ?? '—'} customers</span>
                  <span>{s ? `${Math.round(s.collectionRate * 100)}% collected` : '—'}</span>
                </div>
              </Link>
            </li>
          )
        })}
        {!loading && marketers.length === 0 && (
          <p className="card px-5 py-8 text-center text-sm text-ink-faint">No marketers added yet.</p>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Marketer</th>
              <th className="px-5 py-3 text-right font-medium">Customers</th>
              <th className="px-5 py-3 text-right font-medium">Total sales</th>
              <th className="px-5 py-3 text-right font-medium">Collected</th>
              <th className="px-5 py-3 text-right font-medium">Outstanding</th>
              <th className="px-5 py-3 text-right font-medium">Collection rate</th>
            </tr>
          </thead>
          <tbody>
            {marketers.map((m) => {
              const s = stats[m.id]
              return (
                <tr key={m.id} className="ledger-row hover:bg-paper/60">
                  <td className="px-5 py-3">
                    <Link to={`/marketers/${m.id}`} className="font-medium hover:underline">
                      {m.name}
                    </Link>
                    <p className="text-xs text-ink-faint">{m.email}</p>
                  </td>
                  <td className="figure px-5 py-3 text-right">{s?.customerCount ?? '—'}</td>
                  <td className="figure px-5 py-3 text-right">{s ? formatMoney(s.totalSalesValue) : '—'}</td>
                  <td className="figure px-5 py-3 text-right text-teal">{s ? formatMoney(s.totalCollected) : '—'}</td>
                  <td className="figure px-5 py-3 text-right text-amber">{s ? formatMoney(s.totalOutstanding) : '—'}</td>
                  <td className="figure px-5 py-3 text-right">{s ? `${Math.round(s.collectionRate * 100)}%` : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && marketers.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">No marketers added yet.</p>
        )}
      </div>
    </div>
  )
}
