import { Link } from 'react-router-dom'
import { formatMoney } from '../lib/format'

export default function TopCustomersCard({ customers }) {
  const ranked = [...customers]
    .sort((a, b) => (b.totalPurchasedAmount || 0) - (a.totalPurchasedAmount || 0))
    .slice(0, 10)

  return (
    <div className="card lg:col-span-2">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Top 10 customers</h2>
        <p className="text-xs text-ink-faint">By total purchased</p>
      </div>
      <ul>
        {ranked.map((c, i) => (
          <li key={c.id} className="ledger-row flex items-center justify-between px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="figure flex-shrink-0 text-xs text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
              <Link to={`/customers/${c.id}`} className="truncate text-sm font-medium hover:underline">
                {c.name}
              </Link>
            </div>
            <span className="figure flex-shrink-0 text-sm text-teal">{formatMoney(c.totalPurchasedAmount || 0)}</span>
          </li>
        ))}
        {ranked.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No customers yet.</p>}
      </ul>
    </div>
  )
}