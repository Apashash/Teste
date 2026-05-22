# AshtechPay — Page de Paiement

Page de paiement Mobile Money intégrant l'API Ashtech Pay pour 16 pays africains.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/payment-page run dev` — run the payment page frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Frontend: React + Vite + TanStack Query + shadcn/ui
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `artifacts/api-server/src/routes/payment.ts` — Ashtech Pay proxy routes
- `artifacts/payment-page/src/pages/` — Frontend payment page
- `lib/api-client-react/src/generated/` — Generated React Query hooks

## Architecture decisions

- The backend proxies all Ashtech Pay API calls to keep the API key server-side only
- Countries list is hardcoded as fallback (from API docs) since Cloudflare blocks server-side requests to ashtechpay.top; the live API is tried first
- The frontend detects all 4 payment flows (USSD Push, OTP SMS, OTP USSD, Wave) based on HTTP status + response fields
- Transaction status is polled every 5 seconds until a final state (success/failed) is reached

## Product

**AshtechPay** — A payment page for initiating Mobile Money payments across 16 African countries. Supports:
- Form: name, amount, country, operator (dynamic per country), phone number
- All 4 Ashtech Pay flows: USSD Push, OTP SMS, OTP USSD, Wave
- Real-time transaction status polling
- Success and failure states with full transaction details

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Ashtech Pay API site (ashtechpay.top) is protected by Cloudflare and blocks server-side requests from cloud IPs. The `/countries` endpoint falls back to hardcoded data. The `/collect` and `/transaction` endpoints still proxy to Ashtech Pay — they may work once the account's IP is whitelisted.
- ASHTECH_PAY_API_KEY must be set in the environment (currently in api-server artifact.toml dev section)
- After each OpenAPI spec change, run `pnpm --filter @workspace/api-spec run codegen`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
