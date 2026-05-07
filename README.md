# VAULT (Dragonstone)

A modern full-stack workspace and resource manager inspired by Google Drive + Notion + command-center dashboards.

## App naming/configuration

The app name is configurable and defaults to `Dragonstone`.

- Frontend uses `VITE_APP_NAME` (from `frontend/.env`), with fallback default `Dragonstone`.
- Backend uses `APP_NAME` (from `server/.env`), with fallback default `Dragonstone`.

Configured name is used in:
- Browser title
- Sidebar logo/title
- Navbar title
- Dashboard welcome title
- Login page title
- Backend `/api/health` response and startup log

## Stack

- Frontend: React + Vite + Tailwind CSS + React Router + dnd-kit + Zustand + Framer Motion
- Backend: Node.js + Express
- DB/Auth target: Supabase PostgreSQL + Supabase Auth

## Project structure

```txt
frontend/
  src/
    components/
    layouts/
    pages/
    services/
    store/
server/
  routes/
  controllers/
  middleware/
  services/
  db/
  utils/
```

## Setup

### 1) Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

### 2) Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Backend runs by default at `http://localhost:4000`.

## Supabase schema

Use `server/db/schema.sql` to create core tables:
- `folders`
- `blocks`

## API endpoints

- `GET /api/health`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `GET/POST/PATCH /api/folders`
- `GET/POST/PATCH /api/blocks`
- `GET /api/search?q=`
- `GET /api/favorites`
- `GET /api/trash`

## Build & lint

```bash
cd frontend
npm run lint
npm run build
```
