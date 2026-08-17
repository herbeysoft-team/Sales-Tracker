import { formatMoney } from '../lib/format'

export default function PeriodReportCard({ label, rangeLabel, sales, payments, exposure }) {
  return (
    <div className="card p-4 sm:p-5">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mb-3 text-xs text-ink-faint">{rangeLabel}</p>
      <dl className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-ink-soft">Sales</dt>
          <dd className="figure font-medium">{formatMoney(sales)}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt className="text-ink-soft">Payments / remittances</dt>
          <dd className="figure font-medium text-teal">{formatMoney(payments)}</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2">
          <dt className="text-ink-soft">Exposure</dt>
          <dd className="figure font-medium text-rust">{formatMoney(exposure)}</dd>
        </div>
      </dl>
    </div>
  )
}
