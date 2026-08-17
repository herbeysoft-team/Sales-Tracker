import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useCustomers, useMarketers } from '../lib/hooks'
import { createSale } from '../lib/firestore'

export default function NewSale() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers } = useCustomers(filters)
  const { marketers } = useMarketers()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultDue = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [form, setForm] = useState({
    customerId: params.get('customerId') || '',
    marketerId: '',
    amount: '',
    orderDate: today,
    dueDate: defaultDue,
    description: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const customer = customers.find((c) => c.id === form.customerId)

  // Marketers eligible for credit on this sale: whoever is assigned to the
  // customer. Defaults to the logged-in marketer if they're one of them.
  const eligibleMarketers = useMemo(() => {
    const ids = customer?.assignedMarketerIds || []
    return marketers.filter((m) => ids.includes(m.id))
  }, [customer, marketers])

  const update = (key) => (e) => {
    const value = e.target.value
    setForm((f) => {
      const next = { ...f, [key]: value }
      if (key === 'customerId') {
        const c = customers.find((x) => x.id === value)
        const ids = c?.assignedMarketerIds || []
        next.marketerId = ids.includes(profile?.id) ? profile.id : ids[0] || ''
      }
      return next
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerId) {
      setError('Select a customer.')
      return
    }
    if (!form.marketerId) {
      setError('Select which marketer facilitated this sale.')
      return
    }
    setBusy(true)
    try {
      await createSale(form)
      navigate(`/customers/${form.customerId}`)
    } catch (err) {
      setError('Could not save this sale. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">Log a sale</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={form.customerId} onChange={update('customerId')} required>
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {form.customerId && (
          <div>
            <label className="label">Credit this sale to</label>
            <select className="input" value={form.marketerId} onChange={update('marketerId')} required>
              <option value="">Select a marketer</option>
              {eligibleMarketers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              Only marketers assigned to this customer can be credited — manage that from the customer's page.
            </p>
          </div>
        )}

        <div>
          <label className="label">Amount</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Order date</label>
            <input className="input" type="date" value={form.orderDate} onChange={update('orderDate')} required />
          </div>
          <div>
            <label className="label">Payment due date</label>
            <input className="input" type="date" value={form.dueDate} onChange={update('dueDate')} required />
          </div>
        </div>
        <div>
          <label className="label">Description / items</label>
          <textarea className="input" rows={3} value={form.description} onChange={update('description')} />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save sale'}
        </button>
      </form>
    </div>
  )
}