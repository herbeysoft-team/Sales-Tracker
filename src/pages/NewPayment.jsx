import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useCustomers, useSales, useMarketers } from '../lib/hooks'
import { recordPayment } from '../lib/firestore'
import { formatMoney, effectiveSaleStatus, formatDate } from '../lib/format'

const NO_SALE = '__none__'

export default function NewPayment() {
  const { isAdmin, profile } = useAuth()
  const filters = isAdmin ? {} : { marketerId: profile?.id }
  const { customers } = useCustomers(filters)
  const { marketers } = useMarketers()
  const [params] = useSearchParams()
  const navigate = useNavigate()

  const [customerId, setCustomerId] = useState(params.get('customerId') || '')
  const { sales } = useSales({ customerId: customerId || undefined })
  const customer = customers.find((c) => c.id === customerId)

  const outstandingSales = useMemo(
    () => sales.filter((s) => s.amount - s.amountPaid > 0),
    [sales]
  )

  // Whoever facilitated this payment gets the credit — restricted to the
  // marketers actually assigned to this customer.
  const eligibleMarketers = useMemo(() => {
    const ids = customer?.assignedMarketerIds || []
    return marketers.filter((m) => ids.includes(m.id))
  }, [customer, marketers])

  const [form, setForm] = useState({
    saleId: '',
    facilitatedBy: '',
    amount: '',
    paidDate: format(new Date(), 'yyyy-MM-dd'),
    method: 'transfer',
    note: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const ids = customer?.assignedMarketerIds || []
    setForm((f) => ({
      ...f,
      saleId: '',
      facilitatedBy: ids.includes(profile?.id) ? profile.id : ids[0] || '',
    }))
  }, [customerId, customer, profile?.id])

  const selectedSale = outstandingSales.find((s) => s.id === form.saleId)
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.saleId) {
      setError('Choose a sale to pay against, or "General payment" for an advance payment.')
      return
    }
    if (!form.facilitatedBy) {
      setError('Select which marketer facilitated this payment.')
      return
    }
    if (selectedSale) {
      const balance = selectedSale.amount - selectedSale.amountPaid
      if (Number(form.amount) > balance) {
        setError(`Amount exceeds this sale's outstanding balance of ${formatMoney(balance)}.`)
        return
      }
    }
    setBusy(true)
    try {
      const isGeneral = form.saleId === NO_SALE
      await recordPayment({
        saleId: isGeneral ? undefined : form.saleId,
        customerId,
        amount: form.amount,
        paidDate: form.paidDate,
        method: form.method,
        note: form.note,
        marketerId: form.facilitatedBy,
      })
      navigate(`/customers/${customerId}`)
    } catch (err) {
      setError('Could not record this payment. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold sm:text-2xl">Record a payment</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Customer</label>
          <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)} required>
            <option value="">Select a customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {customerId && (
          <div>
            <label className="label">Facilitated by</label>
            <select className="input" value={form.facilitatedBy} onChange={update('facilitatedBy')} required>
              <option value="">Select a marketer</option>
              {eligibleMarketers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              This marketer gets credit for the payment in their performance stats.
            </p>
          </div>
        )}

        {customerId && (
          <div>
            <label className="label">Against which sale</label>
            <select className="input" value={form.saleId} onChange={update('saleId')} required>
              <option value="">Select an option</option>
              <option value={NO_SALE}>General payment (advance — not tied to a specific sale)</option>
              {outstandingSales.map((s) => (
                <option key={s.id} value={s.id}>
                  {formatDate(s.orderDate)} · {formatMoney(s.amount - s.amountPaid)} outstanding
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-ink-faint">
              Customer paid before placing an order, or paying ahead? Choose "General payment" — it still shows on
              their ledger and reduces their overall balance, just isn't tied to one order.
            </p>
          </div>
        )}

        {selectedSale && (
          <div className="rounded-md bg-paper p-3 text-sm text-ink-soft">
            Sale total {formatMoney(selectedSale.amount)} · Paid so far {formatMoney(selectedSale.amountPaid)} ·
            Status <span className="font-medium">{effectiveSaleStatus(selectedSale)}</span>
          </div>
        )}

        <div>
          <label className="label">Amount received</label>
          <input className="input" type="number" min="0" step="0.01" value={form.amount} onChange={update('amount')} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Date</label>
            <input className="input" type="date" value={form.paidDate} onChange={update('paidDate')} required />
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.method} onChange={update('method')}>
              <option value="cash">Cash</option>
              <option value="transfer">Bank transfer</option>
              <option value="pos">POS</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Note (optional)</label>
          <input className="input" value={form.note} onChange={update('note')} />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Record payment'}
        </button>
      </form>
    </div>
  )
}