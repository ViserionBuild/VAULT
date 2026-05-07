# VAULT

VAULT - Virtual Aggregation Utility for Links & Tasks

## Phase 1 (Implemented)

This repository now includes the Phase 1 foundation from the PRD:

- **Frontend setup** with Vite + React + TailwindCSS + shadcn-style UI primitives
- **Backend setup** with Express 5 + Supabase client wiring + PostgreSQL dependency baseline
- **JWT authentication** with signup, login, logout, and refresh-token rotation
- **Protected routes** on frontend and backend (`/api/v1/auth/me`)
- **Password hashing** using bcrypt (12 salt rounds)
- **Responsive application shell** with top navigation + collapsible sidebar
- **Theme system** with Dark / Light / System persistence in `localStorage`
- **API health endpoint** at `/api/v1/health`
- **Auth rate limiting** at 5 requests/minute per IP

## Project Structure

- `/frontend` – React application shell and auth UI
- `/backend` – Express API and auth endpoints
- `/PRD` – Product requirements document

## Local Development

### 1) Backend

```bash
cd /home/runner/work/VAULT/VAULT/backend
cp .env.example .env
npm install
npm run dev
```

Backend API base URL: `http://localhost:4000/api/v1`

### 2) Frontend

```bash
cd /home/runner/work/VAULT/VAULT/frontend
cp .env.example .env
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

## Validation Commands

```bash
cd /home/runner/work/VAULT/VAULT/backend && npm test
cd /home/runner/work/VAULT/VAULT/frontend && npm run lint && npm test && npm run build
```
