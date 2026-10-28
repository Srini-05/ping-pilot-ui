# PingPilot UI

ECCS internal tool for reviewing and running network connectivity tests. This repository contains the React + TypeScript frontend; execution, configuration, retained history, and report generation belong to the separate FastAPI backend repository.

## Local development

Start the backend in its own checkout:

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-dev.txt
.venv/bin/uvicorn app:app --host 127.0.0.1 --port 8000 --reload
```

In this repository, install and start the frontend:

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173`. Vite proxies `/api` requests to the local backend on port 8000. For a hosted backend, set `VITE_API_URL` to its HTTPS origin when building.

```sh
VITE_API_URL=https://your-api.example.com npm run build
```

The UI does not store test history in browser storage.

## GitHub Pages deployment

The `Deploy Pages` GitHub Actions workflow builds and publishes this repository on pushes to `main`.

1. Push this frontend repository to GitHub and select **Settings > Pages > Source > GitHub Actions**.
2. Under **Settings > Secrets and variables > Actions > Variables**, add `VITE_API_URL` with the backend's public HTTPS origin. It is a URL, not a secret.
3. Configure the backend's `PING_ALLOWED_ORIGINS` to include the Pages origin, such as `https://OWNER.github.io`.
4. Push to `main`; the workflow selects the correct base path for a project page or an `OWNER.github.io` site.

GitHub Pages is public by default. Do not publish this UI for internal use until ECCS-approved access control protects both the site and API. A frontend URL and CORS allowlist are not authentication, and credentials must never be embedded in the frontend build.

## Backend hosting note

Vercel supports Python FastAPI and streamed responses, but the current backend is not ready for Vercel test execution: it starts daemon threads, keeps active jobs and SSE queues in process memory, and uses local SQLite/report files. Serverless instances can restart or scale independently. Vercel Queues/Workflows plus managed PostgreSQL and object storage could support a redesigned job flow, but this repository does not integrate them yet. The backend also requires a trusted server-side gateway to authenticate ECCS users and inject `PING_API_TOKEN`; never place that token in this static frontend. Until the worker flow and authentication gateway are ready, use an approved long-running service behind ECCS access control.

## Validation

```sh
npm run typecheck
npm run lint
npm run build
```