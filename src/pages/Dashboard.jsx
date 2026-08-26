import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronUp } from 'lucide-react'
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
import { useAuth } from '../context/AuthContext'
import { useCustomers, useSales, usePayments, useMarketers } from '../lib/hooks'
import { getMarketerStats } from '../lib/firestore'
import { formatMoney, formatDate, daysUntil, effectiveSaleStatus, toDate } from '../lib/format'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import PeriodReportCard from '../components/PeriodReportCard'
import SalesTrendChart from '../components/SalesTrendChart'
import TargetsCard from '../components/TargetsCard'

export default function Dashboard() {
  const { isAdmin, profile } = useAuth()
  const [showMore, setShowMore] = useState(false)
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers } = useCustomers(filters)
  const { sales } = useSales(filters)
  const { payments } = usePayments(filters)
  const { marketers } = useMarketers()

  // Admin's target is the sum of every marketer's own target; a marketer
  // sees just their own — both come straight off the (realtime) user
  // profile doc(s), no separate settings document to keep in sync.
  const weeklyTarget = isAdmin
    ? marketers.reduce((sum, m) => sum + (m.weeklyTarget || 0), 0)
    : profile?.weeklyTarget || 0
  const monthlyTarget = isAdmin
    ? marketers.reduce((sum, m) => sum + (m.monthlyTarget || 0), 0)
    : profile?.monthlyTarget || 0

  const totals = useMemo(() => {
    const totalSalesValue = sales.reduce((s, x) => s + (x.amount || 0), 0)
    // Sum each customer's real outstanding balance (which already accounts
    // for advance payments and ledger adjustments) rather than re-deriving
    // it from raw sale amounts — keeps this figure consistent with what
    // each customer's own page and the Reports page show. A customer in
    // credit (negative balance) contributes 0 here rather than offsetting
    // what other customers owe.
    const totalOutstanding = customers.reduce((s, c) => s + Math.max(0, c.totalOutstandingBalance || 0), 0)
    const overdue = sales.filter((s) => effectiveSaleStatus(s) === 'overdue')
    return {
      totalSalesValue,
      totalOutstanding,
      overdueCount: overdue.length,
      overdueValue: overdue.reduce((s, x) => s + (x.amount - x.amountPaid), 0),
    }
  }, [sales, customers])

  const dueSoon = useMemo(() => {
    return customers
      .filter((c) => c.nextDueDate)
      .map((c) => ({ ...c, dueIn: daysUntil(c.nextDueDate) }))
      .filter((c) => c.dueIn <= 7)
      .sort((a, b) => a.dueIn - b.dueIn)
      .slice(0, 8)
  }, [customers])

  // Week/Month/Year report: Sales and Remittance are scoped to that
  // period. Exposure is deliberately NOT period-scoped — it's the same
  // "how much of our money is currently in customers' hands" figure as
  // the Outstanding stat card above, shown identically on all three
  // cards, since a customer's total balance owed isn't really a
  // week/month/year-specific thing.
  const reportPeriods = useMemo(() => {
    const now = new Date()
    const ranges = [
      { key: 'week', label: 'This week', start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
      { key: 'month', label: 'This month', start: startOfMonth(now), end: endOfMonth(now) },
      { key: 'year', label: 'This year', start: startOfYear(now), end: endOfYear(now) },
    ]

    return ranges.map((r) => {
      let totalSales = 0
      for (const s of sales) {
        const d = toDate(s.orderDate)
        if (d && isWithinInterval(d, { start: r.start, end: r.end })) {
          totalSales += s.amount || 0
        }
      }
      let totalPayments = 0
      for (const p of payments) {
        const d = toDate(p.paidDate)
        if (d && isWithinInterval(d, { start: r.start, end: r.end })) {
          totalPayments += p.amount || 0
        }
      }
      return {
        key: r.key,
        label: r.label,
        rangeLabel: `${formatDateFns(r.start, 'MMM d')} – ${formatDateFns(r.end, 'MMM d, yyyy')}`,
        totalSales,
        totalPayments,
        totalExposure: totals.totalOutstanding,
      }
    })
  }, [sales, payments, totals.totalOutstanding])

  return (
    <div>
      <h1 className="mb-1 text-xl font-semibold sm:text-2xl">
        {isAdmin ? 'Business overview' : `Welcome back, ${profile?.name?.split(' ')[0] || ''}`}
      </h1>
      <p className="mb-6 text-sm text-ink-soft">
        {isAdmin ? 'Every customer and marketer, at a glance.' : 'Your customers and pending collections.'}
      </p>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Customers" value={customers.length} />
        <StatCard label="Total sales" value={formatMoney(totals.totalSalesValue)} accent="teal" />
        <StatCard label="Outstanding" value={formatMoney(totals.totalOutstanding)} accent="amber" />
        <StatCard
          label="Overdue"
          value={totals.overdueCount}
          sub={formatMoney(totals.overdueValue)}
          accent="rust"
        />
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold">Reports</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {reportPeriods.map((r) => (
          <PeriodReportCard
            key={r.key}
            label={r.label}
            rangeLabel={r.rangeLabel}
            sales={r.totalSales}
            payments={r.totalPayments}
            exposure={r.totalExposure}
          />
        ))}
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <SalesTrendChart sales={sales} />
            </div>
            <div className="lg:col-span-2">
              <TargetsCard
                weeklyTarget={weeklyTarget}
                monthlyTarget={monthlyTarget}
                weekSales={reportPeriods.find((r) => r.key === 'week')?.totalSales || 0}
                monthSales={reportPeriods.find((r) => r.key === 'month')?.totalSales || 0}
                isAdmin={isAdmin}
              />
            </div>
          </div>

      <button
        onClick={() => setShowMore((v) => !v)}
        className="mx-auto mt-8 flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
      >
        {showMore ? 'View less' : 'View more'}
        {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {showMore && (
        <div className="mt-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
            <div className="card lg:col-span-3">
              <div className="border-b border-line px-5 py-4">
                <h2 className="text-sm font-semibold">Payments due soon</h2>
              </div>
              {dueSoon.length === 0 ? (
                <p className="px-5 py-6 text-sm text-ink-faint">Nothing due in the next 7 days.</p>
              ) : (
                <ul>
                  {dueSoon.map((c) => (
                    <li key={c.id} className="ledger-row flex items-center justify-between px-5 py-3">
                      <div>
                        <Link to={`/customers/${c.id}`} className="text-sm font-medium hover:underline">
                          {c.name}
                        </Link>
                        <p className="text-xs text-ink-faint">
                          {c.dueIn < 0
                            ? `${Math.abs(c.dueIn)} day(s) overdue`
                            : c.dueIn === 0
                            ? 'Due today'
                            : `Due in ${c.dueIn} day(s)`}
                        </p>
                      </div>
                      <span className="figure text-sm">{formatMoney(c.totalOutstandingBalance)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isAdmin ? (
              <MarketerLeaderboard marketers={marketers} />
            ) : (
              <div className="card lg:col-span-2 p-5">
                <h2 className="mb-3 text-sm font-semibold">Recent sales</h2>
                <ul className="space-y-3">
                  {sales.slice(0, 6).map((s) => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <span className="text-ink-soft">{formatDate(s.orderDate)}</span>
                      <span className="figure">{formatMoney(s.amount)}</span>
                      <StatusBadge status={effectiveSaleStatus(s)} manual={s.manualStatus} />
                    </li>
                  ))}
                  {sales.length === 0 && <p className="text-sm text-ink-faint">No sales recorded yet.</p>}
                </ul>
              </div>
            )}
          </div>

          
        </div>
      )}
    </div>
  )
}

function MarketerLeaderboard({ marketers }) {
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

  const ranked = [...marketers].sort(
    (a, b) => (stats[b.id]?.totalCollected || 0) - (stats[a.id]?.totalCollected || 0)
  )

  return (
    <div className="card lg:col-span-2">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Marketer leaderboard</h2>
      </div>
      <ul>
        {ranked.map((m, i) => (
          <li key={m.id} className="ledger-row flex items-center justify-between px-5 py-3">
            <div className="flex items-center gap-3">
              <span className="figure text-xs text-ink-faint">{String(i + 1).padStart(2, '0')}</span>
              <Link to={`/marketers/${m.id}`} className="text-sm font-medium hover:underline">
                {m.name}
              </Link>
            </div>
            <span className="figure text-sm text-teal">
              {stats[m.id] ? formatMoney(stats[m.id].totalCollected) : '—'}
            </span>
          </li>
        ))}
        {ranked.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No marketers yet.</p>}
      </ul>
    </div>
  )
}