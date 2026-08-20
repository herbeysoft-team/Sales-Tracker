import { useEffect, useState } from 'react'
import { subscribeAuditLogs } from '../lib/firestore'
import { formatDate } from '../lib/format'

export default function AuditTrail() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeAuditLogs((data) => {
      setLogs(data)
      setLoading(false)
    })
    return unsub
  }, [])

  return (
    <div>
      <h1 className="text-xl font-semibold sm:text-2xl">Audit trail</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Every sale, payment, and account change, with who did it and when. Showing the most recent {logs.length}
        entries.
      </p>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2 md:hidden">
        {logs.map((log) => (
          <li key={log.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">{log.action}</p>
              <span className="whitespace-nowrap text-xs text-ink-faint">{formatDate(log.createdAt, 'MMM d, HH:mm')}</span>
            </div>
            {log.details && <p className="mt-1 text-xs text-ink-soft">{log.details}</p>}
            <p className="mt-2 text-xs text-ink-faint">{log.userName}</p>
          </li>
        ))}
        {!loading && logs.length === 0 && <p className="card px-5 py-8 text-center text-sm text-ink-faint">No activity logged yet.</p>}
      </ul>

      {/* Desktop: table */}
      <div className="card hidden overflow-hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-paper text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-5 py-3 font-medium">Time</th>
              <th className="px-5 py-3 font-medium">User</th>
              <th className="px-5 py-3 font-medium">Action</th>
              <th className="px-5 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="ledger-row hover:bg-paper/60">
                <td className="whitespace-nowrap px-5 py-2.5 text-ink-soft">{formatDate(log.createdAt, 'MMM d, yyyy HH:mm')}</td>
                <td className="px-5 py-2.5">{log.userName}</td>
                <td className="px-5 py-2.5">{log.action}</td>
                <td className="px-5 py-2.5 text-ink-soft">{log.details}</td>
              </tr>
            ))}
            {!loading && logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-ink-faint">
                  No activity logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
