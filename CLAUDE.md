# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
npm run start    # Start production server
```

No test suite is configured.

## Architecture

**LUCASCAR** is a Next.js 16 (App Router) quote management system for an automotive bodywork and paint shop (lanternagem e pintura automotiva). The UI is in Portuguese.

### Routes (`/app`)

| Route | Purpose |
|---|---|
| `/` | Dashboard with stats (revenue, conversion rate, recent quotes) |
| `/orcamento` | Create new quote/estimate |
| `/orcamentos` | List and search all quotes |
| `/clientes` | Client management |
| `/veiculos` | Vehicle registry |
| `/configuracoes` | Company/quote settings |

### Key Components

- `components/dashboard/dashboard-layout.tsx` — Main layout wrapper; wraps all pages with sidebar
- `components/dashboard/sidebar.tsx` — Navigation sidebar
- `components/dashboard/quote-form.tsx` — Core quote creation form with dynamic line items and BRL currency totals
- `components/dashboard/dashboard-stats.tsx` — Metrics display on home page
- `components/ui/` — 40+ shadcn/ui components (new-york style); do not hand-edit these

### Authentication

PIN-based auth (no Supabase Auth). Flow:
1. `middleware.ts` checks for `lucas_car_auth` cookie on every request; redirects to `/login` if absent.
2. `/login` hashes the entered PIN with SHA-256 (Web Crypto API), queries `config.pin_hash` in Supabase, and on match calls `setAuthToken()` which writes the cookie + localStorage.
3. `clearAuthToken()` (called by the logout button in sidebar) clears both.
4. Default PIN: **1234**.

Key auth files: `lib/auth.ts`, `proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`), `app/login/page.tsx`.

### Supabase

Client is in `lib/supabase.ts`. Credentials come from `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.

Run `supabase/migrations/001_initial.sql` in the Supabase SQL editor to create all tables (`config`, `clientes`, `veiculos`, `orcamentos`, `orcamento_itens`) and seed the default PIN hash.

### Data

Currently all page data is hardcoded as static mock. Supabase tables are ready but pages have not been wired to use them yet. PDF export and "send to client" features exist in the UI but have no implementation yet.

### Styling

- Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`)
- Dark theme with neon green (`#00ff00`) as the primary accent color
- Custom CSS classes in `app/globals.css`: `.neon-card`, `.neon-button`, `.neon-button-outline`, `.neon-input`, `.neon-glow`
- Font: Rajdhani (sans) + Geist Mono
- Use `cn()` from `lib/utils.ts` for conditional className merging

### Config Notes

- `next.config.mjs` has `typescript.ignoreBuildErrors: true` and `images.unoptimized: true`
- Path alias `@/*` maps to the project root
- shadcn/ui is configured in `components.json` (style: new-york, icons: lucide)
