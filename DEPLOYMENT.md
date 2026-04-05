# Deployment Guide — Supermarket SaaS

## Prerequisites

- **VPS:** Ubuntu 22+ with root access
- **Node.js:** v18+ (recommend v22 LTS)
- **MySQL:** 8.0+
- **Redis:** 7+
- **PM2:** `npm install -g pm2`
- **Nginx** or **Apache** for reverse proxy

## Project Structure on VPS

```
/var/www/supermarket-saas/
├── backend/              # API server (PM2, port 3002)
│   ├── dist/             # Compiled JS (production)
│   └── public/uploads/   # User uploads
├── admin-panel/dist/     # Built admin panel (static)
├── storefront/dist/      # Built storefront (static)
├── stores/               # Custom storefronts (one per tenant)
│   └── {slug}/dist/      # Each custom store's build
├── ecosystem.supermarket.config.cjs  # PM2 configuration
├── scripts/deploy.sh     # Deploy script
└── logs/                 # PM2 log files
```

## First-Time Setup

### 1. Clone & Install

```bash
cd /var/www
git clone <repo-url> supermarket-saas
cd supermarket-saas
```

### 2. Configure Environment

```bash
# Backend
cp backend/.env.example backend/.env
nano backend/.env
```

**Required `.env` variables:**
```env
NODE_ENV=production
PORT=3002

# Database
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_secure_password
DB_NAME=supermarket_saas
DB_PORT=3306

# Auth (generate secure random strings)
JWT_SECRET=<generate-64-char-random>
REFRESH_TOKEN_SECRET=<generate-64-char-random>

# Redis
REDIS_URL=redis://localhost:6379

# CORS (your actual domains)
CORS_ALLOWED_ORIGINS=https://admin.yourdomain.com,https://yourdomain.com

# SMTP (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=465
SMTP_USER=info@yourdomain.com
SMTP_PASSWORD=your_email_password
SMTP_FROM=info@yourdomain.com
```

```bash
# Admin Panel
echo "VITE_API_URL=https://api.yourdomain.com" > admin-panel/.env.production

# Storefront
echo "VITE_API_URL=https://api.yourdomain.com" > storefront/.env.production
```

### 3. Create Database

```bash
mysql -u root -p
CREATE DATABASE supermarket_saas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'saas_user'@'localhost' IDENTIFIED BY 'secure_password';
GRANT ALL PRIVILEGES ON supermarket_saas.* TO 'saas_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Install Dependencies & Build

```bash
# Backend
cd backend
npm ci
npm run build          # Compiles TypeScript → dist/
npm run migrate        # Creates database tables
npm run seed           # Seeds initial data

# Admin Panel
cd ../admin-panel
npm ci
npm run build          # Builds to dist/

# Storefront
cd ../storefront
npm ci
npm run build          # Builds to dist/
```

### 5. Start with PM2

```bash
cd /var/www/supermarket-saas
pm2 start ecosystem.supermarket.config.cjs
pm2 save               # Save process list for auto-restart on reboot
pm2 startup            # Generate startup script
```

### 6. Verify

```bash
pm2 status             # Should show "supermarket-api" as "online"
pm2 logs               # Check for errors
curl http://localhost:3002/api/health   # Should return OK
```

## Nginx Configuration

```nginx
# API Server (reverse proxy to PM2)
server {
    listen 443 ssl;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Upload size limit
    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Admin Panel (static files)
server {
    listen 443 ssl;
    server_name admin.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/supermarket-saas/admin-panel/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API calls
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:3002;
    }
}

# Storefront (tenant domains)
server {
    listen 443 ssl;
    server_name *.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Check for custom storefront first
    set $tenant_slug $host;
    if ($host ~ ^([^.]+)\.yourdomain\.com$) {
        set $tenant_slug $1;
    }

    # Try custom store, fall back to shared storefront
    root /var/www/supermarket-saas/storefront/dist;

    location / {
        # Custom store check
        if (-f /var/www/supermarket-saas/stores/$tenant_slug/dist/index.html) {
            root /var/www/supermarket-saas/stores/$tenant_slug/dist;
        }
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /uploads/ {
        proxy_pass http://localhost:3002;
    }
}
```

## Updating / Redeploying

### Quick Deploy (recommended)

```bash
cd /var/www/supermarket-saas
bash scripts/deploy.sh
```

This script: pulls code → builds backend → runs migrations → builds admin-panel → builds storefront → builds custom stores → restarts PM2.

### Manual Deploy

```bash
cd /var/www/supermarket-saas
git pull origin main

cd backend && npm ci && npm run build && npm run migrate
cd ../admin-panel && npm ci && npm run build
cd ../storefront && npm ci && npm run build

pm2 restart ecosystem.supermarket.config.cjs
```

## PM2 Commands

```bash
pm2 status                    # Check process status
pm2 logs supermarket-api      # View logs
pm2 logs supermarket-api --lines 100  # Last 100 lines
pm2 restart supermarket-api   # Restart
pm2 stop supermarket-api      # Stop
pm2 delete supermarket-api    # Remove from PM2
pm2 monit                     # Real-time monitor (CPU/memory)
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| API returns 502 | Check `pm2 logs` for errors, ensure port 3002 is correct |
| CORS errors | Update `CORS_ALLOWED_ORIGINS` in `.env` with actual domains |
| Frontend shows blank page | Check `VITE_API_URL` points to correct API domain |
| Database connection refused | Check MySQL is running, credentials in `.env` are correct |
| Redis connection refused | Check Redis is running: `redis-cli ping` |
| Uploads not showing | Ensure `/uploads` proxy is configured in Nginx |
| Custom store not loading | Check `stores/{slug}/dist/index.html` exists |

## Memory & Performance

- PM2 is configured with **512MB max memory** — restarts if exceeded
- Backend runs compiled JavaScript (NOT tsx) — minimal CPU overhead
- Redis caches storefront config for 5 minutes
- Static files (admin-panel, storefront) served directly by Nginx — no Node.js overhead
