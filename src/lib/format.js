import { format, formatDistanceToNow, differenceInCalendarDays } from 'date-fns'

export function formatMoney(amount = 0, currency = 'NGN') {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

export function toDate(value) {
  if (!value) return null
  if (value.toDate) return value.toDate() // Firestore Timestamp
  return new Date(value)
}

export function formatDate(value, pattern = 'dd MMM yyyy') {
  const d = toDate(value)
  return d ? format(d, pattern) : '—'
}

export function relativeToNow(value) {
  const d = toDate(value)
  return d ? formatDistanceToNow(d, { addSuffix: true }) : '—'
}

// A sale's *effective* status folds the due date into the stored status,
// so a sale flips to "overdue" automatically the moment it's late —
// no scheduled job required for the UI to reflect it correctly.
export function effectiveSaleStatus(sale) {
  if (!sale) return 'unpaid'
  if (sale.status === 'paid') return 'paid'
  const due = toDate(sale.dueDate)
  if (due && differenceInCalendarDays(due, new Date()) < 0) return 'overdue'
  return sale.status || 'unpaid'
}

export const STATUS_STYLES = {
  paid: 'bg-teal-soft text-teal',
  partial: 'bg-amber-soft text-amber',
  unpaid: 'bg-line/60 text-ink-soft',
  overdue: 'bg-rust-soft text-rust',
}

export const STATUS_LABELS = {
  paid: 'Paid',
  partial: 'Partial',
  unpaid: 'Unpaid',
  overdue: 'Overdue',
}

export function daysUntil(value) {
  const d = toDate(value)
  if (!d) return null
  return differenceInCalendarDays(d, new Date())
}
