# AskFrontend Deployment

## Docker (recommended)

```bash
cp .env.example .env
# Edit .env with production values
docker compose up -d
```

Frontend serves on port 80. API calls to `/api/*` are proxied to `BACKEND_URL`.

## Manual VPS Deployment

### 1. Build
```bash
npm ci
npm run build
```

### 2. Upload `dist/` to server
```bash
python deploy/ftp_deploy.py --host $VPS_HOST --user $VPS_USER --local dist/ --remote /srv/ask.kz/frontend
```

### 3. Nginx configuration
The frontend static files are served by nginx alongside the backend reverse proxy. See `deploy/vps_cert_and_service.sh` in AskBackend for the combined nginx + backend setup.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8080` | Backend API base URL |
