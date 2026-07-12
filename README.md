# Creator Voice Tools

Full-stack Next.js app (App Router + TypeScript). This replaces the old single-file
static landing page (`legacy/creator-voice-tools-v7.html`, kept for reference) with
a real backend: authentication, Stripe Checkout + webhooks, a Postgres database, and
a protected customer dashboard with secure downloads.

## Stack

- **Next.js 15** (App Router) — landing page, dashboard, and API routes in one app
- **PostgreSQL + Prisma** — users, sessions, orders, voices, entitlements
- **Stripe Checkout + webhooks** — payment and order fulfillment
- **Resend** — verification / password-reset email (falls back to console logging if unset)
- **bcryptjs + jose** — password hashing and signed session cookies

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values below
```

### 1. Database

Point `DATABASE_URL` at a Postgres instance, then:

```bash
npx prisma migrate dev --name init
npm run prisma:seed
```

The seed script loads `prisma/seed-data/voices.json` and `packs.json` (extracted
from the original static site by `scripts/extract-assets.mjs`) and writes
placeholder deliverable files to `storage/voices/*.zip`. **Replace those
placeholder files with the real packaged voice presets before launch** —
`Voice.fileKey` in the DB points at the filename inside `storage/voices/`.

### 2. Auth secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Put the output in `AUTH_SECRET`.

### 3. Stripe

- Add your test secret key to `STRIPE_SECRET_KEY`.
- For local webhook testing: `npm run stripe:listen` (requires the Stripe CLI),
  and put the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
- In production, create a webhook endpoint pointed at `/api/stripe/webhook`
  listening for `checkout.session.completed` (and optionally
  `checkout.session.expired`), and use its signing secret.

### 4. Email (optional for local dev)

Leave `RESEND_API_KEY` unset to have verification/reset emails logged to the
console instead of sent. Set it (plus `EMAIL_FROM`) to send real email via
[Resend](https://resend.com).

### 5. Create your first admin

```bash
npm run dev        # in one terminal — sign up a normal account through the UI first
npm run make-admin you@example.com
```

This just flips `User.role` to `ADMIN` for an existing account. Log out and back
in (or just refresh) and `/admin` is reachable from that account.

### 6. Run it

```bash
npm run dev
```

## How a purchase works

1. User selects voices for a pack on the landing page and clicks Purchase.
2. Client calls `POST /api/checkout`. If not logged in, it's redirected to
   `/login` with the pending selection stashed in `sessionStorage`, and
   resumes checkout automatically after login.
3. The route re-validates pricing and voice selection server-side (never
   trusts client-sent prices), creates a Stripe Checkout Session with
   `userId` / `packId` / `voiceIds` in `metadata`, and writes a `PENDING`
   `Order` row keyed by the Checkout Session id.
4. Stripe redirects to Checkout. On success, Stripe calls
   `POST /api/stripe/webhook`, which verifies the signature, flips the
   matching `Order` to `PAID`, and upserts `Entitlement` rows — this is what
   unlocks the voices.
5. The dashboard (`/dashboard`) reads `Entitlement` joined with `Voice` to
   show only what the logged-in user owns. Downloads go through
   `GET /api/downloads/[voiceId]`, which re-checks the entitlement and
   streams the file from `storage/voices/` (never `/public`, so it can't be
   reached by guessing a URL).

## Admin dashboard

`/admin` is gated on `User.role === 'ADMIN'` — `middleware.ts` does a fast,
Edge-safe "is this a valid session" check (it can't reach Postgres to check
the role), and `src/app/admin/layout.tsx` calls `requireAdminPage()`, which
*is* the real, DB-backed authorization check for every admin page. Every
`/api/admin/*` route independently calls `requireAdminApi()` too — the UI
gate is not the security boundary, the route checks are.

What's there:

- **Voices** (`/admin/voices`) — create voices with image/preview/deliverable
  file uploads, edit metadata, replace files, publish a new version (which
  bumps `Voice.version` and appends a `VoiceUpdate` row — visible in the
  customer dashboard's update history), deactivate instead of delete.
- **Packs** (`/admin/packs`) — edit pricing, description, features, and how
  many voices a pack lets a customer pick; create new packs.
- **Customers** (`/admin/users`) — search by email, view a customer's orders
  and owned voices, manually grant or revoke a voice (revoke keeps a reason
  and is reversible — see `Entitlement.revokedAt`/`revokedReason`), resend
  their verification email, promote/demote admin role (an admin can't change
  their own role, so you can't lock yourself out).
- **Orders** (`/admin/orders`) — filter by status, jump to the order in the
  Stripe dashboard, refund (calls the Stripe Refunds API, marks the order
  `REFUNDED`, and revokes the entitlements it granted), or "Sync" to
  re-fetch the Checkout Session from Stripe and repair the order if a
  webhook was ever missed.
- **Overview** (`/admin`) — total revenue, order/customer counts, active
  entitlements, top-selling voices, recent purchases, and a 30-day revenue
  chart (`src/lib/analytics.ts`).

File uploads write to local disk (`public/voices`, `public/previews`,
`storage/voices`) via `src/lib/uploads.ts`, same as the seed script. On an
ephemeral filesystem (e.g. serverless deploys) swap that module for
S3-compatible storage — it's the only place upload logic lives.

## Extending later

The schema and route structure were built so these don't require a rework:

- **Discount codes** — `Order.metadata` (JSON) already exists; add a
  `DiscountCode` model and apply it in `/api/checkout` before creating the
  Stripe session.
- **Affiliate tracking** — same `Order.metadata` escape hatch, or a
  `referredBy` field on `User`.
- **Subscriptions** — `Entitlement.expiresAt` is already nullable
  (`null` = perpetual); a subscription pack just sets it and a renewal job
  extends it.
- **Product updates** — `VoiceUpdate` already stores version history shown
  in the dashboard; the admin "Publish an update" form
  (`/admin/voices/[id]`) is the UI for this.
- **More admin sections** — `AdminShell`'s nav array
  (`src/components/admin/AdminShell.tsx`) and the `requireAdminApi()` /
  `ActionButton` pattern used throughout `src/app/api/admin/*` are meant to
  be copy-pasted for the next section; nothing about adding one is special-cased.

## Notes

- `Voice.youtubeUrl` is seeded with a placeholder YouTube search link per
  voice — swap in real tutorial video URLs.
- Session cookies are signed JWTs (fast Edge-safe check in
  `middleware.ts`) backed by a `Session` row in Postgres (real source of
  truth, checked in `getCurrentUser()`), so logout / password-reset can
  revoke sessions server-side, not just by deleting a cookie.
