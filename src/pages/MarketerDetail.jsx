import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { getMarketerStats, subscribeUserProfile, updateUserProfile, updateUserRole, setUserActive } from '../lib/firestore'
import { useCustomers, useSales } from '../lib/hooks'
import { formatMoney, formatDate, effectiveSaleStatus, relativeToNow, toDate } from '../lib/format'
import StatCard from '../components/StatCard'
import StatusBadge from '../components/StatusBadge'
import TargetDonut from '../components/TargetDonut'

export default function MarketerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isSuperAdmin, profile: myProfile } = useAuth()
  const [marketer, setMarketer] = useState(null)
  const [stats, setStats] = useState(null)
  const { customers } = useCustomers({ marketerId: id })
  const { sales } = useSales({ marketerId: id })

  useEffect(() => {
    const unsub = subscribeUserProfile(id, setMarketer)
    getMarketerStats(id).then(setStats)
    return unsub
  }, [id])

  const { weekSales, monthSales } = useMemo(() => {
    const now = new Date()
    const weekRange = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) }
    const monthRange = { start: startOfMonth(now), end: endOfMonth(now) }
    let week = 0
    let month = 0
    for (const s of sales) {
      const d = toDate(s.orderDate)
      if (!d) continue
      if (isWithinInterval(d, weekRange)) week += s.amount || 0
      if (isWithinInterval(d, monthRange)) month += s.amount || 0
    }
    return { weekSales: week, monthSales: month }
  }, [sales])

  if (!marketer) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div>
      <h1 className="text-2xl font-semibold">{marketer.name}</h1>
      <p className="mb-6 text-sm text-ink-soft">{marketer.email} {marketer.phone && `· ${marketer.phone}`}</p>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Customers" value={stats?.customerCount ?? '—'} />
        <StatCard label="Total sales" value={stats ? formatMoney(stats.totalSalesValue) : '—'} />
        <StatCard label="Collected" value={stats ? formatMoney(stats.totalCollected) : '—'} accent="teal" />
        <StatCard
          label="Collection rate"
          value={stats ? `${Math.round(stats.collectionRate * 100)}%` : '—'}
          sub={stats ? `${formatMoney(stats.totalOutstanding)} outstanding` : undefined}
          accent="amber"
        />
      </div>

      <TargetsEditor marketer={marketer} weekSales={weekSales} monthSales={monthSales} />

      {isSuperAdmin && (
        <AccountControls marketer={marketer} currentUid={myProfile?.id} onRoleChangedAway={() => navigate('/marketers')} />
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Assigned customers</h2>
          </div>
          <ul>
            {customers.map((c) => (
              <li key={c.id} className="ledger-row flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{c.name}</p>
                  <p className="text-xs text-ink-faint">
                    {c.lastOrderDate ? `Last order ${relativeToNow(c.lastOrderDate)}` : 'No orders yet'}
                  </p>
                </div>
                <span className="figure text-sm">{formatMoney(c.totalOutstandingBalance)}</span>
              </li>
            ))}
            {customers.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No customers assigned.</p>}
          </ul>
        </div>

        <div className="card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Recent sales logged</h2>
          </div>
          <ul>
            {sales.slice(0, 10).map((s) => (
              <li key={s.id} className="ledger-row flex items-center justify-between px-5 py-3">
                <span className="text-sm text-ink-soft">{formatDate(s.orderDate)}</span>
                <span className="figure text-sm">{formatMoney(s.amount)}</span>
                <StatusBadge status={effectiveSaleStatus(s)} manual={s.manualStatus} />
              </li>
            ))}
            {sales.length === 0 && <p className="px-5 py-6 text-sm text-ink-faint">No sales logged yet.</p>}
          </ul>
        </div>
      </div>
    </div>
  )
}

function TargetsEditor({ marketer, weekSales, monthSales }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ weeklyTarget: marketer.weeklyTarget || 0, monthlyTarget: marketer.monthlyTarget || 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const openEdit = () => {
    setForm({ weeklyTarget: marketer.weeklyTarget || 0, monthlyTarget: marketer.monthlyTarget || 0 })
    setError('')
    setEditing(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateUserProfile(marketer.id, {
        weeklyTarget: Number(form.weeklyTarget) || 0,
        monthlyTarget: Number(form.monthlyTarget) || 0,
      })
      setEditing(false)
    } catch (err) {
      setError('Could not save these targets. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mt-6 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold">Targets</h2>
        <button
          onClick={editing ? () => setEditing(false) : openEdit}
          className="text-xs font-medium text-brand hover:underline"
        >
          {editing ? 'Cancel' : 'Edit targets'}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSave} className="max-w-sm space-y-3">
          <div>
            <label className="label">Weekly target</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.weeklyTarget}
              onChange={(e) => setForm((f) => ({ ...f, weeklyTarget: e.target.value }))}
            />
          </div>
          <div>
            <label className="label">Monthly target</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.monthlyTarget}
              onChange={(e) => setForm((f) => ({ ...f, monthlyTarget: e.target.value }))}
            />
          </div>
          {error && <p className="text-sm text-rust">{error}</p>}
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save targets'}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
          <TargetDonut label="This week" achieved={weekSales} target={marketer.weeklyTarget || 0} />
          <TargetDonut label="This month" achieved={monthSales} target={marketer.monthlyTarget || 0} />
        </div>
      )}
    </div>
  )
}

function AccountControls({ marketer, currentUid, onRoleChangedAway }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const isSelf = marketer.id === currentUid

  const handleRoleChange = async (e) => {
    const newRole = e.target.value
    if (newRole === marketer.role) return
    if (isSelf) {
      setError("You can't change your own role — ask another super admin.")
      return
    }
    const ok = window.confirm(`Change ${marketer.name}'s role from ${marketer.role} to ${newRole}?`)
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await updateUserRole(marketer.id, newRole)
      if (newRole !== 'marketer') onRoleChangedAway()
    } catch (err) {
      setError('Could not change role. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleActive = async () => {
    if (isSelf) {
      setError("You can't deactivate your own account.")
      return
    }
    const nextActive = marketer.active === false
    const ok = window.confirm(
      nextActive ? `Reactivate ${marketer.name}'s account?` : `Deactivate ${marketer.name}'s account? They'll be signed out immediately and can't log back in until reactivated.`
    )
    if (!ok) return
    setBusy(true)
    setError('')
    try {
      await setUserActive(marketer.id, nextActive)
    } catch (err) {
      setError('Could not update account status. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="card mt-6 border-rust/30 p-5">
      <h2 className="mb-1 text-sm font-semibold text-rust">Account controls</h2>
      <p className="mb-4 text-xs text-ink-faint">Super admin only — role and access changes.</p>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="label">Role</label>
          <select className="input" value={marketer.role} onChange={handleRoleChange} disabled={busy || isSelf}>
            <option value="marketer">Marketer</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Super Admin</option>
          </select>
        </div>
        <button
          onClick={handleToggleActive}
          disabled={busy || isSelf}
          className={marketer.active === false ? 'btn-primary' : 'btn-secondary'}
        >
          {marketer.active === false ? 'Reactivate account' : 'Deactivate account'}
        </button>
      </div>
      {isSelf && <p className="mt-2 text-xs text-ink-faint">You can't change your own role or deactivate yourself.</p>}
      {error && <p className="mt-2 text-sm text-rust">{error}</p>}
    </div>
  )
}
