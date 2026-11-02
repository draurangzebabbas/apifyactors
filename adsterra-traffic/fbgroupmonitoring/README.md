# FB Group Monitor

A full-stack SaaS application for monitoring public and private Facebook Groups.

- **Frontend** — Next.js 16 deployed on Vercel
- **Backend** — Express/Node.js scraper worker deployed on Render
- **Database** — Supabase (Postgres + Auth + RLS)
- **Billing** — Polar.sh

---

## Architecture

```
Browser
  └─► Vercel (Next.js frontend)
        ├─► Supabase (DB reads via anon key + Auth)
        ├─► /api/checkout  ──► Polar.sh
        ├─► /api/webhook/polar ──► Supabase (subscriptions table)
        └─► Render (Express backend) ──► Supabase (service role)
                                       └─► Apify (scraping)
```

### Plan Limits (enforced in backend)
| Plan  | Groups | Price |
|-------|--------|-------|
| Free  | 1      | $0    |
| Pro   | 5      | $10/mo |
| Scale | 15     | $20/mo |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the tables below created
- A [Polar.sh](https://polar.sh) account with Pro and Scale products created
- An [Apify](https://apify.com) account with actor tokens

---

## Required Supabase Tables

Make sure these tables exist in your Supabase project (run in SQL Editor):

```sql
-- Subscriptions table (populated by Polar webhook)
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  email TEXT,
  polar_customer_id TEXT,
  status TEXT,
  plan_id TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id)
);
```

> All other tables (groups, group_members, facebook_posts, user_cookies, user_keywords, user_post_matches, hourly_post_stats) should already be in your Supabase project.

---

## Local Development

### 1. Frontend

```bash
# Install dependencies
npm install

# Copy local env
cp .env .env.local   # already exists, just edit if needed

# Start dev server
npm run dev
# Runs on http://localhost:3000
```

### 2. Backend

```bash
cd Backend

# Install dependencies
npm install

# Start backend
node server.js
# Runs on http://localhost:4000
```

---

## Deployment

### Step 1 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Set the following options:

| Setting | Value |
|---------|-------|
| **Root Directory** | `Backend` |
| **Runtime** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `node server.js` |
| **Instance Type** | Starter (or higher) |

4. Go to **Environment** tab and add all variables from `.env.render`:

```
NEXT_PUBLIC_SUPABASE_URL      = https://rrogfuzzgvrwvywfagtz.supabase.co
SUPABASE_SERVICE_ROLE_KEY     = YOUR_SUPABASE_SERVICE_ROLE_KEY
COOKIE_ENCRYPTION_KEY         = 1a061e575ead5f98b522e2e47b7804f659a2bc96c36fe02124f646b5ca5685aa
FRONTEND_URL                  = https://YOUR_APP.vercel.app   ← fill after Vercel deploy
POLAR_PRO_PLAN_ID             = 1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10
POLAR_SCALE_PLAN_ID           = 0e40861a-2b68-4eb0-8c6b-ac22660c84c7
PORT                          = 4000
```

5. Click **Deploy** — note your Render URL (e.g. `https://fbmonitor-backend.onrender.com`)

---

### Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. **Root Directory**: leave as `/` (project root)
3. **Framework**: Next.js (auto-detected)
4. **Build Command**: `npm run build` (default)
5. Go to **Settings → Environment Variables** and add all from `.env.vercel`:

```
NEXT_PUBLIC_SUPABASE_URL           = https://rrogfuzzgvrwvywfagtz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY      = eyJhbGci...  (full key)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY          = YOUR_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_BACKEND_URL            = https://YOUR_BACKEND.onrender.com   ← from Step 1
COOKIE_ENCRYPTION_KEY              = 1a061e575ead5f98b522e2e47b7804f659a2bc96c36fe02124f646b5ca5685aa
NEXT_PUBLIC_APP_URL                = https://YOUR_APP.vercel.app   ← your Vercel URL
POLAR_ACCESS_TOKEN                 = polar_oat_fSDuhiFNlbme4rNSsNsolkLp6zkdE1D16QaYU1CMggD
POLAR_SUCCESS_URL                  = https://YOUR_APP.vercel.app/dashboard
POLAR_WEBHOOK_SECRET               = whsec_4R24LcEQnQVw0O9DW3fswPLfucWCFRfAc1PLq24nE0h
POLAR_PRO_PLAN_ID                  = 1d3d8ccd-aa6c-4b3b-8e06-97bd859f5e10
POLAR_SCALE_PLAN_ID                = 0e40861a-2b68-4eb0-8c6b-ac22660c84c7
```

6. Click **Deploy**

---

### Step 3 — After Both Are Live

Go back to Render and **update** `FRONTEND_URL` to your real Vercel URL:
```
FRONTEND_URL = https://YOUR_APP.vercel.app
```
Then **redeploy** the Render service (it will restart automatically).

---

### Step 4 — Configure Polar Webhook

1. Go to [polar.sh](https://polar.sh) → your organization → **Webhooks**
2. Add a new webhook:
   - **URL**: `https://YOUR_APP.vercel.app/api/webhook/polar`
   - **Secret**: `whsec_4R24LcEQnQVw0O9DW3fswPLfucWCFRfAc1PLq24nE0h`
   - **Events**: check `subscription.created`, `subscription.updated`, `subscription.revoked`
3. Save — Polar will now write subscription data to your Supabase `subscriptions` table on every payment event

---

## Admin Setup

To promote a user to admin (gives access to `/admin` dashboard):

1. Have the user sign up normally on the site
2. Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- Option A: Promote by email
INSERT INTO public.admin_users (user_id)
SELECT id FROM public.users WHERE LOWER(email) = LOWER('your-admin@email.com')
ON CONFLICT (user_id) DO NOTHING;

-- Option B: Promote directly by User ID
INSERT INTO public.admin_users (user_id)
VALUES ('your-user-id-from-auth-users')
ON CONFLICT (user_id) DO NOTHING;
```

---

## Env Files Reference

| File | Purpose |
|------|---------|
| `.env.local` | Local development (Next.js frontend) |
| `Backend/.env` | Local development (Express backend) |
| `.env.vercel` | Copy-paste template for Vercel env vars |
| `.env.render` | Copy-paste template for Render env vars |

> **Never commit** `.env.local`, `.env.vercel`, `.env.render`, or `Backend/.env` to git. They are all in `.gitignore`.

