---
name: check-updates
description: Pull the latest foodtracker code from GitHub main and redeploy it locally via Docker Compose. Use when the user says "check for updates", "deploy the latest changes", or asks to sync this local Docker deployment with changes merged on GitHub (e.g. from a separate cloud/coding session).
---

# Check for updates and redeploy

This machine runs the foodtracker app locally via Docker Desktop + Docker Compose, exposed on port 3000 (LAN and Tailscale). Code changes get made elsewhere (e.g. a cloud session) and merged to `main` on GitHub; this skill syncs that into the running local deployment.

Repo root: wherever this `.claude/skills/check-updates/SKILL.md` lives (i.e. the current project directory).

## Steps

1. **Check Docker is up.** Run `docker ps`. If it fails to connect to the daemon:
   - Check for running Docker processes (PowerShell: `Get-Process | Where-Object { $_.ProcessName -like "*docker*" }`).
   - If none, relaunch: `Start-Process -FilePath "C:\Users\karen\AppData\Local\Programs\DockerDesktop\Docker Desktop.exe"`, then poll `docker ps` every few seconds (be patient — this VM can be slow to start, allow up to ~2 minutes).
   - **Known bug**: Docker Desktop on this machine sometimes crash-loops on startup with an "unexpected error" dialog referencing a stale AF_UNIX socket (e.g. `sailor-ingest.sock`, `dockerInference`, or `docker-secrets-engine\engine.sock`) that Windows reports as "cannot be accessed by the system". If you see this:
     - Ask the user to click Quit on the error dialog.
     - Force-stop all docker/com.docker processes.
     - `wsl --shutdown`, wait a few seconds.
     - Rename (don't try to delete — it fails) the stuck directories: `C:\Users\karen\AppData\Local\Docker\run` and `C:\Users\karen\AppData\Local\docker-secrets-engine` (e.g. append `_old_<timestamp>`). Renaming succeeds even when individual file deletion inside them fails.
     - Relaunch Docker Desktop and poll `docker ps` again.

2. **Pull latest code.** In the repo directory:
   ```
   git status
   git fetch origin main
   git diff HEAD origin/main -- Dockerfile
   git pull origin main
   ```
   Check `git status` first for uncommitted local changes before pulling — if there are any, check whether the incoming diff touches the same files (as above for Dockerfile) before assuming it's safe. The local `Dockerfile` is intentionally modified from upstream (single-stage build, no `COPY --from=` of `node_modules`) to work around this environment's VM being extremely slow on multi-stage `COPY --from=` layers — don't let a pull silently revert that unless the user explicitly wants to try the multi-stage version again.

3. **Check for new required env vars.** Compare `.env` against `.env.example` (`diff .env .env.example`). If `.env.example` has new variable names not present in `.env`, ask the user for the values before proceeding (never guess or leave required secrets blank).

4. **Rebuild and restart.**
   ```
   docker compose up --build -d
   ```
   Run this in the background (builds can take a while) and poll the output file / `docker ps` for completion rather than blocking. This VM has shown wildly variable build speed (an 8s compile one run, several minutes the next) due to host-level CPU throttling — do not assume a hang until there's truly been zero output progress for 5+ minutes AND CPU usage on `com.docker.backend` shows no delta over a 10s sample.

5. **Verify.**
   ```
   curl -sS -m 10 -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000
   ```
   Also fine to check the Tailscale address (100.109.184.19:3000) if useful for confirming phone access.

6. **Report to the user**: what changed (from `git log` / the pulled commit range or PR description if known), confirm the new container is up and responding, and remind them to refresh the app on their phone. Data persists automatically (SQLite lives on the `foodtracker-data` Docker volume, untouched by rebuilds).
