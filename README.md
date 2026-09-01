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



## Suggested next additions

- Email/SMS reminders as a due date approaches (Cloud Functions + a provider
  like SendGrid or Termii).
- CSV export of the ledger.
- Soft-delete / archive instead of hard delete for customers and sales.
