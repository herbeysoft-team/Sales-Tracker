import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCustomers, useMarketers } from '../lib/hooks'
import { formatMoney, formatDate, relativeToNow, daysUntil } from '../lib/format'

export default function Customers() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers, loading } = useCustomers(filters)
  const { marketers } = useMarketers()
  const marketerNames = (ids = []) => {
    const names = marketers.filter((m) => ids.includes(m.id)).map((m) => m.name)
    return names.length > 0 ? names.join(', ') : '—'
  }

  const [search, setSearch] = useState('')
  const [marketerFilter, setMarketerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch = c.name?.toLowerCase().includes(search.toLowerCase())
      const matchesMarketer = marketerFilter === 'all' || (c.assignedMarketerIds || []).includes(marketerFilter)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'overdue' && c.totalOutstandingBalance > 0 && daysUntil(c.nextDueDate) < 0) ||
        (statusFilter === 'balance' && c.totalOutstandingBalance > 0) ||
        (statusFilter === 'clear' && c.totalOutstandingBalance <= 0)
      return matchesSearch && matchesMarketer && matchesStatus
    })
  }, [customers, search, marketerFilter, statusFilter])

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Customers</h1>
          <p className="text-sm text-ink-soft">{customers.length} on the ledger</p>
        </div>
        <Link to="/customers/new" className="btn-primary w-full sm:w-auto">
          <Plus size={16} /> New customer
        </Link>
      </div>

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="input pl-9"
            placeholder="Search customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {isAdmin && (
          <select className="input w-auto" value={marketerFilter} onChange={(e) => setMarketerFilter(e.target.value)}>
            <option value="all">All marketers</option>
            {marketers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All</option>
          <option value="overdue">Overdue</option>
          <option value="balance">Has balance</option>
          <option value="clear">Fully paid</option>
        </select>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2 md:hidden">
        {filtered.map((c) => {
          const overdue = c.totalOutstandingBalance > 0 && daysUntil(c.nextDueDate) < 0
          return (
            <li key={c.id}>
              <Link to={`/customers/${c.id}`} className="card block p-4 active:bg-paper/60">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.name}</p>
                    {isAdmin && <p className="text-xs text-ink-faint">{marketerNames(c.assignedMarketerIds)}</p>}
                  </div>
                  <span className="figure whitespace-nowrap text-sm font-medium">
                    {formatMoney(c.totalOutstandingBalance)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-ink-faint">
                    {c.lastOrderDate ? `Last order ${relativeToNow(c.lastOrderDate)}` : 'No orders yet'}
                  </span>
                  <span className={overdue ? 'font-medium text-rust' : 'text-ink-soft'}>
                    {c.nextDueDate ? `Due ${formatDate(c.nextDueDate)}` : '—'}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
        {!loading && filtered.length === 0 && (
          <p className="card px-5 py-8 text-center text-sm text-ink-faint">No customers match.</p>
        )}
      </ul>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Customer</th>
              {isAdmin && <th className="px-5 py-3 font-medium">Marketer</th>}
              <th className="px-5 py-3 font-medium">Last order</th>
              <th className="px-5 py-3 font-medium">Next due</th>
              <th className="px-5 py-3 text-right font-medium">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const overdue = c.totalOutstandingBalance > 0 && daysUntil(c.nextDueDate) < 0
              return (
                <tr key={c.id} className="ledger-row hover:bg-paper/60">
                  <td className="px-5 py-3">
                    <Link to={`/customers/${c.id}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                  </td>
                  {isAdmin && <td className="px-5 py-3 text-ink-soft">{marketerNames(c.assignedMarketerIds)}</td>}
                  <td className="px-5 py-3 text-ink-soft">
                    {c.lastOrderDate ? relativeToNow(c.lastOrderDate) : 'No orders yet'}
                  </td>
                  <td className={`px-5 py-3 ${overdue ? 'text-rust font-medium' : 'text-ink-soft'}`}>
                    {c.nextDueDate ? formatDate(c.nextDueDate) : '—'}
                  </td>
                  <td className="figure px-5 py-3 text-right">{formatMoney(c.totalOutstandingBalance)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-ink-faint">No customers match.</p>
        )}
      </div>
    </div>
  )
}