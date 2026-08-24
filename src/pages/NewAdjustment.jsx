import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useCustomers } from '../lib/hooks'
import { createLedgerAdjustment } from '../lib/firestore'
import { formatMoney } from '../lib/format'

export default function NewAdjustment() {
  const { customers } = useCustomers({})
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    customerId: params.get('customerId') || '',
    type: 'credit',
    amount: '',
    reason: '',
    adjustmentDate: format(new Date(), 'yyyy-MM-dd'),
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerId) {
      setError('Select a customer.')
      return
    }
    if (!form.reason.trim()) {
      setError('Add a reason — this shows on the ledger so it stays clear later why the balance moved.')
      return
    }
    setBusy(true)
    try {
      const signedAmount = form.type === 'credit' ? Number(form.amount) : -Number(form.amount)
      await createLedgerAdjustment({
        customerId: form.customerId,
        amount: signedAmount,
        reason: form.reason,
        adjustmentDate: form.adjustmentDate,
      })
      navigate(`/customers/${form.customerId}`)
    } catch (err) {
      setError('Could not save this adjustment. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-xl font-semibold sm:text-2xl">Add ledger adjustment</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Adjusts this customer's overall balance directly — it never touches any sale's amount or a marketer's
        payment totals. Use it for things like a price-drop differential, a goodwill credit, or a correction.
      </p>
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

        <div>
          <label className="label">Type</label>
          <select className="input" value={form.type} onChange={update('type')}>
            <option value="credit">Credit — reduces what they owe</option>
            <option value="debit">Debit — increases what they owe</option>
          </select>
        </div>

        <div>
          <label className="label">Amount</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} required />
          {form.amount && (
            <p className="mt-1 text-xs text-ink-faint">
              This will {form.type === 'credit' ? 'reduce' : 'increase'} the customer's balance by{' '}
              {formatMoney(Number(form.amount))}.
            </p>
          )}
        </div>

        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={form.adjustmentDate} onChange={update('adjustmentDate')} required />
        </div>

        <div>
          <label className="label">Reason</label>
          <textarea
            className="input"
            rows={3}
            value={form.reason}
            onChange={update('reason')}
            placeholder="e.g. Price drop differential for August orders"
            required
          />
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save adjustment'}
        </button>
      </form>
    </div>
  )
}
