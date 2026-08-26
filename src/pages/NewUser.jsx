import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { createUserAccount } from '../lib/firestore'

export default function NewUser() {
  const navigate = useNavigate()
  const { isSuperAdmin } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'marketer' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setBusy(true)
    setError('')
    try {
      await createUserAccount(form)
      navigate(form.role === 'marketer' ? '/marketers' : '/dashboard')
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? 'That email is already registered.' : 'Could not create this account.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-xl font-semibold sm:text-2xl">Add a user</h1>
      <form onSubmit={handleSubmit} className="card space-y-4 p-6">
        <div>
          <label className="label">Role</label>
          <select className="input" value={form.role} onChange={update('role')}>
            <option value="marketer">Marketer</option>
            <option value="admin">Admin</option>
            {isSuperAdmin && <option value="superadmin">Super Admin</option>}
          </select>
          <p className="mt-1 text-xs text-ink-faint">
            Marketers see only customers assigned to them. Admins see everything. Super Admins can additionally
            delete records and manage other accounts.
          </p>
        </div>
        <div>
          <label className="label">Full name</label>
          <input className="input" value={form.name} onChange={update('name')} required />
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={update('email')} required />
        </div>
        <div>
          <label className="label">Phone</label>
          <input className="input" value={form.phone} onChange={update('phone')} />
        </div>
        <div>
          <label className="label">Temporary password</label>
          <input className="input" type="text" value={form.password} onChange={update('password')} required />
          <p className="mt-1 text-xs text-ink-faint">Share this with them so they can sign in and change it.</p>
        </div>
        {error && <p className="text-sm text-rust">{error}</p>}
        <button className="btn-primary" disabled={busy} type="submit">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  )
}
