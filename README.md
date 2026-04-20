# Terrace Utility Billing Dashboard

A Next.js 14 + Supabase dashboard for managing utility billing across Terrace Business Centres.

---

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Built for Vercel, fast, great TypeScript support |
| Styling | Tailwind CSS | Utility-first, fast to build |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + RLS in one |
| Hosting | Vercel | Zero-config Next.js deploys |
| Version control | GitHub | Connect to Vercel for auto-deploy |

---

## Phase 1 — What is built

- Login page with Supabase authentication
- Sidebar navigation with role-aware display
- Overview dashboard with centre + tenant stats
- Centres list and individual centre pages
- Tenants list with filtering by centre and status
- Add / edit tenant form with utility subscriptions
- Tenant detail page showing internet, generator, gas setup
- Role-based access (admin / finance / centre_manager)
- Placeholder pages for billing, internet, generator, gas (Phase 2)

---

## Setup — Step by Step

### 1. Create a Supabase project

1. Go to supabase.com and sign up
2. Click "New project" — name it terrace-billing
3. Choose a strong database password and pick a region (Europe West is closest to Zimbabwe)
4. Wait ~2 minutes for it to provision
5. Go to Settings → API and copy:
   - Project URL → NEXT_PUBLIC_SUPABASE_URL
   - anon public key → NEXT_PUBLIC_SUPABASE_ANON_KEY
   - service_role key → SUPABASE_SERVICE_ROLE_KEY

### 2. Run the database schema

1. In Supabase, go to SQL Editor
2. Open supabase/schema.sql from this project
3. Paste the entire contents and click Run
4. All tables, RLS policies, and seed data will be created

### 3. Create your first admin user

1. In Supabase go to Authentication → Users → Add user → Create new user
2. Enter your email and password
3. Go to Table Editor → profiles
4. Find your user and change the role column to: admin

### 4. Set up locally

```bash
npm install
cp .env.local.example .env.local
# Edit .env.local and add your Supabase values
npm run dev
```

Open http://localhost:3000 and log in.

### 5. Deploy to Vercel

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/terrace-billing.git
git push -u origin main
```

1. Go to vercel.com → New Project → Import your repo
2. Add environment variables:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
3. Click Deploy

Every push to main auto-deploys.

---

## Roles

| Role | Access |
|---|---|
| admin | Full access to all centres, tenants, settings |
| finance | Read/write to all centres and billing |
| centre_manager | Only their assigned centres |

To assign a centre to a manager, insert into centre_managers table in Supabase.

---

## Update Centre Names

The schema seeds 8 generic names. Update them in Supabase Table Editor → centres,
or run SQL like:

```sql
UPDATE centres SET name = 'Your Centre Name', address = '123 Real St', city = 'Harare'
WHERE name = 'Terrace Centre 1';
```

---

## Phase 2 — Coming Next

- Monthly billing runs per centre
- Internet: auto-populate from last month, verify and send
- Generator: enter meter readings + fuel/opex → auto-calculate kWh rate
- Gas: enter gas company PDF figures → calculate 50% profit share
- PDF invoice generation per tenant
- Auto-email invoices on approval
- Billing history and records
