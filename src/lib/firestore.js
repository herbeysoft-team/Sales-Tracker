import {
  collection,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, secondaryAuth } from '../firebase'
import { effectiveSaleStatus } from './format'

const toTimestamp = (value) => (value ? Timestamp.fromDate(new Date(value)) : null)

// ---------- Marketers / Users ----------

export async function createUserAccount({ name, email, password, phone, role = 'marketer' }) {
  const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password)
  await setDoc(doc(db, 'users', cred.user.uid), {
    name,
    email,
    phone: phone || '',
    role,
    active: true,
    createdAt: serverTimestamp(),
  })
  await signOut(secondaryAuth) // don't leave the admin signed in as the new user
  return cred.user.uid
}

export function subscribeMarketers(callback) {
  const q = query(collection(db, 'users'), where('role', '==', 'marketer'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeMarketers error:', err)
  )
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export function subscribeUserProfile(uid, callback) {
  return onSnapshot(
    doc(db, 'users', uid),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => console.error('subscribeUserProfile error:', err)
  )
}

// Lets a user edit their own profile (e.g. name, phone), or an admin edit
// any user's profile — write access is enforced in firestore.rules.
export async function updateUserProfile(uid, patch) {
  await updateDoc(doc(db, 'users', uid), patch)
}

// ---------- Customers ----------

export async function createCustomer({ name, phone, email, address, assignedMarketerIds }) {
  const ref = doc(collection(db, 'customers'))
  await setDoc(ref, {
    name,
    phone: phone || '',
    email: email || '',
    address: address || '',
    assignedMarketerIds: assignedMarketerIds || [],
    status: 'active',
    createdAt: serverTimestamp(),
    lastOrderDate: null,
    totalOrdersCount: 0,
    totalPurchasedAmount: 0,
    totalOutstandingBalance: 0,
    nextDueDate: null,
  })
  return ref.id
}

export async function updateCustomer(customerId, patch) {
  await updateDoc(doc(db, 'customers', customerId), patch)
}

export function subscribeCustomers(callback, { marketerId } = {}) {
  const base = collection(db, 'customers')
  const q = marketerId
    ? query(base, where('assignedMarketerIds', 'array-contains', marketerId))
    : query(base, orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.error('subscribeCustomers error:', err)
  )
}

export function subscribeCustomer(customerId, callback) {
  return onSnapshot(
    doc(db, 'customers', customerId),
    (snap) => callback(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    (err) => console.error('subscribeCustomer error:', err)
  )
}

// Recomputes a customer's rollup fields (last order date, totals, next due
// date) from their sales *and* payments. Called after every sale or payment
// write so the customer list / dashboard never needs to re-derive this on
// the fly.
async function recomputeCustomerRollups(customerId) {
  const [salesSnap, paymentsSnap] = await Promise.all([
    getDocs(query(collection(db, 'sales'), where('customerId', '==', customerId))),
    getDocs(query(collection(db, 'payments'), where('customerId', '==', customerId))),
  ])
  const sales = salesSnap.docs.map((d) => d.data())
  const payments = paymentsSnap.docs.map((d) => d.data())

  const totalPurchasedAmount = sales.reduce((sum, sale) => sum + (sale.amount || 0), 0)
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  // Total sales minus total payments — this counts advance/unlinked
  // payments too, not just payments tied to a specific sale. Negative
  // means the customer is in credit (they've paid ahead of any sale).
  const totalOutstandingBalance = totalPurchasedAmount - totalPaid

  let lastOrderDate = null
  for (const sale of sales) {
    const orderDate = sale.orderDate?.toDate?.() ?? null
    if (orderDate && (!lastOrderDate || orderDate > lastOrderDate)) lastOrderDate = orderDate
  }

  // Next due date still looks at each sale's own linked-payment balance —
  // an unlinked advance payment doesn't automatically settle a specific
  // sale's due date until it's applied to one.
  let nextDueDate = null
  for (const sale of sales) {
    const balance = Math.max(0, (sale.amount || 0) - (sale.amountPaid || 0))
    if (balance > 0) {
      const due = sale.dueDate?.toDate?.() ?? null
      if (due && (!nextDueDate || due < nextDueDate)) nextDueDate = due
    }
  }

  await updateDoc(doc(db, 'customers', customerId), {
    totalOrdersCount: sales.length,
    totalPurchasedAmount,
    totalOutstandingBalance,
    lastOrderDate: lastOrderDate ? Timestamp.fromDate(lastOrderDate) : null,
    nextDueDate: nextDueDate ? Timestamp.fromDate(nextDueDate) : null,
  })
}

// ---------- Sales ----------

// Applies a customer's unused advance-payment credit (payments with no
// saleId) toward a sale, oldest credit first, up to that sale's remaining
// balance. Doesn't touch the original payment amounts (so the ledger still
// shows exactly what was received and when) — it only tracks how much of
// each advance payment is still unapplied via `remainingAmount`, and bumps
// the sale's own amountPaid/status so its badge reflects reality.
async function applyAvailableCreditToSale(customerId, saleId) {
  const paymentsSnap = await getDocs(query(collection(db, 'payments'), where('customerId', '==', customerId)))
  const creditPayments = paymentsSnap.docs
    .map((d) => ({ ref: d.ref, ...d.data() }))
    .filter((p) => !p.saleId && (p.remainingAmount ?? p.amount) > 0)
    .sort((a, b) => (a.paidDate?.toMillis?.() || 0) - (b.paidDate?.toMillis?.() || 0))

  if (creditPayments.length === 0) return

  const saleRef = doc(db, 'sales', saleId)

  await runTransaction(db, async (tx) => {
    const saleSnap = await tx.get(saleRef)
    if (!saleSnap.exists()) return
    const sale = saleSnap.data()
    let remainingSaleBalance = Math.max(0, (sale.amount || 0) - (sale.amountPaid || 0))
    if (remainingSaleBalance <= 0) return

    const paymentUpdates = []
    let totalApplied = 0

    for (const payment of creditPayments) {
      if (remainingSaleBalance <= 0) break
      const paymentSnap = await tx.get(payment.ref)
      if (!paymentSnap.exists()) continue
      const current = paymentSnap.data()
      const available = current.remainingAmount ?? current.amount
      if (available <= 0) continue

      const applyAmount = Math.min(available, remainingSaleBalance)
      paymentUpdates.push({ ref: payment.ref, newRemaining: available - applyAmount })
      remainingSaleBalance -= applyAmount
      totalApplied += applyAmount
    }

    if (totalApplied <= 0) return

    const newAmountPaid = (sale.amountPaid || 0) + totalApplied
    const patch = { amountPaid: newAmountPaid }
    // Only recompute the status label if it isn't manually pinned — a
    // manual override always takes precedence over the payment math.
    if (!sale.manualStatus) {
      patch.status = newAmountPaid >= sale.amount ? 'paid' : newAmountPaid > 0 ? 'partial' : 'unpaid'
    }
    tx.update(saleRef, patch)
    paymentUpdates.forEach((u) => tx.update(u.ref, { remainingAmount: u.newRemaining }))
  })
}

export async function createSale({ customerId, marketerId, amount, orderDate, dueDate, description }) {
  const ref = doc(collection(db, 'sales'))
  await setDoc(ref, {
    customerId,
    marketerId,
    amount: Number(amount),
    amountPaid: 0,
    orderDate: toTimestamp(orderDate),
    dueDate: toTimestamp(dueDate),
    description: description || '',
    status: 'unpaid',
    manualStatus: false,
    createdAt: serverTimestamp(),
  })
  await applyAvailableCreditToSale(customerId, ref.id)
  await recomputeCustomerRollups(customerId)
  return ref.id
}

// Admin-only correction of a sale already on the books. Re-derives status
// from the (possibly unchanged) amountPaid against the new amount — unless
// a manual override is active, in which case the status is left as-is —
// applies any available credit if the sale's balance grew, then recomputes
// the customer's rollups so the ledger stays consistent.
export async function updateSale(saleId, { amount, orderDate, dueDate, description }) {
  const saleRef = doc(db, 'sales', saleId)
  const customerId = await runTransaction(db, async (tx) => {
    const snap = await tx.get(saleRef)
    if (!snap.exists()) throw new Error('Sale not found')
    const sale = snap.data()
    const newAmount = Number(amount)
    const amountPaid = sale.amountPaid || 0

    const patch = {
      amount: newAmount,
      orderDate: toTimestamp(orderDate),
      dueDate: toTimestamp(dueDate),
      description: description || '',
    }
    if (!sale.manualStatus) {
      patch.status = amountPaid <= 0 ? 'unpaid' : amountPaid >= newAmount ? 'paid' : 'partial'
    }
    tx.update(saleRef, patch)
    return sale.customerId
  })
  await applyAvailableCreditToSale(customerId, saleId)
  await recomputeCustomerRollups(customerId)
}

export function subscribeSales(callback, { marketerId, customerId } = {}) {
  const base = collection(db, 'sales')
  let q
  if (customerId) q = query(base, where('customerId', '==', customerId))
  else if (marketerId) q = query(base, where('marketerId', '==', marketerId))
  else q = query(base, orderBy('orderDate', 'desc'))

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.orderDate?.toMillis?.() || 0) - (a.orderDate?.toMillis?.() || 0))
      callback(docs)
    },
    (err) => console.error('subscribeSales error:', err)
  )
}

export async function getSale(saleId) {
  const snap = await getDoc(doc(db, 'sales', saleId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

// Admin manual override: pins a sale's status regardless of the payment
// math. Pass 'auto' to clear the override and let it go back to being
// computed from amountPaid vs amount.
export async function setSaleStatus(saleId, status) {
  const saleRef = doc(db, 'sales', saleId)
  if (status === 'auto') {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(saleRef)
      if (!snap.exists()) throw new Error('Sale not found')
      const sale = snap.data()
      const amountPaid = sale.amountPaid || 0
      const computed = amountPaid <= 0 ? 'unpaid' : amountPaid >= sale.amount ? 'paid' : 'partial'
      tx.update(saleRef, { status: computed, manualStatus: false })
    })
  } else {
    await updateDoc(saleRef, { status, manualStatus: true })
  }
}

// ---------- Payments ----------

// saleId is optional: pass it to apply the payment against a specific
// sale (updates that sale's amountPaid/status). Omit it to record a
// standalone/advance payment against the customer only — used when a
// customer pays before any sale exists yet. Either way, the customer's
// rollups (including the overall outstanding balance) are recomputed
// from *all* their sales and payments, not just linked ones.
export async function recordPayment({ saleId, customerId, amount, paidDate, method, note, marketerId }) {
  const paymentRef = doc(collection(db, 'payments'))

  let resolvedCustomerId = customerId

  if (saleId) {
    const saleRef = doc(db, 'sales', saleId)
    resolvedCustomerId = await runTransaction(db, async (tx) => {
      const saleSnap = await tx.get(saleRef)
      if (!saleSnap.exists()) throw new Error('Sale not found')
      const sale = saleSnap.data()
      const newPaid = (sale.amountPaid || 0) + Number(amount)

      const salePatch = { amountPaid: newPaid }
      if (!sale.manualStatus) {
        salePatch.status = newPaid >= sale.amount ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid'
      }
      tx.update(saleRef, salePatch)
      tx.set(paymentRef, {
        saleId,
        customerId: sale.customerId,
        marketerId: marketerId || sale.marketerId,
        amount: Number(amount),
        paidDate: toTimestamp(paidDate),
        method: method || 'cash',
        note: note || '',
        createdAt: serverTimestamp(),
      })
      return sale.customerId
    })
  } else {
    if (!resolvedCustomerId) throw new Error('customerId is required when recording a payment with no linked sale')
    await setDoc(paymentRef, {
      saleId: null,
      customerId: resolvedCustomerId,
      marketerId: marketerId || null,
      amount: Number(amount),
      remainingAmount: Number(amount),
      paidDate: toTimestamp(paidDate),
      method: method || 'cash',
      note: note || '',
      createdAt: serverTimestamp(),
    })
  }

  await recomputeCustomerRollups(resolvedCustomerId)
  return paymentRef.id
}

export function subscribePayments(callback, { customerId, saleId, marketerId } = {}) {
  const base = collection(db, 'payments')
  let q
  if (customerId) q = query(base, where('customerId', '==', customerId))
  else if (saleId) q = query(base, where('saleId', '==', saleId))
  else if (marketerId) q = query(base, where('marketerId', '==', marketerId))
  else q = query(base, orderBy('paidDate', 'desc'))

  return onSnapshot(
    q,
    (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => (b.paidDate?.toMillis?.() || 0) - (a.paidDate?.toMillis?.() || 0))
      callback(docs)
    },
    (err) => console.error('subscribePayments error:', err)
  )
}

// ---------- Marketer performance ----------

export async function getMarketerStats(marketerId) {
  const [salesSnap, paymentsSnap, customersSnap] = await Promise.all([
    getDocs(query(collection(db, 'sales'), where('marketerId', '==', marketerId))),
    getDocs(query(collection(db, 'payments'), where('marketerId', '==', marketerId))),
    getDocs(query(collection(db, 'customers'), where('assignedMarketerIds', 'array-contains', marketerId))),
  ])

  const sales = salesSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
  const payments = paymentsSnap.docs.map((d) => d.data())

  const totalSalesValue = sales.reduce((s, sale) => s + (sale.amount || 0), 0)
  const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const totalOutstanding = sales.reduce(
    (s, sale) => s + Math.max(0, (sale.amount || 0) - (sale.amountPaid || 0)),
    0
  )
  const overdueSales = sales.filter((sale) => effectiveSaleStatus(sale) === 'overdue')

  return {
    marketerId,
    customerCount: customersSnap.size,
    salesCount: sales.length,
    totalSalesValue,
    totalCollected,
    totalOutstanding,
    collectionRate: totalSalesValue > 0 ? totalCollected / totalSalesValue : 0,
    overdueCount: overdueSales.length,
    overdueValue: overdueSales.reduce((s, sale) => s + (sale.amount - sale.amountPaid), 0),
  }
}