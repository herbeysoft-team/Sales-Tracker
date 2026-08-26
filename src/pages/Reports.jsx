import { useMemo, useState } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format as formatDateFns,
  parse as parseDateFns,
} from 'date-fns'
import { Printer, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useAuth } from '../context/AuthContext'
import { useCustomers, useSales, usePayments, useMarketers } from '../lib/hooks'
import { formatMoney, formatDate, toDate } from '../lib/format'

const CATEGORIES = [
  { key: 'sales', label: 'Sales' },
  { key: 'remittance', label: 'Remittance' },
  { key: 'exposure', label: 'Exposure' },
  { key: 'balances', label: 'Customer balances' },
]
const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

export default function Reports() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers } = useCustomers(filters)
  const { sales } = useSales(filters)
  const { payments } = usePayments(filters)
  const { marketers } = useMarketers()

  const customerName = (id) => customers.find((c) => c.id === id)?.name || 'Unknown'
  const marketerName = (id) => marketers.find((m) => m.id === id)?.name || '—'

  const [category, setCategory] = useState('sales')
  const [period, setPeriod] = useState('daily')
  const [anchorDate, setAnchorDate] = useState(formatDateFns(new Date(), 'yyyy-MM-dd'))
  const [anchorMonth, setAnchorMonth] = useState(formatDateFns(new Date(), 'yyyy-MM'))

  const needsPeriod = category !== 'balances'

  const range = useMemo(() => {
    if (period === 'monthly') {
      const d = parseDateFns(anchorMonth + '-01', 'yyyy-MM-dd', new Date())
      return { start: startOfMonth(d), end: endOfMonth(d), label: formatDateFns(d, 'MMMM yyyy') }
    }
    const d = parseDateFns(anchorDate, 'yyyy-MM-dd', new Date())
    if (period === 'weekly') {
      const start = startOfWeek(d, { weekStartsOn: 1 })
      const end = endOfWeek(d, { weekStartsOn: 1 })
      return { start, end, label: `${formatDateFns(start, 'MMM d')} – ${formatDateFns(end, 'MMM d, yyyy')}` }
    }
    return { start: startOfDay(d), end: endOfDay(d), label: formatDateFns(d, 'MMMM d, yyyy') }
  }, [period, anchorDate, anchorMonth])

  // Rows + columns for whichever report is currently selected.
  const { rows, columns, total, totalLabel, title } = useMemo(() => {
    const inRange = (dateField) => (item) => {
      const d = toDate(item[dateField])
      return d && isWithinInterval(d, { start: range.start, end: range.end })
    }

    if (category === 'sales') {
      const data = sales.filter(inRange('orderDate')).sort((a, b) => toDate(a.orderDate) - toDate(b.orderDate))
      return {
        title: `${PERIODS.find((p) => p.key === period).label} Sales Report`,
        columns: isAdmin ? ['Date', 'Customer', 'Marketer', 'Amount'] : ['Date', 'Customer', 'Amount'],
        rows: data.map((s) =>
          isAdmin
            ? [formatDate(s.orderDate), customerName(s.customerId), marketerName(s.marketerId), formatMoney(s.amount)]
            : [formatDate(s.orderDate), customerName(s.customerId), formatMoney(s.amount)]
        ),
        total: data.reduce((sum, s) => sum + (s.amount || 0), 0),
        totalLabel: 'Total sales',
      }
    }

    if (category === 'remittance') {
      const data = payments.filter(inRange('paidDate')).sort((a, b) => toDate(a.paidDate) - toDate(b.paidDate))
      return {
        title: `${PERIODS.find((p) => p.key === period).label} Remittance Report`,
        columns: isAdmin ? ['Date', 'Customer', 'Marketer', 'Method', 'Amount'] : ['Date', 'Customer', 'Method', 'Amount'],
        rows: data.map((p) =>
          isAdmin
            ? [formatDate(p.paidDate), customerName(p.customerId), marketerName(p.marketerId), p.method, formatMoney(p.amount)]
            : [formatDate(p.paidDate), customerName(p.customerId), p.method, formatMoney(p.amount)]
        ),
        total: data.reduce((sum, p) => sum + (p.amount || 0), 0),
        totalLabel: 'Total remittance',
      }
    }

    if (category === 'exposure') {
      // Sales placed in this period that still have an unpaid balance,
      // as of right now — not a historical snapshot.
      const data = sales
        .filter(inRange('orderDate'))
        .filter((s) => (s.amount || 0) - (s.amountPaid || 0) > 0)
        .sort((a, b) => toDate(a.orderDate) - toDate(b.orderDate))
      return {
        title: `${PERIODS.find((p) => p.key === period).label} Exposure Report`,
        columns: isAdmin
          ? ['Date', 'Customer', 'Marketer', 'Sale amount', 'Paid', 'Exposure']
          : ['Date', 'Customer', 'Sale amount', 'Paid', 'Exposure'],
        rows: data.map((s) => {
          const exposure = s.amount - s.amountPaid
          return isAdmin
            ? [formatDate(s.orderDate), customerName(s.customerId), marketerName(s.marketerId), formatMoney(s.amount), formatMoney(s.amountPaid), formatMoney(exposure)]
            : [formatDate(s.orderDate), customerName(s.customerId), formatMoney(s.amount), formatMoney(s.amountPaid), formatMoney(exposure)]
        }),
        total: data.reduce((sum, s) => sum + (s.amount - s.amountPaid), 0),
        totalLabel: 'Total exposure',
      }
    }

    // Customer balances — a live snapshot, not period-scoped.
    const lastRemittanceByCustomer = {}
    for (const p of payments) {
      const d = toDate(p.paidDate)
      if (!d) continue
      const existing = lastRemittanceByCustomer[p.customerId]
      if (!existing || d > existing.date) lastRemittanceByCustomer[p.customerId] = { date: d, amount: p.amount }
    }
    return {
      title: 'Customer Balances',
      columns: isAdmin ? ['Customer', 'Marketer(s)', 'Last remittance', 'Balance'] : ['Customer', 'Last remittance', 'Balance'],
      rows: customers.map((c) => {
        const last = lastRemittanceByCustomer[c.id]
        const balance = c.totalOutstandingBalance || 0
        const balanceText = balance < 0 ? `${formatMoney(Math.abs(balance))} credit` : formatMoney(balance)
        const lastText = last ? `${formatDate(last.date)} · ${formatMoney(last.amount)}` : 'No payments yet'
        const marketerNames = (c.assignedMarketerIds || []).map(marketerName).join(', ') || '—'
        return isAdmin ? [c.name, marketerNames, lastText, balanceText] : [c.name, lastText, balanceText]
      }),
      total: customers.reduce((sum, c) => sum + Math.max(0, c.totalOutstandingBalance || 0), 0),
      totalLabel: 'Total outstanding',
    }
  }, [category, period, range, sales, payments, customers, marketers, isAdmin])

  const handlePrint = () => window.print()

  const handleExportPdf = () => {
    const pdf = new jsPDF()
    pdf.setFontSize(14)
    pdf.text('SALES TRACKER', 14, 16)
    pdf.setFontSize(11)
    pdf.text(title, 14, 24)
    pdf.setFontSize(9)
    pdf.setTextColor(120)
    const subtitle = needsPeriod
      ? `${range.label}${!isAdmin ? ` · ${profile?.name}` : ''}`
      : `As of ${formatDateFns(new Date(), 'MMM d, yyyy')}${!isAdmin ? ` · ${profile?.name}` : ''}`
    pdf.text(subtitle, 14, 30)

    autoTable(pdf, {
      startY: 36,
      head: [columns],
      body: rows,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [179, 18, 27] },
      margin: { left: 14, right: 14 },
    })

    const finalY = pdf.lastAutoTable ? pdf.lastAutoTable.finalY : 40
    pdf.setFontSize(10)
    pdf.setTextColor(0)
    pdf.text(`${totalLabel}: ${formatMoney(total)}`, 14, finalY + 10)

    const filenameBits = needsPeriod ? [category, period, range.label] : [category]
    pdf.save(`${filenameBits.join('-').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 print:hidden sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">Reports</h1>
          <p className="text-sm text-ink-soft">Pick a report, then print or download it as a PDF.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="btn-secondary">
            <Printer size={16} /> Print
          </button>
          <button onClick={handleExportPdf} className="btn-primary">
            <Download size={16} /> Download PDF
          </button>
        </div>
      </div>

      {/* Report picker */}
      <div className="card mb-6 p-5 print:hidden">
        <div className="mb-4">
          <label className="label">Report type</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                  category === c.key ? 'border-brand bg-brand text-paper' : 'border-line text-ink-soft hover:bg-paper'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {needsPeriod && (
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <label className="label">Period</label>
              <div className="flex gap-2">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${
                      period === p.key ? 'border-brand bg-brand text-paper' : 'border-line text-ink-soft hover:bg-paper'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            {period === 'monthly' ? (
              <div>
                <label className="label">Month</label>
                <input className="input" type="month" value={anchorMonth} onChange={(e) => setAnchorMonth(e.target.value)} />
              </div>
            ) : (
              <div>
                <label className="label">{period === 'weekly' ? 'Any date in the week' : 'Date'}</label>
                <input className="input" type="date" value={anchorDate} onChange={(e) => setAnchorDate(e.target.value)} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Print-only header */}
      <div className="mb-4 hidden print:block">
        <h1 className="text-lg font-semibold">SALES TRACKER — {title}</h1>
        <p className="text-sm text-ink-soft">
          {needsPeriod ? range.label : `As of ${formatDateFns(new Date(), 'MMM d, yyyy')}`}
          {!isAdmin && ` · ${profile?.name}`}
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-ink-faint">{needsPeriod ? range.label : 'Live snapshot'}</p>
          </div>
          <p className="text-right">
            <span className="block text-xs text-ink-faint">{totalLabel}</span>
            <span className="figure text-base font-semibold">{formatMoney(total)}</span>
          </p>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint print:bg-white">
              {columns.map((col) => (
                <th key={col} className="px-5 py-2.5 font-medium">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="ledger-row hover:bg-paper/60">
                {row.map((cell, j) => (
                  <td key={j} className={`px-5 py-2.5 ${j === 0 ? 'whitespace-nowrap text-ink-soft' : ''}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-sm text-ink-faint">
                  Nothing to show for this report.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
