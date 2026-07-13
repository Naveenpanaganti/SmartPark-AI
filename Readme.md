# ParkSmart — Intelligent Parking Management Platform

> Hackathon 3.0 Enhancement — Real-time occupancy, analytics, predictions, and interactive dashboard.

---

## Overview

ParkSmart is a full-stack parking management platform for large malls. It lets users find and book parking slots in real time, while giving managers live occupancy analytics, historical trend charts, peak-hour predictions, and a weekly heatmap — all in a single React dashboard.

---

## Features

### Core Parking
- Real-time parking slot grid with live occupancy status (auto-refreshes every 10 seconds)
- Instant slot booking with user name
- Floor-level filtering (Ground, Level 1, Level 2)
- Manager-only booking cancellation
- Role-based access control via `x-user-role` header

### Analytics Enhancement
- **Occupancy snapshots** recorded automatically every 5 minutes per floor
- **Synthetic data generator** — 30 days of realistic historical booking data with weekday/weekend traffic patterns and three daily peak windows
- **ETL cleaning pipeline** — deduplication, null discard, invalid-record exclusion, 3-sigma outlier flagging
- **24-hour demand forecast** — weighted moving average (WMA) over 14 days with 95% confidence intervals
- **Live analytics dashboard** — KPI cards, occupancy line chart, prediction bar chart with error bars, 7×24 heatmap, model accuracy widget
- **Interactive API docs** — Swagger UI at `/api/docs`

---

## Architecture

```mermaid
flowchart TD
    subgraph Browser["Browser (React 19 + Vite + TailwindCSS v4)"]
        App["App.jsx\n(Tab Nav: Parking | Analytics)"]
        PG["ParkingGrid.jsx"]
        AD["AnalyticsDashboard.jsx"]
        OC["OccupancyChart.jsx (Recharts)"]
        PC["PredictionChart.jsx (Recharts)"]
        HG["HeatmapGrid.jsx (CSS Grid)"]
        MA["ModelAccuracy.jsx"]
        UA["useAnalytics.js (30s refresh)"]
    end

    subgraph Backend["Backend (Node.js + Express 5, CommonJS)"]
        SRV["server.js"]
        SCHED["Snapshot Scheduler (5 min)"]
        AR["analytics.routes.js"]
        PRED["prediction.js (WMA + CI)"]
        PIPE["pipeline.js (ETL)"]
        SEED["seed.js (Synthetic data)"]
        SWAGGER["swagger.yaml + swagger-ui-express"]
    end

    subgraph DB["Supabase / PostgreSQL"]
        PS["parking_slots"]
        BK["bookings"]
        OS["occupancy_snapshots"]
        PR["pipeline_runs"]
    end

    Browser -- "REST /api/* (fetch + 30s poll)" --> Backend
    Backend -- "SELECT / INSERT" --> DB
    SEED -- "INSERT bookings & snapshots" --> DB
    PIPE -- "UPDATE is_outlier / INSERT pipeline_runs" --> DB
    SCHED -- "INSERT occupancy_snapshots (5 min)" --> DB
```

---

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | 20+ |
| npm | 10+ |
| PostgreSQL / Supabase | PostgreSQL 15+ |

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd SmartPark
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and fill in your `DATABASE_URL`:

```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
```

### 3. Apply the database schema

Run the migration in your Supabase SQL Editor (or via psql):

```bash
psql $DATABASE_URL -f backend/db/migrations/001_analytics_schema.sql
```

### 4. Install dependencies and start the backend

```bash
cd backend
npm install
node server.js
# Server starts on http://localhost:3000
```

### 5. Seed historical data (optional but recommended)

```bash
npm run seed      # Generates 30 days of synthetic bookings + snapshots
npm run pipeline  # Cleans data and flags outliers
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | **Yes** | PostgreSQL connection string (Supabase or local) |
| `PORT` | No | HTTP port — defaults to `3000` |
| `NODE_ENV` | No | `development` or `production` |
| `FRONTEND_URL` | Production | Vercel URL for CORS whitelist |

### Frontend (`.env.local` or Vercel dashboard)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend API base URL — defaults to `http://localhost:3000/api` |

---

## API Endpoint Reference

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | Server + DB health check |
| `GET` | `/api/slots` | None | All parking slots with live booking status |
| `POST` | `/api/book` | user | Create a booking |
| `GET` | `/api/all-bookings` | manager | All bookings with slot details |
| `DELETE` | `/api/slots/:id/booking` | manager | Cancel active booking for a slot |
| `GET` | `/api/analytics/occupancy-history` | None | Occupancy snapshots (filterable by floor + hours) |
| `GET` | `/api/analytics/stats` | None | Live KPI summary (occupancy rate, peak hour, MAE) |
| `GET` | `/api/analytics/predictions` | None | 24-hour WMA demand forecast with confidence intervals |
| `GET` | `/api/analytics/heatmap` | None | 7×24 average occupancy matrix |
| `GET` | `/api/docs` | None | Interactive Swagger UI |

### Authentication

Protected endpoints require an `x-user-role` header:
- `x-user-role: user` — standard access (booking)
- `x-user-role: manager` — full access (all bookings, cancellation)

### Query Parameters

**`/api/analytics/occupancy-history`**
- `floor` (string, optional) — filter by floor level, e.g. `Ground`
- `hours` (integer 1–168, default 24) — time window in hours

**`/api/analytics/predictions`**
- `target_date` (ISO 8601 date, optional) — defaults to tomorrow

---

## Data Methodology

See [`DATA_METHODOLOGY.md`](./DATA_METHODOLOGY.md) for details on:
- Synthetic data generation assumptions and traffic patterns
- ETL cleaning rules (deduplication, null discard, invalid exclusion, outlier flagging)
- Weighted moving average prediction formula
- Data quality verification steps

---

## Deployment

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) for step-by-step instructions to deploy to **Render** (backend) + **Vercel** (frontend) + **Supabase** (database).

---

## Project Structure

```
SmartPark/
├── backend/
│   ├── db/
│   │   └── migrations/
│   │       └── 001_analytics_schema.sql
│   ├── routes/
│   │   └── analytics.routes.js
│   ├── db.js              # pg Pool singleton
│   ├── seed.js            # Synthetic data generator
│   ├── pipeline.js        # ETL cleaning pipeline
│   ├── prediction.js      # WMA prediction engine
│   ├── server.js          # Express app + scheduler + Swagger
│   ├── swagger.yaml       # OpenAPI 3.0.3 spec
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ParkingGrid.jsx
│   │   │   └── analytics/
│   │   │       ├── AnalyticsDashboard.jsx
│   │   │       ├── OccupancyChart.jsx
│   │   │       ├── PredictionChart.jsx
│   │   │       ├── HeatmapGrid.jsx
│   │   │       └── ModelAccuracy.jsx
│   │   ├── hooks/
│   │   │   └── useAnalytics.js
│   │   ├── context/
│   │   │   └── UserContext.jsx
│   │   └── App.jsx
│   └── package.json
├── DATA_METHODOLOGY.md
├── DEPLOYMENT.md
└── Readme.md
```

---

## License

MIT — built for ParkSmart Hackathon 3.0.
