import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { getSale, updateSale, setSaleStatus } from '../lib/firestore'
import { toDate } from '../lib/format'

export default function EditSale() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [sale, setSale] = useState(null)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getSale(id).then((s) => {
      setSale(s)
      if (s) {
        setForm({
          amount: s.amount,
          orderDate: format(toDate(s.orderDate) || new Date(), 'yyyy-MM-dd'),
          dueDate: format(toDate(s.dueDate) || new Date(), 'yyyy-MM-dd'),
          description: s.description || '',
          statusOverride: s.manualStatus ? s.status : 'auto',
        })
      }
    })
  }, [id])

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (Number(form.amount) < (sale.amountPaid || 0)) {
      setError(`Amount can't be less than what's already been paid (₦${sale.amountPaid.toLocaleString()}).`)
      return
    }
    setBusy(true)
    setError('')
    try {
      await updateSale(id, form)
      await setSaleStatus(id, form.statusOverride)
      navigate(`/customers/${sale.customerId}`)
    } catch (err) {
      setError('Could not save these changes. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!sale || !form) return <p className="text-sm text-ink-soft">Loading…</p>

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-1 text-xl font-semibold sm:text-2xl">Edit sale</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Already paid: ₦{(sale.amountPaid || 0).toLocaleString()} — editing here only changes the sale record itself,
        not any payments already recorded against it.
      </p>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
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

        <div className="border-t border-line pt-4">
          <label className="label">Status</label>
          <select className="input" value={form.statusOverride} onChange={update('statusOverride')}>
            <option value="auto">Auto — based on payments received</option>
            <option value="unpaid">Unpaid (manual)</option>
            <option value="partial">Partial (manual)</option>
            <option value="paid">Paid (manual)</option>
          </select>
          <p className="mt-1 text-xs text-ink-faint">
            Setting a manual status overrides what the payment amounts would normally show, and stays pinned even as
            new payments come in — pick "Auto" any time to hand control back to the payment math.
          </p>
        </div>

        {error && <p className="text-sm text-rust">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={busy} type="submit">
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
