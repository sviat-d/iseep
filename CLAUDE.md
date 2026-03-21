@AGENTS.md

# iseep — ICP Workspace MVP

## Project Overview
iseep is a living ICP workspace and GTM intelligence layer for B2B sales teams.
Built with Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Supabase, and Drizzle ORM.

## Tech Stack
- **Framework:** Next.js 16 (App Router) — uses `proxy.ts` instead of `middleware.ts`
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS v4 + shadcn/ui (base-nova style, neutral theme)
- **Database:** Supabase (PostgreSQL) — auth + DB + RLS
- **ORM:** Drizzle ORM — schema in `src/db/schema.ts`, migrations in `drizzle/migrations/`
- **Forms:** React Hook Form + Zod v4 (`zod/v4` import path)
- **Tables:** TanStack Table (for data-heavy views)
- **State:** Zustand (only where needed)
- **Package Manager:** pnpm

## Key Architecture Decisions
- Route groups: `(auth)` for sign-in/sign-up, `(app)` for authenticated routes
- Auth handled via Supabase SSR — proxy.ts refreshes sessions and protects routes
- Server actions in `src/actions/` use `"use server"` directive
- All database tables scoped by `workspace_id` for multi-tenancy
- Drizzle schema defines 14 tables: workspaces, users, memberships, icps, personas, dimensions, segments, signals, companies, contacts, deals, deal_reasons, product_requests, meeting_notes

## Commands
- `pnpm dev` — start dev server
- `pnpm build` — production build
- `pnpm lint` — ESLint
- `pnpm drizzle-kit generate` — generate migration from schema
- `pnpm drizzle-kit push` — push schema to database
- `pnpm db:seed` — seed database with demo data

## File Structure
- `src/app/(auth)/` — auth pages (sign-in, sign-up)
- `src/app/(app)/` — authenticated app (dashboard, icps, segments, deals, etc.)
- `src/components/ui/` — shadcn/ui components
- `src/components/layout/` — sidebar, topbar, app-shell
- `src/db/schema.ts` — Drizzle schema (all 14 tables)
- `src/db/index.ts` — DB client
- `src/db/seed.ts` — seed script
- `src/actions/` — server actions
- `src/lib/supabase/` — Supabase client (browser + server)
- `src/lib/validators.ts` — Zod schemas
- `src/proxy.ts` — auth proxy (replaces middleware.ts in Next.js 16)

## Conventions
- Use shadcn/ui components for all UI
- Use server actions for mutations, not API routes
- All pages that need auth data use `createClient()` from `@/lib/supabase/server`
- Dynamic route params are `Promise<{ id: string }>` in Next.js 16 (must await)
- Import Zod from `zod/v4` (not `zod`)
