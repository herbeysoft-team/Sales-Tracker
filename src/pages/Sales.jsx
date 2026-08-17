import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Pencil } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useSales, useCustomers, useMarketers } from '../lib/hooks'
import { formatMoney, formatDate, effectiveSaleStatus } from '../lib/format'
import StatusBadge from '../components/StatusBadge'

export default function Sales() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { sales, loading } = useSales(filters)
  const { customers } = useCustomers(filters)
  const { marketers } = useMarketers()

  const customerName = (id) => customers.find((c) => c.id === id)?.name || '—'
  const marketerName = (id) => marketers.find((m) => m.id === id)?.name || '—'

  const [statusFilter, setStatusFilter] = useState('all')
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return sales
    return sales.filter((s) => effectiveSaleStatus(s) === statusFilter)
  }, [sales, statusFilter])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Sales ledger</h1>
          <p className="text-sm text-ink-soft">{sales.length} entries recorded</p>
        </div>
        <Link to="/sales/new" className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> Log sale
        </Link>
      </div>

      <div className="mb-4 flex gap-3">
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="paid">Paid</option>
          <option value="partial">Partial</option>
          <option value="unpaid">Unpaid</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2 md:hidden">
        {filtered.map((s) => (
          <li key={s.id} className="card relative p-4 active:bg-paper/60">
              <Link to={`/customers/${s.customerId}`} className="absolute inset-0" aria-label={`View ${customerName(s.customerId)}`} />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{customerName(s.customerId)}</p>
                  {isAdmin && <p className="text-xs text-ink-faint">{marketerName(s.marketerId)}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={effectiveSaleStatus(s)} manual={s.manualStatus} />
                  {isAdmin && (
                    <Link
                      to={`/sales/${s.id}/edit`}
                      className="relative z-10 rounded p-1 text-ink-faint hover:text-ink"
                      aria-label="Edit sale"
                    >
                      <Pencil size={14} />
                    </Link>
                  )}
                </div>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-ink-faint">
                <span>Ordered {formatDate(s.orderDate)} · Due {formatDate(s.dueDate)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="figure">{formatMoney(s.amount)}</span>
                <span className="figure text-ink-soft">Bal. {formatMoney(s.amount - s.amountPaid)}</span>
              </div>
          </li>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="card px-5 py-8 text-center text-sm text-ink-faint">No sales match.</p>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Customer</th>
              {isAdmin && <th className="px-5 py-3 font-medium">Marketer</th>}
              <th className="px-5 py-3 font-medium">Order date</th>
              <th className="px-5 py-3 font-medium">Due date</th>
              <th className="px-5 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-right font-medium">Balance</th>
              <th className="px-5 py-3 font-medium">Status</th>
              {isAdmin && <th className="px-5 py-3"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="ledger-row hover:bg-paper/60">
                <td className="px-5 py-3">
                  <Link to={`/customers/${s.customerId}`} className="font-medium hover:underline">
                    {customerName(s.customerId)}
                  </Link>
                </td>
                {isAdmin && <td className="px-5 py-3 text-ink-soft">{marketerName(s.marketerId)}</td>}
                <td className="px-5 py-3 text-ink-soft">{formatDate(s.orderDate)}</td>
                <td className="px-5 py-3 text-ink-soft">{formatDate(s.dueDate)}</td>
                <td className="figure px-5 py-3 text-right">{formatMoney(s.amount)}</td>
                <td className="figure px-5 py-3 text-right">{formatMoney(s.amount - s.amountPaid)}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={effectiveSaleStatus(s)} manual={s.manualStatus} />
                </td>
                {isAdmin && (
                  <td className="px-5 py-3 text-right">
                    <Link to={`/sales/${s.id}/edit`} className="text-ink-faint hover:text-ink" aria-label="Edit sale">
                      <Pencil size={14} />
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">No sales match.</p>
        )}
      </div>
    </div>
  )
}
