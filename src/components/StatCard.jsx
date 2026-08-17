export default function StatCard({ label, value, sub, accent = 'ink' }) {
  const accentClass = {
    ink: 'text-ink',
    teal: 'text-teal',
    amber: 'text-amber',
    rust: 'text-rust',
  }[accent]

  return (
    <div className="card p-4 sm:p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">{label}</p>
      <p className={`figure mt-2 text-lg font-semibold sm:text-2xl ${accentClass}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-ink-faint">{sub}</p>}
    </div>
  )
}
