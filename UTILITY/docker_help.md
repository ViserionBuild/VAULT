# Docker Command Reference Guide (Ubuntu + Supabase Development)

This guide contains:

* Docker installation commands
* Docker service management
* Container management
* Image management
* Volume management
* Network management
* Useful debugging commands
* Supabase-related Docker usage

---

# WHAT IS DOCKER?

Docker runs applications inside isolated containers.

Example:

* PostgreSQL
* Supabase
* Redis
* Node.js servers

Instead of installing everything directly on Ubuntu.

---

# BASIC DOCKER ARCHITECTURE

```txt id="jjlwm1"
Ubuntu OS
    └── Docker Engine
            └── Containers
                    ├── PostgreSQL
                    ├── Supabase
                    ├── Redis
                    └── Node Backend
```

---

# DOCKER INSTALLATION COMMANDS

# Update Ubuntu

```bash id="s3fpn2"
sudo apt update
sudo apt upgrade -y
```

---

# Install Required Packages

```bash id="5i31tq"
sudo apt install -y ca-certificates curl gnupg lsb-release
```

---

# Add Docker GPG Key

```bash id="l5e4ic"
sudo mkdir -p /etc/apt/keyrings

curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
```

---

# Add Docker Repository

```bash id="jlwm8t"
echo \
"deb [arch=$(dpkg --print-architecture) \
signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu \
$(lsb_release -cs) stable" | \
sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

---

# Install Docker Engine

```bash id="0r8qiz"
sudo apt update

sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

# VERIFY INSTALLATION

```bash id="jlwm7z"
docker --version
```

---

# START / STOP DOCKER SERVICE

# Start Docker

```bash id="jlwmc7"
sudo systemctl start docker
```

---

# Stop Docker

```bash id="jlwmdb"
sudo systemctl stop docker
```

---

# Restart Docker

```bash id="6n2o6u"
sudo systemctl restart docker
```

---

# Check Docker Status

```bash id="jlwmw9"
sudo systemctl status docker
```

---

# Enable Docker on Boot

```bash id="0d1hvl"
sudo systemctl enable docker
```

---

# DISABLE DOCKER ON BOOT

```bash id="jlwmjp"
sudo systemctl disable docker
```

---

# REMOVE SUDO REQUIREMENT

# Add User to Docker Group

```bash id="uv1b7j"
sudo usermod -aG docker $USER
```

Apply changes:

```bash id="jlwm1r"
newgrp docker
```

OR logout/login once.

---

# TEST DOCKER

```bash id="jlwmif"
docker run hello-world
```

---

# DOCKER IMAGE COMMANDS

# View All Images

```bash id="jlwmxn"
docker images
```

---

# Pull an Image

Example:

```bash id="jlwmx0"
docker pull postgres
```

---

# Remove an Image

```bash id="z4q1w8"
docker rmi IMAGE_ID
```

---

# Remove Unused Images

```bash id="2nt7tp"
docker image prune
```

---

# Remove ALL Unused Images

```bash id="jlwmk7"
docker image prune -a
```

---

# DOCKER CONTAINER COMMANDS

# View Running Containers

```bash id="xjlwm1"
docker ps
```

---

# View ALL Containers

Including stopped containers:

```bash id="0jlwm8"
docker ps -a
```

---

# Run a Container

Example:

```bash id="jlwm0t"
docker run postgres
```

---

# Run Container in Background

```bash id="jlwm5h"
docker run -d postgres
```

---

# Give Container a Name

```bash id="jlwm7m"
docker run --name my-postgres postgres
```

---

# Port Mapping

```bash id="jlwm3n"
docker run -p 5432:5432 postgres
```

Meaning:

```txt id="wjjlwm"
HOST_PORT : CONTAINER_PORT
```

---

# Stop a Container

```bash id="x8tjlwm"
docker stop CONTAINER_ID
```

---

# Start a Stopped Container

```bash id="2jlwmj"
docker start CONTAINER_ID
```

---

# Restart a Container

```bash id="jlwm0v"
docker restart CONTAINER_ID
```

---

# Remove a Container

```bash id="2xjlwm"
docker rm CONTAINER_ID
```

---

# Force Remove Container

```bash id="jlwmu2"
docker rm -f CONTAINER_ID
```

---

# REMOVE ALL STOPPED CONTAINERS

```bash id="jlwmwe"
docker container prune
```

---

# CONTAINER LOGS

# View Logs

```bash id="yjlwm3"
docker logs CONTAINER_ID
```

---

# Live Logs

```bash id="0jlwmm"
docker logs -f CONTAINER_ID
```

---

# EXECUTE COMMAND INSIDE CONTAINER

# Open Bash Shell

```bash id="1jlwmx"
docker exec -it CONTAINER_ID bash
```

---

# Open sh Shell

```bash id="0jlwmf"
docker exec -it CONTAINER_ID sh
```

---

# Example PostgreSQL Container Access

```bash id="0jlwmn"
docker exec -it supabase-db bash
```

---

# DOCKER VOLUME COMMANDS

Volumes store persistent data.

Important for:

* PostgreSQL
* Supabase
* databases

---

# View Volumes

```bash id="jlwmab"
docker volume ls
```

---

# Remove Volume

```bash id="jlwmq1"
docker volume rm VOLUME_NAME
```

---

# Remove Unused Volumes

```bash id="0jlwmq"
docker volume prune
```

---

# DOCKER NETWORK COMMANDS

# View Networks

```bash id="4jlwmv"
docker network ls
```

---

# Inspect Network

```bash id="jlwmm2"
docker network inspect NETWORK_NAME
```

---

# SYSTEM CLEANUP COMMANDS

# Remove Unused Containers, Networks, Images

```bash id="jlwmr8"
docker system prune
```

---

# Remove EVERYTHING Unused

```bash id="jlwm3a"
docker system prune -a
```

---

# REMOVE EVERYTHING INCLUDING VOLUMES

WARNING:
Deletes all containers/images/data.

```bash id="jlwm0y"
docker system prune -a --volumes
```

---

# DOCKER COMPOSE COMMANDS

Used for multi-container apps.

Supabase internally uses Docker Compose style orchestration.

---

# Start Services

```bash id="zjlwm1"
docker compose up
```

---

# Start in Background

```bash id="0jlwmp"
docker compose up -d
```

---

# Stop Services

```bash id="jlwm2u"
docker compose down
```

---

# Restart Services

```bash id="0jlwmz"
docker compose restart
```

---

# View Logs

```bash id="0jlwmg"
docker compose logs
```

---

# LIVE LOGS

```bash id="4jlwm5"
docker compose logs -f
```

---

# SUPABASE + DOCKER COMMANDS

# Start Local Supabase

```bash id="jlwm0b"
supabase start
```

This automatically:

* downloads Docker images
* creates containers
* starts PostgreSQL
* starts Studio
* starts Auth

---

# Stop Local Supabase

```bash id="zjlwm4"
supabase stop
```

---

# Check Running Supabase Containers

```bash id="7jlwmw"
docker ps
```

You will see:

```txt id="5jlwm8"
supabase-db
supabase-auth
supabase-studio
supabase-kong
```

---

# Open Supabase Studio

```txt id="qjlwm4"
http://127.0.0.1:54323
```

---

# DEBUGGING COMMANDS

# View Container Resource Usage

```bash id="jlwm8f"
docker stats
```

---

# Inspect Container Details

```bash id="4jlwm1"
docker inspect CONTAINER_ID
```

---

# View Docker Disk Usage

```bash id="yjlwmj"
docker system df
```

---

# COMMON DEVELOPMENT FLOW

# Daily Workflow

```bash id="9jlwmx"
cd your-project

sudo systemctl start docker

supabase start

npm run dev
```

---

# End Work Session

```bash id="4jlwmf"
supabase stop
```

Optional:

```bash id="1jlwm3"
sudo systemctl stop docker
```

---

# IMPORTANT NOTES

# Docker Containers are Temporary

Containers can be:

* stopped
* deleted
* recreated

---

# Volumes Store Persistent Data

Databases survive because volumes store data.

---

# Supabase Uses Docker Internally

You do NOT manually manage Supabase containers normally.

The Supabase CLI handles:

* container creation
* networking
* startup
* shutdown

automatically.

---

# MOST IMPORTANT COMMANDS SUMMARY

# Install Docker

```bash id="qjlwm1"
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

---

# Start Docker

```bash id="4jlwmc"
sudo systemctl start docker
```

---

# Check Running Containers

```bash id="6jlwmx"
docker ps
```

---

# Start Supabase

```bash id="8jlwm7"
supabase start
```

---

# Stop Supabase

```bash id="2jlwm0"
supabase stop
```

---

# Open Supabase Studio

```txt id="0jlwm8"
http://127.0.0.1:54323
```

---

# Remove Everything (Dangerous)

```bash id="2jlwmm"
docker system prune -a --volumes
```
