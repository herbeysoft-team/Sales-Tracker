import { STATUS_STYLES, STATUS_LABELS } from '../lib/format'

export default function StatusBadge({ status, manual = false }) {
  return (
    <span
      className={`stamp ${STATUS_STYLES[status] || STATUS_STYLES.unpaid}`}
      title={manual ? 'Manually set by admin' : undefined}
    >
      {STATUS_LABELS[status] || status}
      {manual && <span aria-hidden="true">·M</span>}
    </span>
  )
}
