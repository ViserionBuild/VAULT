# Local Supabase Setup Guide (Ubuntu)

This guide covers:

* Docker installation
* Supabase CLI installation
* Project initialization
* Running local Supabase
* Daily workflow
* One-time setup vs daily commands
* Viewing database/tables/querying

---

# Architecture Overview

```txt
Ubuntu System
    └── Supabase CLI
            └── Docker Containers
                    ├── PostgreSQL
                    ├── Auth
                    ├── Storage
                    ├── Studio
                    └── API Gateway
```

* Supabase CLI runs on Ubuntu
* Actual database/services run inside Docker containers

---

# ONE-TIME SETUP

These steps are done only once on your machine.

---

# Step 1 — Update Ubuntu

```bash
sudo apt update
sudo apt upgrade -y
```

---

# Step 2 — Install Docker

## Install Required Packages

```bash
sudo apt install -y ca-certificates curl gnupg lsb-release
```

---

## Add Docker GPG Key

```bash
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

---

## Add Docker Repository

```bash
echo \
"deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

---

## Install Docker Engine

```bash
sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

# Step 3 — Start Docker

```bash
sudo systemctl start docker
sudo systemctl enable docker
```

---

# Step 4 — Add User to Docker Group (IMPORTANT)

Without this, Docker commands require sudo.

```bash
sudo usermod -aG docker $USER
```

Then apply changes:

```bash
newgrp docker
```

OR logout/login once.

---

# Step 5 — Verify Docker

```bash
docker --version
```

Test Docker:

```bash
docker run hello-world
```

---

# Step 6 — Verify Node.js

Check:

```bash
node -v
npm -v
```

You already have Node.js installed.

---

# Step 7 — Install Supabase CLI

Recommended quick method:

```bash
sudo npm install -g supabase
```

Verify:

```bash
supabase --version
```

---

# PROJECT SETUP (ONE TIME PER PROJECT)

These steps are done once for each project.

---

# Step 1 — Open Project Folder

```bash
cd your-project-folder
```

---

# Step 2 — Initialize Supabase

```bash
supabase init
```

This creates:

```txt
supabase/
```

folder inside your project.

---

# Step 3 — Start Local Supabase

```bash
supabase start
```

First startup may take several minutes because Docker images are downloaded.

---

# After Starting

You will see something like:

```txt
API URL: http://127.0.0.1:54321
DB URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
Studio URL: http://127.0.0.1:54323
```

---

# Open Local Supabase Dashboard

Open browser:

```txt
http://127.0.0.1:54323
```

This is your LOCAL Supabase Studio.

---

# DAILY WORKFLOW (EVERY TIME YOU WORK)

These are the commands you run every day.

---

# Step 1 — Open Project

```bash
cd your-project-folder
```

---

# Step 2 — Start Docker

```bash
sudo systemctl start docker
```

(Optional if already running)

---

# Step 3 — Start Supabase

```bash
supabase start
```

This starts:

* PostgreSQL
* Auth
* Storage
* Realtime
* Studio

---

# Step 4 — Start Frontend

Example:

```bash
npm run dev
```

---

# FINAL DAILY COMMAND FLOW

```bash
cd your-project-folder

sudo systemctl start docker

supabase start

npm run dev
```

---

# WHEN FINISHED WORKING

---

# Stop Supabase

```bash
supabase stop
```

---

# Optional: Stop Docker

```bash
sudo systemctl stop docker
```

(Not necessary usually)

---

# VIEWING DATABASE / TABLES / DATA

After:

```bash
supabase start
```

open:

```txt
http://127.0.0.1:54323
```

---

# View Tables

Inside Supabase Studio:

```txt
Database
    → Tables
```

You can:

* view rows
* edit rows
* insert rows
* delete rows

---

# Run SQL Queries

Inside Studio:

```txt
SQL Editor
```

Example queries:

```sql
SELECT * FROM todo_lists;
```

```sql
SELECT * FROM todo_tasks;
```

```sql
SELECT * FROM todo_tasks
WHERE completed = false;
```

---

# RESET LOCAL DATABASE

WARNING:
Deletes local database data.

```bash
supabase db reset
```

Useful during development/testing.

---

# CREATE MIGRATIONS

Create migration:

```bash
supabase migration new create_todo_tables
```

A SQL file is generated inside:

```txt
supabase/migrations/
```

Add SQL there.

---

# APPLY MIGRATIONS

```bash
supabase db reset
```

or

```bash
supabase migration up
```

---

# CHECK RUNNING DOCKER CONTAINERS

```bash
docker ps
```

You will see containers like:

```txt
supabase-db
supabase-auth
supabase-studio
supabase-kong
```

---

# CONNECT FRONTEND TO LOCAL SUPABASE

Example `.env.local`

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key
```

---

# PRODUCTION WORKFLOW

Recommended approach:

* Local Supabase → development/testing
* Cloud Supabase → production only

Never directly experiment on production DB.

---

# PUSH TO PRODUCTION LATER

Link project:

```bash
supabase link --project-ref YOUR_PROJECT_ID
```

Push migrations:

```bash
supabase db push
```

---

# RECOMMENDED PROJECT STRUCTURE

```txt
project/
│
├── supabase/
├── src/
├── package.json
├── .env.local
└── README.md
```

---

# USEFUL COMMANDS SUMMARY

## One-Time Machine Setup

```bash
sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl start docker

sudo systemctl enable docker

sudo usermod -aG docker $USER

sudo npm install -g supabase
```

---

# One-Time Project Setup

```bash
cd your-project-folder

supabase init

supabase start
```

---

# Daily Commands

```bash
cd your-project-folder

sudo systemctl start docker

supabase start

npm run dev
```

---

# Stop Services

```bash
supabase stop
```

---

# Reset Local DB

```bash
supabase db reset
```
