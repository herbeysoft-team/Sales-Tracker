# SALES TRACKER

A sales ledger for tracking customers, orders, payment due dates, and marketer
performance. Built with React + Vite, Tailwind CSS, and Firebase
(Auth + Firestore).

## What's inside

- **Customers** — profile, assigned marketer, last order date, next payment
  due date, running outstanding balance.
- **Sales ledger** — every order logged with amount, due date, and status
  (unpaid / partial / paid / **overdue**, computed automatically the moment a
  due date passes — see `effectiveSaleStatus` in `src/lib/format.js`).
- **Payments** — recorded against a specific sale; updates that sale's status
  and the customer's rollup totals in one transaction.
- **Admin-managed accounts** — admin creates every account (marketer *or*
  admin) from **Marketers → Add user**, choosing the role at creation time.
  No public sign-up.
- **Editable sales** — admins can correct a sale's amount, order date, due
  date, or description after the fact (pencil icon on the Sales ledger, on
  a customer's order history, or `/sales/:id/edit`). The customer's rollup
  totals and ledger balance recompute automatically.
- **Profile page** — any signed-in user can update their own name and
  phone from the Profile link in the nav.
- **Account ledger** — each customer's page shows a proper Date /
  Description / Debit / Credit / Balance table (with an opening balance
  row), not just a list. Every sale is a debit, every payment a credit,
  and the balance reads negative for as long as the customer owes money —
  the same way a paper ledger would read.
- **Marketers** (admin only) — performance leaderboard: total sales,
  collected, outstanding, collection rate, per marketer, plus a drill-down
  page per marketer.
- **Role-based access** — admins see everything; marketers only see their own
  assigned customers, sales, and payments, both in the UI and enforced again
  in `firestore.rules`.

## 1. Create the Firebase project

1. Go to the [Firebase console](https://console.firebase.google.com), create
   a project.
2. **Build → Authentication → Sign-in method** — enable **Email/Password**.
3. **Build → Firestore Database** — create a database (start in production
   mode; the rules file below locks it down properly).
4. **Project settings → Your apps → Add app → Web** — copy the config object.

## 2. Configure the app

Paste your config into `src/firebase.js`, replacing the placeholder values:

```js
const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  storageBucket: '...',
  messagingSenderId: '...',
  appId: '...',
}
```

(For anything beyond local experimentation, move these into a `.env` file as
`VITE_FIREBASE_API_KEY` etc. and read them via `import.meta.env` instead of
committing them.)

## 3. Deploy the security rules

Install the Firebase CLI once (`npm install -g firebase-tools`), then from
the project root:

```bash
firebase login
firebase init firestore   # point it at this project, keep firestore.rules
firebase deploy --only firestore:rules
```

## 4. Install & run

```bash
npm install
npm run dev
```

## 5. Create your first admin account

There's no public sign-up screen — accounts are created by an admin, on
purpose. To bootstrap the very first admin:

1. In the Firebase console, go to **Authentication → Users → Add user**,
   create yourself with an email/password.
2. Go to **Firestore → Data**, create a document by hand:
   - Collection: `users`
   - Document ID: the UID of the user you just created (copy it from the
     Authentication tab)
   - Fields: `name` (string), `email` (string), `role` (string, value
     `admin`), `active` (boolean, `true`)
3. Sign in at `/login` with that account. You're now the admin, and can
   create marketer *or* admin accounts from **Marketers → Add user** inside the app.

## How the data model fits together

```
users/{uid}            role: "admin" | "marketer"
customers/{id}          assignedMarketerId → users/{uid}
  ├─ lastOrderDate, totalOrdersCount, totalPurchasedAmount
  ├─ totalOutstandingBalance, nextDueDate      (auto-recomputed on every sale/payment)
sales/{id}               customerId, marketerId, amount, amountPaid, dueDate, status
payments/{id}             saleId, customerId, marketerId, amount, paidDate
```

Every `createSale` and `recordPayment` call recomputes the parent customer's
rollup fields (`src/lib/firestore.js → recomputeCustomerRollups`), so the
customer list and dashboard never need expensive live aggregation.

## Optional: server-side overdue stamping

The "overdue" status shown in the UI is computed live
(`effectiveSaleStatus`) by comparing each sale's due date to today — no
scheduled job required for the app to be correct. If you later want the
`status` field *stored* as `"overdue"` in Firestore too (e.g. to run direct
Firestore queries filtered by status, or to trigger reminder emails), add a
Cloud Functions project with a daily scheduled function that queries
`sales` where `status in ["unpaid","partial"]` and `dueDate < now`, and
patches `status: "overdue"`. That's a natural next add-on once you're on the
Blaze plan.

## WhatsApp ledger alerts (optional)

`functions/` contains Cloud Functions that push a WhatsApp message via
[CallMeBot](https://www.callmebot.com) (free, unofficial) whenever a sale
is logged or a payment is recorded. See `functions/README.md` for the
2-minute setup. Skip this folder entirely if you don't want WhatsApp
alerts — the rest of the app works without it.

## Mobile-first design

Every screen is built mobile-first and tested down to a narrow phone
width:

- **Bottom tab bar** (Dashboard / Customers / Sales / More) on mobile,
  replaced by the full sidebar at the `md` breakpoint and up.
- **Slide-out drawer** on mobile for account info, sign-out, and
  admin-only links.
- **Tables become stacked cards** on mobile (Customers, Sales ledger,
  Marketers) — the same data, laid out for thumbs instead of a wide grid.
- **Forms** stack their fields to one column on small screens and widen
  to two columns from `sm` up.

## Suggested next additions

- Email/SMS reminders as a due date approaches (Cloud Functions + a provider
  like SendGrid or Termii).
- CSV export of the ledger.
- Soft-delete / archive instead of hard delete for customers and sales.
