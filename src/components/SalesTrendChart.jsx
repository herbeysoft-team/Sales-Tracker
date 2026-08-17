import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import {
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  startOfMonth,
  endOfMonth,
  eachWeekOfInterval,
  endOfWeek,
  isWithinInterval,
  format as formatDateFns,
} from 'date-fns'
import { formatMoney, toDate } from '../lib/format'

export default function SalesTrendChart({ sales }) {
  const [view, setView] = useState('year') // 'year' | 'month'

  const data = useMemo(() => {
    const now = new Date()

    if (view === 'year') {
      const months = eachMonthOfInterval({ start: startOfYear(now), end: endOfYear(now) })
      return months.map((m) => {
        const start = m
        const end = endOfMonth(m)
        const total = sales.reduce((sum, s) => {
          const d = toDate(s.orderDate)
          return d && isWithinInterval(d, { start, end }) ? sum + (s.amount || 0) : sum
        }, 0)
        return { label: formatDateFns(m, 'MMM'), amount: total }
      })
    }

    // Month view: bucket the current month's sales by week.
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const weekStarts = eachWeekOfInterval({ start: monthStart, end: monthEnd }, { weekStartsOn: 1 })
    return weekStarts.map((ws, i) => {
      const start = ws < monthStart ? monthStart : ws
      const rawEnd = endOfWeek(ws, { weekStartsOn: 1 })
      const end = rawEnd > monthEnd ? monthEnd : rawEnd
      const total = sales.reduce((sum, s) => {
        const d = toDate(s.orderDate)
        return d && isWithinInterval(d, { start, end }) ? sum + (s.amount || 0) : sum
      }, 0)
      return { label: `Wk ${i + 1}`, amount: total }
    })
  }, [sales, view])

  return (
    <div className="card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sales trend</h2>
        <div className="flex rounded-md border border-line p-0.5 text-xs">
          <button
            onClick={() => setView('month')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              view === 'month' ? 'bg-brand text-paper' : 'text-ink-soft'
            }`}
          >
            Month
          </button>
          <button
            onClick={() => setView('year')}
            className={`rounded px-2.5 py-1 font-medium transition ${
              view === 'year' ? 'bg-brand text-paper' : 'text-ink-soft'
            }`}
          >
            Year
          </button>
        </div>
      </div>
      <p className="mb-2 text-xs text-ink-faint">
        {view === 'year' ? 'Sales by month, this year' : 'Sales by week, this month'}
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid stroke="#E4E1D8" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={false} tickLine={false} width={70} />
          <Tooltip formatter={(v) => formatMoney(v)} />
          <Bar dataKey="amount" fill="#B3121B" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
