import { useMemo } from 'react'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  isWithinInterval,
  format as formatDateFns,
} from 'date-fns'
import { Printer } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCustomers, useSales, usePayments, useMarketers } from '../lib/hooks'
import { formatMoney, formatDate, toDate } from '../lib/format'

export default function Reports() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers } = useCustomers(filters)
  const { sales } = useSales(filters)
  const { payments } = usePayments(filters)
  const { marketers } = useMarketers()

  const marketerNames = (ids = []) => {
    const names = marketers.filter((m) => ids.includes(m.id)).map((m) => m.name)
    return names.length > 0 ? names.join(', ') : '—'
  }

  const periods = useMemo(() => {
    const now = new Date()
    const ranges = [
      { key: 'week', label: 'Week', start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
      { key: 'month', label: 'Month', start: startOfMonth(now), end: endOfMonth(now) },
      { key: 'year', label: 'Year', start: startOfYear(now), end: endOfYear(now) },
    ]
    return ranges.map((r) => {
      let totalSales = 0
      let totalExposure = 0
      for (const s of sales) {
        const d = toDate(s.orderDate)
        if (d && isWithinInterval(d, { start: r.start, end: r.end })) {
          totalSales += s.amount || 0
          totalExposure += Math.max(0, (s.amount || 0) - (s.amountPaid || 0))
        }
      }
      let totalRemittance = 0
      for (const p of payments) {
        const d = toDate(p.paidDate)
        if (d && isWithinInterval(d, { start: r.start, end: r.end })) totalRemittance += p.amount || 0
      }
      return {
        key: r.key,
        label: r.label,
        rangeLabel: `${formatDateFns(r.start, 'MMM d')} – ${formatDateFns(r.end, 'MMM d, yyyy')}`,
        totalSales,
        totalRemittance,
        totalExposure,
      }
    })
  }, [sales, payments])

  // Most recent payment per customer, for the "last remittance" column.
  const lastRemittanceByCustomer = useMemo(() => {
    const map = {}
    for (const p of payments) {
      const d = toDate(p.paidDate)
      if (!d) continue
      const existing = map[p.customerId]
      if (!existing || d > existing.date) map[p.customerId] = { date: d, amount: p.amount }
    }
    return map
  }, [payments])

  const generatedOn = formatDateFns(new Date(), 'MMMM d, yyyy · h:mm a')

  return (
    <div>
      <div className="mb-6 flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Reports</h1>
          <p className="text-sm text-ink-soft">Sales & remittance summary — printable</p>
        </div>
        <button onClick={() => window.print()} className="btn-primary">
          <Printer size={16} /> Print
        </button>
      </div>

      {/* Print-only header — the app chrome (sidebar/nav) is hidden via print styles */}
      <div className="mb-6 hidden print:block">
        <h1 className="text-lg font-semibold">SALES TRACKER — Report</h1>
        <p className="text-sm text-ink-soft">
          Generated {generatedOn}
          {!isAdmin && ` · ${profile?.name}`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3">
        {periods.map((p) => (
          <div key={p.key} className="card p-4 print:break-inside-avoid print:border print:border-line print:shadow-none">
            <p className="text-sm font-semibold">{p.label}</p>
            <p className="mb-3 text-xs text-ink-faint">{p.rangeLabel}</p>
            <dl className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Sales</dt>
                <dd className="figure font-medium">{formatMoney(p.totalSales)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-ink-soft">Remittance</dt>
                <dd className="figure font-medium text-teal">{formatMoney(p.totalRemittance)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line pt-1.5">
                <dt className="text-ink-soft">Exposure</dt>
                <dd className="figure font-medium text-rust">{formatMoney(p.totalExposure)}</dd>
              </div>
            </dl>
          </div>
        ))}
      </div>

      <div className="card mt-6 overflow-hidden print:mt-4 print:border print:border-line print:shadow-none">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">Customer balances</h2>
          <p className="text-xs text-ink-faint">Last remittance and current balance, as of today</p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint print:bg-white">
              <th className="px-5 py-2.5 font-medium">Customer</th>
              {isAdmin && <th className="px-5 py-2.5 font-medium">Marketer(s)</th>}
              <th className="px-5 py-2.5 font-medium">Last remittance</th>
              <th className="px-5 py-2.5 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => {
              const last = lastRemittanceByCustomer[c.id]
              const balance = c.totalOutstandingBalance || 0
              const isCredit = balance < 0
              return (
                <tr key={c.id} className="ledger-row">
                  <td className="px-5 py-2.5">{c.name}</td>
                  {isAdmin && <td className="px-5 py-2.5 text-ink-soft">{marketerNames(c.assignedMarketerIds)}</td>}
                  <td className="px-5 py-2.5 text-ink-soft">
                    {last ? `${formatDate(last.date)} · ${formatMoney(last.amount)}` : 'No payments yet'}
                  </td>
                  <td className={`figure px-5 py-2.5 text-right font-medium ${isCredit ? 'text-teal' : balance > 0 ? 'text-rust' : ''}`}>
                    {isCredit ? `${formatMoney(Math.abs(balance))} credit` : formatMoney(balance)}
                  </td>
                </tr>
              )
            })}
            {customers.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 4 : 3} className="px-5 py-8 text-center text-sm text-ink-faint">
                  No customers.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
