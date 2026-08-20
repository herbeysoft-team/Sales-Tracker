import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMarketers } from '../lib/hooks'
import { createCustomer } from '../lib/firestore'
import MarketerMultiSelect from '../components/MarketerMultiSelect'

export default function NewCustomer() {
  const { isAdmin, profile } = useAuth()
  const { marketers } = useMarketers()
  const navigate = useNavigate()

  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })
  const [assignedMarketerIds, setAssignedMarketerIds] = useState(isAdmin ? [] : profile?.id ? [profile.id] : [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (assignedMarketerIds.length === 0) {
      setError('Assign at least one marketer to this customer.')
      return
    }
    setBusy(true)
    try {
      const id = await createCustomer({ ...form, assignedMarketerIds })
      navigate(`/customers/${id}`)
    } catch (err) {
      setError('Could not save this customer. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold">New customer</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={update('phone')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={form.email} onChange={update('email')} />
          </div>
        </div>
        <div>
          <label className="label">Address</label>
          <input className="input" value={form.address} onChange={update('address')} />
        </div>
        {isAdmin && (
          <div>
            <label className="label">Assigned marketer(s)</label>
            <MarketerMultiSelect marketers={marketers} selectedIds={assignedMarketerIds} onChange={setAssignedMarketerIds} />
            <p className="mt-1 text-xs text-ink-faint">
              More than one marketer can manage the same customer / Area Office — whoever facilitates a sale or
              payment gets credited for it individually.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save customer'}
        </button>
      </form>
    </div>
  )
}
