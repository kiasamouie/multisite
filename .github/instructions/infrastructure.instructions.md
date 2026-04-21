# Infrastructure & Deployment Instructions

**Scope:** `docker-compose.yml`, `.github/workflows/**`, environment setup, deployment

Use this guide when working on Docker setup, CI/CD pipelines, environment configuration, and deployment.

---

## 📋 Infrastructure Overview

Multisite uses:
- **Local Development:** Docker Compose OR direct connection to cloud Supabase
- **Staging/Production:** Vercel (auto-deploys from `main` branch)
- **Database:** Supabase (PostgreSQL + Auth + Storage)
- **CI/CD:** GitHub Actions (lint, build, test on push)

---

## 🎯 Critical Rules

### Rule 1: Local Development Setup

#### Option A: Cloud-First (Recommended)
```bash
# Install dependencies
pnpm install

# Start dev server (connects to cloud Supabase)
pnpm dev

# Server runs on http://localhost:3000
```

**Pros:**
- Simpler setup (no Docker needed)
- Always uses latest cloud DB

**Cons:**
- Modifies production-like data
- Requires internet connection

#### Option B: Local Docker Database
```bash
# Start local Supabase (optional)
pnpm run db:start

# Now dev server connects to localhost
pnpm dev
```

**Pros:**
- Isolated environment
- Can reset without affecting cloud

**Cons:**
- More setup complexity

**Rule:** Choose one approach and stick with it.

---

### Rule 2: Environment Variables

**.env.local** (Never commit):
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
```

**Production** (Set in Vercel Dashboard):
```
Same variables set in Vercel project settings
GitHub Actions automatically pulls from Vercel
```

**Rule:** Never commit secrets. Use Vercel's environment variable dashboard.

---

### Rule 3: Deployment Pipeline

```
Code Push to main
    ↓
GitHub Actions Workflow Runs:
  1. Install dependencies (pnpm install)
  2. Lint (pnpm lint)
  3. Build (pnpm build)
  4. Test (if configured)
    ↓
If all pass:
  Vercel auto-deploys to production
    ↓
vercel.com automatically serves new code
```

**Timeline:** ~5-10 minutes from push to live

**Rollback:** Redeploy from previous commit in Vercel Dashboard

---

### Rule 4: Before Pushing to GitHub

```bash
# 1. Run lint locally
pnpm lint

# 2. Build locally (catches most issues)
pnpm build

# 3. Test in dev server
pnpm dev
# Visit http://localhost:3000 and test features

# 4. If all pass, commit and push
git add .
git commit -m "Feature: Add X"
git push origin main
```

**Rule:** Never push failing builds. You'll block other developers.

---

## 📦 Docker Compose (Optional)

If using local Supabase:

```yaml
# docker-compose.yml exists but optional for dev
# Run if you want isolated local database

# Commands:
pnpm run db:start      # Start services
pnpm run db:stop       # Stop services
pnpm run db:reset      # Reset database (destructive)
```

**Services running:**
- PostgreSQL (database)
- Supabase Auth (authentication)
- Supabase Storage (file uploads)

---

## 🔧 Environment & Configuration

### Supabase Project
All environments use the same cloud Supabase project. Multi-tenancy isolates data.

```
┌────────────────────┐
│ ONE Supabase Project│
├────────────────────┤
│ Tenants            │
│  ├── Tenant A      │ ← RLS isolates
│  ├── Tenant B      │
│  └── Tenant C      │
└────────────────────┘
```

**Production & Development:** Same DB, RLS prevents mixing

---

### Vercel Deployment

1. **Connect GitHub Repo**
   ```
   vercel.com → New Project → Import Git
   Select: /home/kia/multisite
   ```

2. **Set Environment Variables**
   ```
   Vercel Dashboard → Settings → Environment Variables
   Add: NEXT_PUBLIC_SUPABASE_URL, etc.
   ```

3. **Auto-Deploy**
   ```
   Every push to main → Automatic deployment
   ```

---

## 🚀 Deployment Workflow

### Development (Local)
```bash
pnpm dev
# Runs on http://localhost:3000
# Hot reload on file changes
```

### Staging (Optional)
Not currently used. Could create `staging` branch for pre-prod testing.

### Production (Vercel)
```bash
# All code merges to main, Vercel deploys
git push origin main
# Wait 5-10 mins for Vercel build
# Visit https://multisite.vercel.app (or custom domain)
```

---

## 📋 GitHub Actions CI/CD

Location: `.github/workflows/**`

**Triggers:**
- Every push to any branch
- Every pull request

**Steps:**
1. Checkout code
2. Install dependencies (`pnpm install`)
3. Run lint (`pnpm lint`)
4. Run build (`pnpm build`)
5. If main branch: Vercel deploys automatically

**If build fails:**
```
GitHub marks PR as failed
Developer must fix and push again
PR cannot be merged until passing
```

---

## 🔐 Secrets Management

### Local Development
- `.env.local` file (git-ignored)
- Secrets stored locally on dev machine

### Production (Vercel)
- Set in Vercel Dashboard
- Never committed to GitHub
- GitHub Actions has access via Vercel deployment

**Rule:** Never commit `.env.local` or any secret keys.

---

## 🚫 Anti-Patterns (NEVER Do These)

| Anti-Pattern | Why | Fix |
|---|---|---|
| Commit `.env.local` | Secrets exposed | Add to `.gitignore` |
| Hardcode API keys in code | Security risk | Use environment variables |
| Push without testing locally | Breaks production | Test with `pnpm build` first |
| Modify Docker while running | Changes lost | Stop, edit, then rebuild |
| Use dev Supabase URL in prod | Data corruption | Set correct URLs in Vercel |
| Skip database migrations | Schema out of sync | Always run `db:migrate` after changes |

---

## 📋 Checklist: Deploying Code

- [ ] Code committed locally
- [ ] Ran `pnpm lint` and fixed issues
- [ ] Ran `pnpm build` and verified no errors
- [ ] Tested in `pnpm dev` locally
- [ ] If DB changed: ran `pnpm run db:migrate`
- [ ] If types changed: ran `pnpm run db:types`
- [ ] Pushed to `main` branch
- [ ] Verified Vercel deployment in Dashboard
- [ ] Tested feature on production URL

---

## 🔄 Common Tasks

### Debug Production Issues
```bash
# Check Vercel logs
1. Visit vercel.com
2. Click project
3. View deployment logs
4. Look for error messages

# Or check database
pnpm dev  # Connect to Supabase
# Query data manually in Supabase Dashboard
```

### Rollback Deployment
```bash
1. vercel.com → Project
2. Deployments → Find previous good version
3. Click "Promote to Production"
4. Wait for redeploy (~2 mins)
```

### Set Environment Variable
```bash
# For local dev
echo "NEXT_PUBLIC_SUPABASE_URL=..." >> .env.local

# For production (in Vercel)
1. vercel.com → Settings → Environment Variables
2. Add variable
3. Redeploy to apply
```

### View Application Logs
```bash
# Local development
pnpm dev  # Logs appear in terminal

# Production (Vercel)
vercel.com → Project → Deployments → Logs
```

---

## 📚 Related Documentation

- `docker-compose.yml` — Docker services configuration
- `.github/workflows/` — CI/CD pipeline configuration
- `pnpm-workspace.yaml` — Monorepo structure
