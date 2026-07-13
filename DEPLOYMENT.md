# Deployment Guide — ParkSmart

This guide covers deploying the ParkSmart backend to **Render** and the frontend to **Vercel**, with the database hosted on **Supabase**.

---

## Prerequisites

- Node.js 20+ installed locally
- A [Supabase](https://supabase.com) project with the analytics schema applied (see step 1)
- A [Render](https://render.com) account
- A [Vercel](https://vercel.com) account
- Git repository connected to Render and Vercel

---

## Step 1 — Apply the Database Schema (Supabase)

1. Open your Supabase project → **SQL Editor**.
2. Paste and run the contents of `backend/db/migrations/001_analytics_schema.sql`.
3. Confirm the tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
   ```
   You should see `parking_slots`, `bookings`, `occupancy_snapshots`, and `pipeline_runs`.

4. (Optional) Seed historical data:
   ```bash
   cd backend
   cp .env.example .env
   # Fill in DATABASE_URL
   npm run seed
   npm run pipeline
   ```

---

## Step 2 — Deploy Backend to Render

1. Push your repository to GitHub.
2. Log in to [Render](https://render.com) → **New** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the service:

   | Setting | Value |
   |---|---|
   | **Name** | `parksmart-backend` |
   | **Root Directory** | `backend` |
   | **Runtime** | Node |
   | **Build Command** | `npm install` |
   | **Start Command** | `node server.js` |
   | **Instance Type** | Free (or Starter for always-on) |

5. Add environment variables under **Environment**:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Your Supabase connection string (Transaction mode, port 6543) |
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |
   | `FRONTEND_URL` | Your Vercel deployment URL (added after frontend deploy) |

6. Click **Create Web Service**. Render will build and deploy automatically.
7. Note your backend URL, e.g. `https://parksmart-backend.onrender.com`.

---

## Step 3 — Deploy Frontend to Vercel

1. Log in to [Vercel](https://vercel.com) → **New Project**.
2. Import your GitHub repository.
3. Configure the project:

   | Setting | Value |
   |---|---|
   | **Root Directory** | `frontend` |
   | **Framework Preset** | Vite |
   | **Build Command** | `npm run build` |
   | **Output Directory** | `dist` |

4. Add environment variables under **Settings → Environment Variables**:

   | Key | Value |
   |---|---|
   | `VITE_API_URL` | `https://parksmart-backend.onrender.com/api` |

5. Click **Deploy**. Vercel builds and publishes automatically.
6. Copy your Vercel URL (e.g. `https://parksmart.vercel.app`).

---

## Step 4 — Update CORS (Backend)

Back in Render, update the `FRONTEND_URL` environment variable to your Vercel URL. The backend uses this for production CORS configuration. Trigger a redeploy if needed.

---

## Step 5 — Post-Deployment Health Check

Verify the backend is running and connected to the database:

```bash
curl https://parksmart-backend.onrender.com/api/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-06-01T12:00:00.000Z",
  "db": "connected"
}
```

Verify Swagger UI is accessible:
```
https://parksmart-backend.onrender.com/api/docs
```

Verify the frontend loads and the Analytics tab fetches data:
```
https://parksmart.vercel.app
```

---

## Local Development (Full Stack)

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd SmartPark

# 2. Set up backend environment
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL

# 3. Start backend
npm install
node server.js

# 4. In a separate terminal, start frontend
cd ../frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## Environment Variable Reference

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL/Supabase connection string |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Production only | Vercel URL for CORS whitelist |

### Frontend (Vercel / `.env.local`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend API base URL (default: `http://localhost:3000/api`) |

---

## Troubleshooting

| Issue | Resolution |
|---|---|
| `db: "error"` on health check | Verify `DATABASE_URL` is correct; check Supabase project is active |
| CORS errors in browser | Ensure `FRONTEND_URL` is set on Render and matches the exact Vercel origin |
| Render free tier sleeps | Use Render's **Cron Jobs** or an uptime monitor (e.g. UptimeRobot) to keep the service warm |
| Analytics shows no data | Run `npm run seed && npm run pipeline` to populate historical data |
| Swagger UI blank | Verify `backend/swagger.yaml` exists and `yamljs` is installed (`npm install`) |
