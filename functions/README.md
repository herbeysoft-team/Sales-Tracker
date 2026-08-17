# WhatsApp ledger alerts (Cloud Functions + CallMeBot)

Sends a WhatsApp message to a number you choose whenever a **sale is
logged** or a **payment is recorded**. Uses
[CallMeBot](https://www.callmebot.com)'s free WhatsApp API — not an
official Meta/WhatsApp product, free for personal use, no business
verification needed. Good fit for alerting an owner/admin; not a
customer-messaging platform.

## 1. Get a CallMeBot API key (one-time, ~2 minutes)

1. Save this contact to the phone whose WhatsApp you want to receive
   alerts on: **+34 613 01 49 37**.
2. From that phone, send the contact this exact WhatsApp message:
   `I allow callmebot to send me messages`
3. Within a couple of minutes you'll get a reply back with your API key,
   e.g. `API Activated for your phone number. Your APIKEY is 123456`.
   (If the bot doesn't reply within 24h, it may be at capacity — try again
   later, per CallMeBot's own notes.)

Repeat with a second phone if you want more than one number notified.

## 2. Configure the functions

```bash
cd functions
cp .env.example .env
```

Edit `.env`:

```
CALLMEBOT_PHONE=2348012345678
CALLMEBOT_APIKEY=123456
```

For multiple recipients, comma-separate the phone numbers — they all need
their own API key from step 1, but CallMeBot happens to issue the same
key format per number, so keep one env var per number if the keys differ
(simplest: duplicate the function call, or just notify the one primary
admin number).

## 3. Deploy

```bash
firebase login
firebase init functions   # if you haven't already; point it at this project, keep the existing functions/ folder
npm install --prefix functions
firebase deploy --only functions
```

## 4. Test it

Log a sale or record a payment from the app — the configured number(s)
should get a WhatsApp message within a few seconds. Check
`firebase functions:log` if nothing arrives.

## Notes

- This runs on Firebase's **Blaze (pay-as-you-go) plan** — Cloud Functions
  require it, but the free monthly quota (2M invocations) comfortably
  covers this use case at zero cost for a small business.
- CallMeBot itself is free but unofficial and rate-limited for personal
  use — don't build customer-facing messaging on it. For that, see the
  "Optional: server-side overdue stamping" section in the main README,
  which points at the official Meta WhatsApp Cloud API instead.
