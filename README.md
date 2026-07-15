# MediStore — medicine e-commerce (thin slice v1)

Order OTC medicines online with cash on delivery, for one delivery locality.
Monorepo: NestJS API, Next.js storefront, Next.js admin.

```
client/           Next.js storefront (:3000) — search, cart, guest COD checkout
admin/            Next.js admin (:3002) — orders-first dashboard, products, stock
server/           NestJS + Prisma 7 + PostgreSQL API (:3001, swagger at /docs)
packages/shared   Contract types + zod schemas (single source of validation truth)
e2e/              Playwright end-to-end tests
```

## Quick start

```bash
npm install
cp .env.example server/.env        # then edit DATABASE_URL etc.
npm run db:up                      # local PostgreSQL via Docker (or use a hosted PG)
npm run db:migrate                 # prisma migrate dev
npm run db:seed                    # 83 OTC SKUs (placeholder prices) + admin user
npm run dev:server                 # API on :3001
npm run dev:client                 # storefront on :3000
npm run dev:admin                  # admin on :3002
```

Admin login comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `server/.env`.

## Tests

```bash
npm test              # Jest (server) + Vitest (client, admin) — 66 tests
npm run test:e2e      # Playwright — golden path, double-submit race, admin auth
```

## Design constraints (v1)

- **OTC only.** Prescription items exist in the schema (`is_prescription_required`)
  but are never shown or sold until a licensed pharmacy is attached.
- **Cash on delivery only**, one served delivery area, operator phone-confirms
  every order before fulfillment.
- Stock decrements on CONFIRMED via atomic conditional updates — double-clicks
  and concurrent confirms cannot oversell.
- Seed prices are **placeholders**; real sourced prices are a launch gate.

See `CLAUDE.md` for working conventions and `TODOS.md` for launch blockers.
