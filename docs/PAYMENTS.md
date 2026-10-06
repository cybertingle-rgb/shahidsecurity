# Payments + Invoices

## Provider abstraction

`PAYMENT_PROVIDER` defaults to `'manual'` and stays there until real
`PAYMENT_API_KEY`/`PAYMENT_SECRET` values are configured for an actual
provider (e.g. Stripe) — no live gateway is wired to real credentials
in code. Every payment recorded today is one that already happened
elsewhere (a confirmed bank transfer, typically) — this app records
receipt, it does not process a charge. There is no card data anywhere
in the schema or any form.

## Workflow

1. Create an invoice against a real customer (`customers` — created
   directly, or via converting a lead on the Customers & Leads page).
2. Record a manual payment against the invoice as money actually
   arrives. Verified live: two partial payments summing exactly to the
   invoice total correctly flip its status to `paid` automatically.
3. Void an invoice that's no longer owed (verified live).

## Known gaps

- No invoice line items — just a single total amount. Fine for the
  simple engagements seen so far; add line items (a child table) if a
  real invoice ever needs an itemized breakdown.
- No PDF generation or emailing of invoices yet.
- Activating a real gateway (Stripe or similar) requires: real
  production credentials from the user, a webhook endpoint to receive
  payment-confirmation events, and PCI-scope review before any card
  data path is built — none of that exists yet, deliberately, per the
  standing rule against activating a payment gateway without real
  credentials.
