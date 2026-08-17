import { useMemo, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, CreditCard, Pencil } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useCustomer, useSales, usePayments, useMarketers } from '../lib/hooks'
import { formatMoney, formatDate, daysUntil, effectiveSaleStatus, toDate } from '../lib/format'
import { updateCustomer } from '../lib/firestore'
import StatusBadge from '../components/StatusBadge'
import StatCard from '../components/StatCard'
import MarketerMultiSelect from '../components/MarketerMultiSelect'

export default function CustomerDetail() {
  const { id } = useParams()
  const { isAdmin } = useAuth()
  const { customer, loading } = useCustomer(id)
  const { sales } = useSales({ customerId: id })
  const { payments } = usePayments({ customerId: id })
  const { marketers } = useMarketers()

  const assignedIds = customer?.assignedMarketerIds || []
  const marketerNames = marketers.filter((m) => assignedIds.includes(m.id)).map((m) => m.name)

  const trendData = useMemo(() => {
    return [...sales]
      .sort((a, b) => (a.orderDate?.toDate?.() || 0) - (b.orderDate?.toDate?.() || 0))
      .map((s) => ({
        date: formatDate(s.orderDate, 'MMM d'),
        amount: s.amount,
      }))
  }, [sales])

  // Merges sales (debits, reduce the balance) and payments (credits, restore
  // it) into one chronological ledger with a running balance — negative
  // means the customer currently owes money, back to zero once settled.
  const ledgerEntries = useMemo(() => {
    const entries = [
      ...sales.map((s) => ({
        key: `sale-${s.id}`,
        type: 'sale',
        date: s.orderDate,
        label: s.description || 'Sale',
        amount: -(s.amount || 0),
      })),
      ...payments.map((p) => ({
        key: `payment-${p.id}`,
        type: 'payment',
        date: p.paidDate,
        label: `Payment · ${p.method}`,
        amount: p.amount || 0,
      })),
    ].sort((a, b) => (toDate(a.date)?.getTime() || 0) - (toDate(b.date)?.getTime() || 0))

    let balance = 0
    return entries.map((e) => {
      balance += e.amount
      return { ...e, balance }
    })
  }, [sales, payments])

  if (loading) return <p className="text-sm text-ink-soft">Loading…</p>
  if (!customer) return <p className="text-sm text-ink-soft">Customer not found.</p>

  const overdue = customer.totalOutstandingBalance > 0 && daysUntil(customer.nextDueDate) < 0

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">{customer.name}</h1>
          <p className="text-sm text-ink-soft">
            {customer.phone} {customer.email && `· ${customer.email}`}
          </p>
          <MarketersEditor customer={customer} marketers={marketers} marketerNames={marketerNames} isAdmin={isAdmin} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link to={`/sales/new?customerId=${id}`} className="btn-secondary">
            <Plus size={15} /> Log sale
          </Link>
          <Link to={`/payments/new?customerId=${id}`} className="btn-primary">
            <CreditCard size={15} /> Record payment
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <StatCard label="Total purchased" value={formatMoney(customer.totalPurchasedAmount)} />
        <StatCard
          label={customer.totalOutstandingBalance < 0 ? 'Credit balance' : 'Outstanding'}
          value={formatMoney(Math.abs(customer.totalOutstandingBalance))}
          accent={customer.totalOutstandingBalance < 0 ? 'teal' : overdue ? 'rust' : 'amber'}
        />
        <StatCard label="Orders placed" value={customer.totalOrdersCount} />
        <StatCard
          label="Next due"
          value={customer.nextDueDate ? formatDate(customer.nextDueDate) : '—'}
          sub={overdue ? 'Overdue' : undefined}
          accent={overdue ? 'rust' : 'ink'}
        />
      </div>

      {trendData.length > 1 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-4 text-sm font-semibold">Patronage trend</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid stroke="#E4E1D8" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#8A8580' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip formatter={(v) => formatMoney(v)} />
              <Line type="monotone" dataKey="amount" stroke="#B3121B" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card mt-6">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-semibold">Account ledger</h2>
          <p className="text-xs text-ink-faint">Sales debit the balance, payments credit it back.</p>
        </div>
        {/* Mobile: stacked cards */}
        <ul className="md:hidden">
          <li className="ledger-row flex items-center justify-between px-5 py-2.5 text-xs text-ink-faint">
            <span>Opening balance</span>
            <span className="figure">{formatMoney(0)}</span>
          </li>
          {ledgerEntries.map((e) => (
            <li key={e.key} className="ledger-row flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.label}</p>
                <p className="text-xs text-ink-faint">
                  {formatDate(e.date)} · {e.type === 'sale' ? 'Debit' : 'Credit'}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={`figure text-sm ${e.amount < 0 ? 'text-rust' : 'text-teal'}`}>
                  {e.amount < 0 ? '−' : '+'}
                  {formatMoney(Math.abs(e.amount))}
                </p>
                <p className="text-xs text-ink-faint">
                  Bal. <span className={e.balance < 0 ? 'font-medium text-rust' : ''}>{formatMoney(e.balance)}</span>
                </p>
              </div>
            </li>
          ))}
          {ledgerEntries.length === 0 && (
            <p className="px-5 py-6 text-sm text-ink-faint">No ledger activity yet.</p>
          )}
        </ul>

        {/* Desktop: formal Date / Description / Debit / Credit / Balance table */}
        <table className="hidden w-full text-sm md:table">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-2.5 font-medium">Date</th>
              <th className="px-5 py-2.5 font-medium">Description</th>
              <th className="px-5 py-2.5 text-right font-medium">Debit</th>
              <th className="px-5 py-2.5 text-right font-medium">Credit</th>
              <th className="px-5 py-2.5 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="ledger-row text-ink-faint">
              <td className="px-5 py-2.5" colSpan={4}>
                Opening balance
              </td>
              <td className="figure px-5 py-2.5 text-right">{formatMoney(0)}</td>
            </tr>
            {ledgerEntries.map((e) => (
              <tr key={e.key} className="ledger-row hover:bg-paper/60">
                <td className="whitespace-nowrap px-5 py-2.5 text-ink-soft">{formatDate(e.date)}</td>
                <td className="px-5 py-2.5">{e.label}</td>
                <td className="figure px-5 py-2.5 text-right text-rust">
                  {e.type === 'sale' ? formatMoney(-e.amount) : ''}
                </td>
                <td className="figure px-5 py-2.5 text-right text-teal">
                  {e.type === 'payment' ? formatMoney(e.amount) : ''}
                </td>
                <td className={`figure px-5 py-2.5 text-right font-medium ${e.balance < 0 ? 'text-rust' : 'text-ink'}`}>
                  {formatMoney(e.balance)}
                </td>
              </tr>
            ))}
            {ledgerEntries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-6 text-center text-sm text-ink-faint">
                  No ledger activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Order history</h2>
          </div>
          <ul>
            {sales.map((s) => (
              <li key={s.id} className="ledger-row flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{formatDate(s.orderDate)}</p>
                  <p className="text-xs text-ink-faint">{s.description || 'No description'}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="figure text-sm">{formatMoney(s.amount)}</span>
                  <StatusBadge status={effectiveSaleStatus(s)} manual={s.manualStatus} />
                  {isAdmin && (
                    <Link to={`/sales/${s.id}/edit`} className="text-ink-faint hover:text-ink" aria-label="Edit sale">
                      <Pencil size={14} />
                    </Link>
                  )}
                </div>
              </li>
            ))}
            {sales.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No orders yet.</p>}
          </ul>
        </div>

        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Payment history</h2>
          </div>
          <ul>
            {payments.map((p) => (
              <li key={p.id} className="ledger-row flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{formatDate(p.paidDate)}</p>
                  <p className="text-xs capitalize text-ink-faint">{p.method}</p>
                </div>
                <span className="figure text-sm text-teal">{formatMoney(p.amount)}</span>
              </li>
            ))}
            {payments.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No payments yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  )
}

function MarketersEditor({ customer, marketers, marketerNames, isAdmin }) {
  const [editing, setEditing] = useState(false)
  const [selectedIds, setSelectedIds] = useState(customer.assignedMarketerIds || [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openEdit = () => {
    setSelectedIds(customer.assignedMarketerIds || [])
    setError('')
    setEditing(true)
  }

  const handleSave = async () => {
    if (selectedIds.length === 0) {
      setError('At least one marketer must be assigned.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateCustomer(customer.id, { assignedMarketerIds: selectedIds })
      setEditing(false)
    } catch (err) {
      setError('Could not save. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (editing) {
    return (
      <div className="mt-2 max-w-sm">
        <MarketerMultiSelect marketers={marketers} selectedIds={selectedIds} onChange={setSelectedIds} />
        {error && <p className="mt-1 text-xs text-rust">{error}</p>}
        <div className="mt-2 flex gap-2">
          <button onClick={handleSave} disabled={busy} className="btn-primary px-3 py-1.5 text-xs">
            {busy ? 'Saving…' : 'Save'}
          </button>
          <button onClick={() => setEditing(false)} className="btn-secondary px-3 py-1.5 text-xs">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <p className="text-sm text-ink-soft">
      Marketer{marketerNames.length !== 1 ? 's' : ''}: {marketerNames.length > 0 ? marketerNames.join(', ') : 'Unassigned'}
      {isAdmin && (
        <button onClick={openEdit} className="ml-2 text-xs font-medium text-brand hover:underline">
          Edit
        </button>
      )}
    </p>
  )
}