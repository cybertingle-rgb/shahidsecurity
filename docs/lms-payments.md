# Learn with Shahid — Payment Architecture

**Status:** proposal, researched against currently-published provider documentation (September 2026) rather than assumed. **No payment provider has been integrated, no credentials exist, and none should be requested until this document is reviewed and a provider is chosen.**

## Research findings (Pakistan, PKR)

- **Stripe does not support Pakistan-registered businesses directly** — confirmed current as of 2026; Pakistani businesses cannot open a standard Stripe account without incorporating in a supported country first, which is a legal/business step out of scope for this project. This rules out the payment provider most developers default to.
- **JazzCash** and **Easypaisa** (the two dominant Pakistani mobile-wallet payment methods) both require a formal merchant onboarding process — business registration, KYC/due diligence, and approval — before any API credentials are issued. This is **not something that can be integrated speculatively**; Shahid needs to apply for a merchant account with one or both before any code against their APIs can be tested against real credentials. Both expose sandbox environments once onboarded (JazzCash's "Sandbox Documentation" portal; Easypaisa's REST APIs for over-the-counter and mobile-account transactions).
- **Safepay** (`getsafepay.com`) is a Pakistan-focused payment aggregator with a modern, well-documented REST/JSON API (`apidocs.getsafepay.com`), a real sandbox environment, hosted checkout, and — notably — built-in subscription/invoicing primitives, which matters given the brief's future subscription plans. It appears to sit in front of JazzCash/Easypaisa/cards as a single integration, which is a materially easier developer experience than integrating each wallet directly.
- Other Pakistani aggregators surfaced in research (PayFast, XPay Pakistan) exist but weren't evaluated in depth — worth a short comparison against Safepay before committing, specifically on transaction fees and settlement time, which are business terms Shahid should compare directly with each provider rather than have assumed here.

**Recommendation for V1**: integrate **one aggregator (Safepay, pending a direct fee/terms comparison against alternatives)** for online card/wallet payments, and build the **manual bank transfer + admin verification** flow (explicitly requested in the brief) as the day-one fallback that requires no third-party approval at all — so launch isn't blocked on any merchant application's approval timeline. Direct JazzCash/Easypaisa integration becomes a Phase 7+ addition once (a) merchant accounts are approved and (b) volume justifies the extra integration work over the aggregator.

## The provider abstraction

Every payment path in the app — aggregator, direct wallet API, or manual transfer — implements the same interface, so adding a provider later never touches checkout, order, or enrollment logic:

```ts
interface PaymentProvider {
  createPayment(order: Order): Promise<{ redirectUrl?: string; providerReference: string }>;
  verifyPayment(providerReference: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string, amount: Money): Promise<RefundResult>;
  getPaymentStatus(providerReference: string): Promise<PaymentStatus>;
  handleWebhook(rawBody: Buffer, signatureHeader: string): Promise<WebhookEvent>;
}
```

`ManualBankTransferProvider` implements the same interface with `createPayment` simply returning instructions instead of a redirect, and `verifyPayment`/`handleWebhook` being no-ops — the state transition instead happens through the explicit admin approve/reject action described below. This keeps "online" and "manual" as two implementations of one contract rather than two parallel code paths through the rest of the app.

## Manual payment flow (available from day one, no provider dependency)

1. Student selects "Bank Transfer," sees the configured account details (stored in `settings`, editable by admin — never hardcoded), and completes the transfer outside the platform.
2. Student submits a `manual_payment_submissions` record: transaction/reference number, amount, date, optional receipt image (validated per `lms-security.md`'s upload rules).
3. Order and payment sit in `pending_verification`. **No access is granted yet.**
4. Admin reviews the submission against the actual bank statement and chooses **Approve**, **Reject**, or **Request clarification** (a message back to the student, order stays pending). Approval is the only action that flips the order to `paid` and creates/activates the enrollment or membership — and it's logged to `audit_logs` with the approving admin's identity.

This directly satisfies the brief's explicit rule: **a screenshot alone never grants access; a human admin decision does.**

## Payment security (see also `lms-security.md`)

- Order amount and currency are always the server-side `prices` table lookup for the resolved country/currency (see `lms-business-model.md`) — never a value read from the request body.
- Webhook endpoints validate the provider's signature on every call; unsigned or invalid-signature requests are rejected before any order lookup happens, so they can't be used to probe for valid order IDs.
- `payments.idempotency_key` (unique constraint) means a webhook retry or a double-submitted checkout cannot create two paid orders or grant enrollment twice.
- Refunds are a tracked workflow (`refunds` table: requested → approved/rejected → processed), not a direct database edit — and access revocation on refund is a deliberate, logged step, not automatic, since a partial refund or a goodwill refund might not always mean revoking a course a student has already substantially completed. That judgment call belongs to Shahid via the admin UI, not a hardcoded rule.

## Coupons and anti-fraud

Coupon validation (expiry, usage limit, per-user limit, minimum order amount, applicable products) happens **inside the same database transaction** that creates the order, with the uniqueness constraints described in `lms-database.md` — so two concurrent checkout attempts with the same single-use coupon can't both succeed. Rate limiting on checkout-initiation endpoints and CAPTCHA-style friction (reusing the existing site's Cloudflare Turnstile pattern) on registration guard against automated checkout/account-creation abuse without adding invasive tracking.

## What's explicitly not being built yet

Recurring subscriptions, direct JazzCash/Easypaisa integration, and international card processing for UAE/Saudi/UK/US/etc. currencies are all real future needs the schema and provider interface already accommodate (see `lms-database.md`'s multi-currency `prices` table), but none are being implemented now — per the brief, subscriptions specifically wait until a provider with proper recurring-billing support is chosen and reviewed, not bolted on opportunistically.

---

Sources: [JazzCash Sandbox Documentation](https://sandbox.jazzcash.com.pk/SandboxDocumentation/), Easypaisa Online Payment Gateway (easypaisa.com.pk), [Safepay API Reference](https://apidocs.getsafepay.com/), industry comparison articles on Pakistani payment gateways, September 2026. As with the blog research this session, this sandbox cannot make outbound requests to verify these pages load live — the findings above came from WebSearch results, which is good evidence but not a substitute for Shahid (or whoever integrates this) reading the current live docs directly before writing integration code.
