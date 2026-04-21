# Multisite Copilot Instructions

**Master reference document for the Multisite SaaS website builder platform.**

This directory contains domain-specific guidance for developing, maintaining, and extending the platform. Use this as your entry point—find the relevant instruction file below.

---

## 📋 Quick Reference

### What is Multisite?

A **full-stack SaaS website builder** (like Webflow/Squarespace) with:
- **Multi-tenant site creation** with complete data isolation (RLS-enforced)
- **Block-based visual page builder** powered by Puck editor
- **Stripe billing** with 3-tier plans (Starter, Growth, Pro)
- **Media uploads** with intelligent page associations
- **Feature flags** for plan-gated content
- **Dual admin interfaces** (super admin + per-tenant admin)
- **Custom domains** (brand customization)

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind v4, shadcn/ui |
| **UI Kit** | packages/ui: 21 shadcn primitives + admin components (DataView, CrudModal, etc.) |
| **Shared Logic** | packages/lib: Supabase clients, tenant utils, stripe integration, feature flags |
| **Backend** | Supabase: PostgreSQL, Auth, Storage, RLS policies, 26 tables |
| **Page Builder** | Puck v0.20.2 (visual editor) → DB (sections + blocks) |
| **Billing** | Stripe webhooks → subscriptions table → feature flags |
| **Infrastructure** | Docker Compose (local), Vercel (prod), GitHub Actions (CI/CD) |

---

## 📚 Domain-Specific Instructions

### 🎨 [Frontend Development](instructions/frontend.instructions.md)
**Scope:** `apps/web/src/**`

When working on:
- React components (Page layouts, dashboard screens, public-facing UI)
- Next.js routing, API routes, middleware
- Styling (Tailwind, CSS variables, dark mode)
- User-facing features

**Key Rules:**
- Always check `packages/ui` for existing components before building new ones
- Use DataView + CrudModal pattern for all admin screens
- Import CSS variables from `globals.css`, never hardcode colors
- Run `pnpm dev` locally; dev server connects to production Supabase
- Read: [FRONTEND_STACK_GUIDE.md](../FRONTEND_STACK_GUIDE.md)

---

### 📦 [Library & Shared Code](instructions/library.instructions.md)
**Scope:** `packages/lib/**`

When working on:
- Supabase client setup (browser, server, admin)
- Type generation from database
- Tenant resolution logic
- Feature flag checking
- Stripe integration
- Media utilities
- Configuration (dashboard nav, page templates, block registry)

**Key Rules:**
- Centralized exports in `src/index.ts` (don't import scattered files)
- Keep utilities pure and testable
- Update generated types after schema changes: `pnpm run db:types`
- These exports power the entire frontend and API routes

---

### 🗄️ [Database & Migrations](instructions/database.instructions.md)
**Scope:** `supabase/migrations/**` + table design

When working on:
- Database schema changes
- RLS (Row-Level Security) policies
- Seed data and migrations
- Multi-tenancy enforcement
- Data isolation testing

**Key Rules:**
- Always add RLS policies for new tables (tenant isolation required)
- Migrations are numbered and immutable
- Test migrations locally first: `pnpm run db:reset`
- Post-change command: `pnpm run db:migrate` (pushes to cloud Supabase)
- Read: [ARCHITECTURE.md](../ARCHITECTURE.md)

---

### 🏗️ [Infrastructure & Deployment](instructions/infrastructure.instructions.md)
**Scope:** `docker-compose.yml`, `.github/workflows/**`, environment setup

When working on:
- Local development environment (Docker Compose)
- Environment variables and secrets
- GitHub Actions CI/CD
- Deployment pipelines
- Database backup/restore

**Key Rules:**
- Local dev uses `docker-compose up` or direct Supabase cloud connection
- Environment file: `.env.local` (never commit secrets)
- GitHub Actions deploy on `main` branch push
- Critical: Test locally before pushing to GitHub

---

### 💾 [UI Components Library](instructions/ui-components.instructions.md)
**Scope:** `packages/ui/src/**`

When working on:
- shadcn/ui component customization
- Admin-specific components (DataView, CrudModal, StatusBadge, etc.)
- Design system consistency
- Component exports and barrel files

**Key Rules:**
- Components must be reusable across all admin screens
- Use design tokens from `globals.css`
- Update `components.json` when adding new shadcn components
- All admin screens should look and behave identically

---

## 🔄 Common Workflows

### Adding a New Admin Page
1. Read [Frontend Dev](instructions/frontend.instructions.md) guide
2. Create route in `apps/web/src/app/admin/[resource]/`
3. Use **DataView** for listings, **CrudModal** for create/edit
4. Import reusable components from `packages/ui`
5. Query data via `getSupabaseAdminClient()` (server) or browser client
6. Run `pnpm dev` and test

### Changing Database Schema
1. Read [Database](instructions/database.instructions.md) guide
2. Create new migration: `supabase/migrations/0XXX_description.sql`
3. Add RLS policies if creating new table
4. Test locally: `pnpm run db:reset`
5. Run: `pnpm run db:migrate`
6. Update types: `pnpm run db:types`

### Adding New UI Components
1. Read [UI Components](instructions/ui-components.instructions.md) guide
2. Create in `packages/ui/src/components/`
3. Add barrel export in `packages/ui/src/components/index.ts`
4. Update `packages/ui/package.json` exports if needed
5. Run `pnpm build` to verify

### Deploying Code
1. Push to `main` branch
2. GitHub Actions runs: lint, build, tests
3. Vercel auto-deploys on success
4. Monitor: [Vercel Dashboard](https://vercel.com)

---

## ⚡ Critical Rules

### Golden Rules
1. **No local database** — Dev code connects directly to production Supabase. Be careful deleting data!
2. **RLS enforces isolation** — Every query is scoped to tenant_id automatically
3. **Cache invalidation required** — After page/block changes, call `revalidateTag("pages")`
4. **Types auto-generated** — Never hand-edit `lib/supabase/types.ts`

### Code Quality
- **TypeScript** enforced — No `any` types without explicit justification
- **Naming conventions**:
  - React components: `PascalCase` (e.g., `MediaUploadInput.tsx`)
  - Hooks: Prefix `use` (e.g., `useSupabase.ts`)
  - Utils/helpers: `kebab-case` (e.g., `get-page-media.ts`)
  - API routes: `/api/[domain]/[resource]/[action]/route.ts`
- **Linting** — Run `pnpm lint` before committing

### Post-Change Commands
| Change | Command |
|--------|---------|
| Database schema | `pnpm run db:migrate` |
| Generated types | `pnpm run db:types` |
| Frontend code | `pnpm build` (verify build) |
| All packages | `pnpm lint && pnpm build` |

---

## 📖 Full Documentation

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](../ARCHITECTURE.md) | System design, data flow, core concepts |
| [CONFIG_DRIVEN_PAGES.md](../CONFIG_DRIVEN_PAGES.md) | Page templates, feature flags, content structure |
| [FRONTEND_STACK_GUIDE.md](../FRONTEND_STACK_GUIDE.md) | React patterns, shadcn/ui, styling rules |
| [MEDIA_PAGE_ASSOCIATION.md](../MEDIA_PAGE_ASSOCIATION.md) | Media storage, associations, display modes |

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Start development (hot reload)
pnpm dev

# Run linting
pnpm lint

# Build production
pnpm build

# Database operations
pnpm run db:start          # Start local Supabase
pnpm run db:migrate        # Push migrations to cloud
pnpm run db:reset          # Reset cloud DB (⚠️ deletes all data)
pnpm run db:types          # Regenerate TypeScript types

# Admin tools (if needed)
node scripts/bootstrap-admin.mjs <email>      # Create platform admin
node scripts/setup-media-bucket.mjs           # Configure media storage
```

---

## 🤝 Getting Help

1. **Check the relevant instruction file** — Start with the domain section above
2. **Read full documentation** — See links in "Full Documentation" section
3. **Ask Copilot** — Reference the instruction file path in your prompt

---

## 📝 Version & Updates

- **Last Updated:** April 2026
- **Multisite Version:** Full-stack SaaS platform v1
- **Stack Version:** Next.js 15, React 19, Supabase, Stripe
