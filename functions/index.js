const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { onDocumentCreated } = require('firebase-functions/v2/firestore')
const { defineString } = require('firebase-functions/params')
const { logger } = require('firebase-functions')

initializeApp()
const db = getFirestore()

// Set these with a functions/.env file (see functions/.env.example) or
// `firebase functions:config` before deploying. CALLMEBOT_PHONE can be a
// single number or a comma-separated list to notify more than one person.
const CALLMEBOT_PHONE = defineString('CALLMEBOT_PHONE')
const CALLMEBOT_APIKEY = defineString('CALLMEBOT_APIKEY')

function formatMoney(amount = 0) {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`
}

function formatDate(timestamp) {
  if (!timestamp) return '—'
  return timestamp.toDate().toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

// CallMeBot's WhatsApp API is a plain GET request — no SDK needed.
// https://www.callmebot.com/blog/free-api-whatsapp-messages/
async function sendWhatsApp(text) {
  const apikey = CALLMEBOT_APIKEY.value()
  const phones = CALLMEBOT_PHONE.value()
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)

  if (!apikey || phones.length === 0) {
    logger.warn('CallMeBot not configured — skipping WhatsApp notification.')
    return
  }

  await Promise.all(
    phones.map(async (phone) => {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(
        phone
      )}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(apikey)}`
      try {
        const res = await fetch(url)
        if (!res.ok) {
          logger.error(`CallMeBot request failed for ${phone}: ${res.status}`)
        }
      } catch (err) {
        logger.error(`CallMeBot request errored for ${phone}:`, err)
      }
    })
  )
}

async function getCustomerAndMarketer(customerId) {
  const customerSnap = await db.doc(`customers/${customerId}`).get()
  const customer = customerSnap.exists ? customerSnap.data() : null
  let marketerName = 'Unassigned'
  if (customer?.assignedMarketerId) {
    const marketerSnap = await db.doc(`users/${customer.assignedMarketerId}`).get()
    if (marketerSnap.exists) marketerName = marketerSnap.data().name
  }
  return { customerName: customer?.name || 'Unknown customer', marketerName }
}

// Fires whenever a marketer or admin logs a new sale.
exports.notifyOnSaleCreated = onDocumentCreated('sales/{saleId}', async (event) => {
  const sale = event.data.data()
  const { customerName, marketerName } = await getCustomerAndMarketer(sale.customerId)

  const text =
    `🧾 *New sale logged*\n` +
    `Customer: ${customerName}\n` +
    `Amount: ${formatMoney(sale.amount)}\n` +
    `Due: ${formatDate(sale.dueDate)}\n` +
    `Marketer: ${marketerName}`

  await sendWhatsApp(text)
})

// Fires whenever a payment is recorded against a sale.
exports.notifyOnPaymentCreated = onDocumentCreated('payments/{paymentId}', async (event) => {
  const payment = event.data.data()
  const { customerName, marketerName } = await getCustomerAndMarketer(payment.customerId)

  const saleSnap = await db.doc(`sales/${payment.saleId}`).get()
  const sale = saleSnap.exists ? saleSnap.data() : null
  const balance = sale ? Math.max(0, sale.amount - sale.amountPaid) : null

  const text =
    `💰 *Payment received*\n` +
    `Customer: ${customerName}\n` +
    `Amount: ${formatMoney(payment.amount)}\n` +
    (balance !== null ? `Remaining balance: ${formatMoney(balance)}\n` : '') +
    `Recorded by: ${marketerName}`

  await sendWhatsApp(text)
})
