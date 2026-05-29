# GMB Automation SaaS

Multi-tenant Google My Business post automation platform.  
Agency and client accounts, AI-generated posts, scheduled publishing, and a live dashboard.

---

## Live URLs

| | URL |
|---|---|
| **Frontend (Vercel)** | `https://your-app.vercel.app` |
| **Backend API (Render)** | `https://gmb-automation-api.onrender.com` |

---

## Test Credentials

After seeding the database (step 5 below):

| Role | Email | Password |
|---|---|---|
| **Agency** | `test@agency.com` | `Woyce@123` |
| **Client** | `client@demo.com` | `client123` |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Auth | JWT (RS256, tenant_id embedded) |
| Database | PostgreSQL (Neon free tier) |
| Scheduler | setInterval + DB polling (Render persistent server) |
| AI | OpenAI gpt-4o-mini (mock fallback if no key) |
| Frontend | Next.js 16 + Tailwind CSS |
| Backend hosting | Render (free tier) |
| Frontend hosting | Vercel (free tier) |

---

## Project Structure

```
├── api/
│   └── index.js                  Express app entry point (Render / Vercel)
├── src/
│   ├── db/
│   │   ├── index.js              PostgreSQL connection pool
│   │   └── schema.sql            Table definitions
│   ├── middleware/
│   │   └── auth.js               JWT verify + agency-only guard
│   ├── routes/
│   │   ├── auth.js               /api/auth/* (register, login, invite)
│   │   ├── tenant.js             /api/tenant/* (profile, clients, stats)
│   │   ├── posts.js              /api/posts/* (CRUD, publish-now, logs)
│   │   ├── generate.js           /api/posts/generate (AI generator)
│   │   └── gmb.js                /api/gmb/publish (mock GMB endpoint)
│   ├── services/
│   │   └── mockGMBPublish.js     Simulated GMB API
│   └── scheduler/
│       └── processScheduledPosts.js  Scheduler (60s poll, max 3 retries)
├── scripts/
│   ├── setup-db.js               Creates all DB tables
│   └── seed.js                   Seeds test agency + client + posts
├── frontend/                     Next.js dashboard app
│   ├── app/
│   │   ├── login/                Login page
│   │   ├── register/             Agency register page
│   │   └── dashboard/
│   │       ├── page.js           Stats home
│   │       ├── posts/            Post list + create + detail
│   │       └── invite/           Invite client (agency only)
│   └── lib/api.js                Typed API client
├── render.yaml                   Render deployment config
├── vercel.json                   Vercel deployment config (backend)
└── .env.example                  Environment variable reference
```

---

## Local Development Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/gmb-automation-saas.git
cd gmb-automation-saas
npm install
cd frontend && npm install && cd ..
```

### 2. Create your free Neon database

1. Go to [neon.tech](https://neon.tech) → sign up free
2. Create a new project (e.g. `gmb-saas`)
3. Copy the connection string from the dashboard

### 3. Set up environment variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
JWT_SECRET=run_this_and_paste_output: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
CRON_SECRET=any_secret_string
NODE_ENV=development
```

For the frontend:

```bash
cp frontend/.env.local.example frontend/.env.local
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 4. Create database tables

```bash
npm run setup-db
```

### 5. Seed test data

```bash
npm run seed
```

This creates:
- Agency account: `test@agency.com` / `Woyce@123`
- Client account: `client@demo.com` / `client123`
- 3 sample posts (one due immediately, one in 1 hour, one draft)

### 6. Start both servers

**Terminal 1 — Backend:**
```bash
npm run dev
# API running at http://localhost:3000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# Dashboard at http://localhost:3001
```

Open [http://localhost:3001](http://localhost:3001) and log in with the test credentials.

---

## Deployment Guide

### Step 1 — Deploy Backend to Render

1. Push your code to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your GitHub repo
4. Render detects `render.yaml` automatically — or configure manually:
   - **Build Command:** `npm install`
   - **Start Command:** `node api/index.js`
5. Add environment variables in Render dashboard:

| Key | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Neon connection string |
| `JWT_SECRET` | A random 64-char hex string |
| `CRON_SECRET` | Any secret string |
| `FRONTEND_URL` | *(add after Step 2)* |

6. Click **Deploy** — Render gives you a URL like `https://gmb-automation-api.onrender.com`
7. Run DB setup once via Render Shell (or locally with `DATABASE_URL` set):
   ```bash
   npm run setup-db
   npm run seed
   ```

### Step 2 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:

| Key | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://gmb-automation-api.onrender.com` |

4. Click **Deploy** — you get a URL like `https://gmb-automation-saas.vercel.app`

### Step 3 — Link them together

Go back to Render → your service → Environment → add:

```
FRONTEND_URL = https://gmb-automation-saas.vercel.app
```

Redeploy the backend. CORS is now locked to your frontend origin.

---

## API Endpoints

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Agency registration |
| POST | `/api/auth/login` | — | Login (agency or client) |
| POST | `/api/auth/invite` | Agency JWT | Invite a client |

### Tenant

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/tenant/profile` | JWT | Current tenant info |
| GET | `/api/tenant/stats` | JWT | Post counts by status |
| GET | `/api/tenant/clients` | Agency JWT | List agency's clients |

### Posts

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/posts` | JWT | List posts (filter: `?status=scheduled`) |
| POST | `/api/posts` | JWT | Create post |
| GET | `/api/posts/:id` | JWT | Get post |
| PATCH | `/api/posts/:id` | JWT | Update post |
| DELETE | `/api/posts/:id` | JWT | Delete post |
| POST | `/api/posts/generate` | JWT | AI-generate post content |
| POST | `/api/posts/:id/publish-now` | JWT | Manually publish post |
| GET | `/api/posts/:id/logs` | JWT | Publish attempt logs |

### GMB (Mock)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/gmb/publish` | JWT | Mock GMB publish (90% success) |

### Cron

| Method | Endpoint | Header | Description |
|---|---|---|---|
| GET/POST | `/api/cron/process-posts` | `x-cron-secret` | Run scheduler manually |

---

## Scheduler Behaviour

- Runs every **60 seconds** on the Render server via `setInterval`
- Picks up all posts where `status = 'scheduled'` AND `scheduled_at <= NOW()`
- Calls the mock GMB publish service
- On **success**: sets `status = 'published'`, logs the attempt
- On **failure**: increments `retry_count`, retries up to **3 times**
- After 3 failures: sets `status = 'failed'`
- Every attempt is logged in the `publish_logs` table

---

## Security

- Passwords hashed with **bcrypt** (cost factor 10)
- JWTs signed with **HS256**, expire after 7 days
- Every DB query scoped to `tenant_id` — tenants never see each other's data
- Cron endpoint protected by `CRON_SECRET` header
- CORS restricted to `FRONTEND_URL` in production

---

## Environment Variables Reference

```env
# ── Backend (.env) ───────────────────────────────────────────────
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
JWT_SECRET=64_char_random_hex_string
CRON_SECRET=any_secret_for_cron_endpoint
FRONTEND_URL=https://your-app.vercel.app    # CORS origin (production)
NODE_ENV=production
PORT=3000                                   # Set automatically by Render

# ── Frontend (frontend/.env.local) ──────────────────────────────
NEXT_PUBLIC_API_URL=https://gmb-automation-api.onrender.com

# ── Optional ────────────────────────────────────────────────────
OPENAI_API_KEY=sk-...    # Uses gpt-4o-mini — falls back to mock if not set
```
