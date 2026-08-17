import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { updateUserProfile } from '../lib/firestore'

export default function Profile() {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({ name: profile?.name || '', phone: profile?.phone || '' })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (e) => {
    setSaved(false)
    setForm((f) => ({ ...f, [key]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await updateUserProfile(user.uid, { name: form.name, phone: form.phone })
      setSaved(true)
    } catch (err) {
      setError('Could not save your changes. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold sm:text-2xl">Your profile</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={update('phone')} />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input bg-paper text-ink-soft" value={profile?.email || ''} disabled />
          <p className="mt-1 text-xs text-ink-faint">Email can't be changed here — contact your admin.</p>
        </div>
        <div>
          <label className="label">Role</label>
          <input className="input bg-paper capitalize text-ink-soft" value={profile?.role || ''} disabled />
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        {saved && <p className="text-sm text-teal">Saved.</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  )
}
