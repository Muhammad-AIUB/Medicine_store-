# Medicine E-Commerce ("Thin Slice Store")

> This file is the living project memory. Update it whenever architecture,
> schema, scope, or conventions change. Never let it drift from reality.

## Status

- **Phase:** v1 SCAFFOLDED AND VERIFIED (2026-07-15). All three apps built,
  73 tests green (54 server Jest, 8 client + 4 admin Vitest, 7 Playwright E2E
  incl. golden path NEW→DELIVERED and double-submit race).
- **Run locally:** `npm run db:up` → `npm run db:migrate -w` … see Commands below.
- **Design doc (source of truth):**
  `C:\Users\mdjub\.gstack\projects\e-com\mdjub-nogit-design-20260715-211009.md`
  (approved + /plan-eng-review: 7 issues + 3 Codex tensions resolved, 0 unresolved;
  see its "Engineering Review Addendum" for implementation tasks T1-T8)
- **Test plan (23 mandated cases):**
  `C:\Users\mdjub\.gstack\projects\e-com\mdjub-nogit-eng-review-test-plan-20260715.md`
- **Wireframe:** `C:\Users\mdjub\.gstack\projects\e-com\wireframe-thin-slice-v1.html`
- **TODOS:** see `TODOS.md` (T-001 regulatory check is a LAUNCH BLOCKER)
- **Next step:** scaffold (implementation tasks T1-T8 in the design doc addendum).
- **Founder assignment (open):** interview 10 real people; ask "can I take your
  next order this week?"; fulfill 3-5 orders manually with a margin/failure log;
  name user #1.

## What this is

An online medicine store for one delivery locality (assumed Bangladesh —
confirm). v1 = the smallest store that can take a real order: OTC-only
catalog (~100 SKUs), search, cart, guest cash-on-delivery checkout, admin
for orders/products/stock.

## Stack (fixed by founder decision + eng review 2026-07-15)

- `server/` — NestJS + PostgreSQL + **Prisma 7 pinned with
  `moduleFormat: "cjs"` in prisma.config.ts** (Prisma 7 is ESM-by-default and
  breaks Nest's CJS build without it). @nestjs/swagger, @nestjs/throttler on
  public endpoints. Global exception filter returns one envelope:
  `{ statusCode, error, message, details? }`.
- **Validation:** zod schemas defined ONCE in `packages/shared`, consumed by
  the API (nestjs-zod pipe) and client forms (resolvers). No class-validator.
- **Admin auth:** JWT in an httpOnly cookie (SameSite=Lax, Secure in prod),
  CORS allowlist = client + admin origins only, CSRF header check on
  state-changing routes. Never localStorage tokens.
- `client/` — Next.js storefront (guest checkout, no customer accounts in v1;
  trust strip + COD policy page + invoice per delivery).
- `admin/` — Next.js admin dashboard (orders-first).
- `packages/shared` — raw TypeScript exports (contract types + zod schemas).
  HARD RULE: nothing in `packages/` imports from apps.
- Root: npm workspaces, docker-compose for local PostgreSQL, `.env.example`.
- **Tests (non-negotiable):** Jest in server/, Vitest+RTL in client/ and
  admin/, Playwright E2E (golden checkout, double-submit, admin pipeline).
  Tests ship alongside features — 23 mandated cases in the test plan.

## Non-negotiable premises (agreed 2026-07-15)

1. v1 proves demand — thin slice, not full platform.
2. **No prescription (Rx) medicine until a licensed pharmacy is attached.**
   Schema carries `is_prescription_required`; storefront excludes Rx items
   entirely in v1.
3. Stack above stands; no re-architecture.
4. No head-on fight with incumbents (Arogga, MedEasy); win on one locality/wedge.
5. This file stays updated.

## Key v1 rules (from design doc)

- Payment: cash on delivery only. Flat ৳60 delivery fee (config value);
  delivery hours + same-day cutoff are config values shown at checkout.
- Checkout: delivery-area dropdown limited to served area(s); out-of-area
  cannot submit.
- Every NEW order is phone-confirmed by the operator before fulfillment.
- Stock: decrement on CONFIRMED; restore on CANCELLED only if it had
  reached CONFIRMED. Door refusal/return of CONFIRMED → CANCELLED + restock.
- **All stock/status writes are atomic conditional updates** ($transaction +
  updateMany with precondition in WHERE; 0 rows affected = clean error).
  Never read-check-write.
- Order statuses: NEW → CONFIRMED → OUT_FOR_DELIVERY → DELIVERED / CANCELLED.
- Product carries medicine fields: manufacturer, strength, dosage_form,
  pack_unit, nearest_expiry (nullable). Full batch tracking is deferred.
- Seed: ~100 OTC SKUs prioritized from interview requests (placeholder prices
  OK until launch), idempotent, + initial admin from
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`.

## Commands

```
npm run db:up            # start PostgreSQL (Docker)
npm run db:migrate       # prisma migrate dev (run in server/, reads server/.env)
npm run db:seed          # 83 OTC SKUs + admin (idempotent; placeholder prices)
npm run dev:server       # NestJS API on :3001 (swagger at /docs)
npm run dev:client       # storefront on :3000
npm run dev:admin        # admin on :3002 (login: ADMIN_EMAIL/ADMIN_PASSWORD from server/.env)
npm test                 # all unit suites (Jest + Vitest)
npm run test:e2e         # Playwright (boots all three apps; DB must be up+seeded)
```

Notes that will save you time:
- `packages/shared` compiles to dist (`npm run build -w packages/shared`) —
  rebuild after editing schemas/types. This is a deliberate deviation from
  "raw TS, no build step": NestJS's tsc can't consume raw TS from
  node_modules. Source of truth is still the one `src/index.ts`.
- Prisma 7.8: the datasource `url` lives in `server/prisma.config.ts`
  (NOT in schema.prisma — v7 forbids it) and the runtime client uses the
  PrismaPg adapter in PrismaService.
- Playwright: don't use bare `getByRole("alert")` — Next.js's route
  announcer also has role=alert; match message text instead.
- Server env: `server/.env` (copied from `.env.example`). **Active DB is
  Neon cloud PG** (since 2026-07-15): `DATABASE_URL` = pooled endpoint
  (runtime, PrismaPg adapter), `DIRECT_DATABASE_URL` = non-pooler endpoint
  (prisma migrate/CLI — PgBouncer can't run migrations). Local Docker PG
  remains available via the commented URL + `npm run db:up`. Never commit
  real credentials; `.env` is gitignored.
- Windows: stopping `npm run dev:server` can orphan the node child still
  holding :3001. If the port is stuck:
  `Get-NetTCPConnection -LocalPort 3001 -State Listen | % { Stop-Process -Id $_.OwningProcess -Force }`

## Explicitly deferred (do not build without updating the design doc first)

Rx upload/sales, online payments (bKash/SSLCommerz), customer accounts,
rider/logistics app, multi-pharmacy marketplace, recurring refill orders (v1.5).
Launch blockers (not build blockers): TODOS.md T-001 regulatory check,
real sourced prices, founder's 10 interviews + 3-5 manual fulfillments.
