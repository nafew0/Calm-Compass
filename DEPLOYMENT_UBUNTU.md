# Calm Compass — Ubuntu Production Deployment Guide

This guide deploys **Calm Compass** to the same Ubuntu server that is already running **QuestizSurvey** (and possibly one other similar Django + React stack).

Those existing apps are live, paying-user production apps. **Nothing in this guide touches them.** Every path, database, Redis DB, systemd unit, socket, Nginx site, and log file is namespaced under `calmcompass` so the two installs stay fully isolated.

Stack recap:

- Backend: Django 4.2 + DRF + Channels + Celery (+ Celery Beat) + Postgres + Redis + Stripe + bKash
- Frontend: React 19 + Vite (static build served by Nginx)
- Repo: `https://github.com/nafew0/Calm-Compass.git`
- Production branch: `main`

---

## 0. Namespace Summary (What Is Different From Questiz)

Keep this table as your source of truth. Everywhere Questiz uses one name, Calm Compass uses the one in the right column.

| Concern | Questiz (existing) | Calm Compass (new) |
|---|---|---|
| App root | `/srv/questizsurvey/app` | `/srv/calmcompass/app` |
| Backend dir | `/srv/questizsurvey/app/backend` | `/srv/calmcompass/app/backend` |
| Frontend dir | `/srv/questizsurvey/app/frontend` | `/srv/calmcompass/app/frontend` |
| Python venv | `backend/venv` | `backend/venv` (inside its own app root — no overlap) |
| Postgres DB | `questizsurvey_db` | `calmcompass_db` |
| Postgres user | `questizsurvey_user` | `calmcompass_user` |
| Redis: Channels layer | default | DB `3` |
| Redis: Django cache | DB `1` | DB `4` |
| Redis: Celery broker | DB `2` | DB `5` |
| Redis: Celery results | DB `2` | DB `5` |
| Gunicorn socket | `/run/questiz/...` | `/run/calmcompass/gunicorn.sock` |
| Gunicorn service | `questiz-gunicorn` | `calmcompass-gunicorn` |
| Celery worker service | `questiz-celery` | `calmcompass-celery` |
| Celery beat service | (existing) | `calmcompass-celery-beat` |
| Nginx site file | `questiz` | `calmcompass` |
| Log directory | `/var/log/questiz` | `/var/log/calmcompass` |
| Run directory | `/run/questiz` | `/run/calmcompass` |
| Env file | `backend/.env` | `backend/.env` (scoped to its own path) |
| JWT refresh cookie | `questiz_refresh` | `calm_compass_refresh` (already the default) |
| Service runtime user | (whatever Questiz uses) | `buet` (same user you SSH in as) |

> **Rule of thumb:** if a command, path, or unit name does not contain `calmcompass`, you are probably about to touch the wrong project. Stop and re-read.

---

## 1. Before You Start — Safety Checklist For A Shared Server

Run through this once before doing anything:

1. **Backup Questiz (and any other app) first.**
   ```bash
   pg_dump -U questizsurvey_user -h 127.0.0.1 questizsurvey_db > ~/questizsurvey_backup_$(date +%F).sql
   sudo tar czf ~/questiz_app_backup_$(date +%F).tar.gz /srv/questizsurvey/app
   ```
2. **Note currently used ports.** Calm Compass does **not** open any new public port — it goes through the existing Nginx on 80/443. But confirm nothing else is listening on the new Gunicorn socket path.
   ```bash
   sudo ss -tlnp | sort
   ```
3. **Note existing Redis databases.** Default Redis has 16 logical DBs (`0`–`15`). Questiz uses `0`/`1`/`2`. Calm Compass will use `3`/`4`/`5`. Verify nothing else already uses those:
   ```bash
   redis-cli INFO keyspace
   ```
   If DBs 3/4/5 already show data that belongs to another app, pick free numbers (e.g., `6`/`7`/`8`) and substitute them everywhere in this guide.
4. **Do not edit** `/etc/nginx/sites-available/questiz`, any `questiz-*` systemd unit, Questiz's `.env`, or the `questizsurvey_db` database. Ever.
5. **Do not run `git add .` from `/srv`.** Each project has its own repo; you should only ever `git pull` inside the correct app folder.
6. **Use `sudo nginx -t` before every `nginx reload`.** A bad config on this shared server takes Questiz down too.

---

## 2. Prepare the Repository On Your Local Machine

The server only ever pulls from GitHub. Do not `scp` source files.

```bash
cd "/Users/nafew/Documents/Web Projects/Calm Compass"
git status
git add .
git commit -m "Prepare Calm Compass for first production deploy"
git push origin main
```

Confirm the push landed at `https://github.com/nafew0/Calm-Compass`.

If `git status` shows files you do not want to deploy (for example `backend/.env`, `backend/venv/`, `frontend/node_modules/`, `frontend/dist/`), make sure they are ignored by `.gitignore` and that you are **not** about to commit the local dev `.env`.

---

## 3. SSH Into The Server

```bash
ssh YOUR_SERVER_USER@YOUR_SERVER_IP
```

The rest of this guide runs on the server unless clearly marked "local".

---

## 4. Install Any Missing System Packages

Most of these will already be installed because Questiz is already running. `apt install` is idempotent, so it is safe to re-run.

```bash
sudo apt update
sudo apt install -y \
  python3 python3-venv python3-dev \
  build-essential libpq-dev \
  postgresql postgresql-contrib \
  redis-server \
  nginx \
  git curl
```

Node.js for the frontend build — **only install if it is missing**. Questiz already needs Node, so it should be present. Check first:

```bash
node -v
npm -v
```

If missing, install Node 20 LTS (or match whatever Questiz uses — run `node -v` under Questiz's build command first to see what version works there):

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Make sure Redis and Postgres are running:

```bash
sudo systemctl status redis-server
sudo systemctl status postgresql
```

---

## 5. Create The App Directory And Pull The Code

```bash
sudo mkdir -p /srv/calmcompass
sudo chown -R $USER:$USER /srv/calmcompass
cd /srv/calmcompass
git clone https://github.com/nafew0/Calm-Compass.git app
cd /srv/calmcompass/app
git checkout main
```

Verify you are in the right place:

```bash
pwd        # should print /srv/calmcompass/app
ls         # should show backend/ frontend/ and the .md files
```

---

## 6. Create A Dedicated Postgres Database And User

This is a **new** database. Do not reuse the Questiz database or user.

```bash
sudo -u postgres psql
```

Inside `psql`:

```sql
CREATE USER calmcompass_user WITH PASSWORD 'CHANGE_ME_STRONG_PASSWORD';
CREATE DATABASE calmcompass_db OWNER calmcompass_user;
GRANT ALL PRIVILEGES ON DATABASE calmcompass_db TO calmcompass_user;
ALTER USER calmcompass_user CREATEDB;   -- needed for running tests, optional
\q
```

Pick a real password. Save it — you will put it in the backend `.env` in a moment.

Quick connectivity test:

```bash
PGPASSWORD='CHANGE_ME_STRONG_PASSWORD' psql -U calmcompass_user -h 127.0.0.1 -d calmcompass_db -c '\conninfo'
```

---

## 7. Backend — Python Virtualenv And Dependencies

```bash
cd /srv/calmcompass/app/backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn uvicorn
```

`uvicorn` is only needed if you later decide to serve ASGI (Channels/WebSockets) behind Gunicorn. It does not hurt to install it now.

Leave the venv active for the next step.

---

## 8. Backend `.env` For Production

Create `/srv/calmcompass/app/backend/.env`:

```bash
nano /srv/calmcompass/app/backend/.env
```

Paste and edit the following. Every value with `CHANGE_ME` or `yourdomain` must be replaced.

```ini
# --- Django ---
DJANGO_SECRET_KEY=CHANGE_ME_LONG_RANDOM_STRING
DEBUG=False
ENVIRONMENT=production

# --- Public URLs ---
# Use whatever domain/subdomain Calm Compass will live at.
# Must NOT overlap with Questiz's domain.
APP_ORIGIN=https://calmcompass.yourdomain.com
API_ORIGIN=https://calmcompass.yourdomain.com
PUBLIC_APP_URL=https://calmcompass.yourdomain.com
API_BASE_URL=https://calmcompass.yourdomain.com/api
ALLOWED_HOSTS=calmcompass.yourdomain.com
CORS_ALLOWED_ORIGINS=https://calmcompass.yourdomain.com
CSRF_TRUSTED_ORIGINS=https://calmcompass.yourdomain.com

# --- Database ---
DB_ENGINE=django.db.backends.postgresql
DB_NAME=calmcompass_db
DB_USER=calmcompass_user
DB_PASSWORD=CHANGE_ME_STRONG_PASSWORD
DB_HOST=127.0.0.1
DB_PORT=5432

# --- Redis (NOTE: different DB numbers than Questiz) ---
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# --- Celery (DB 5, isolated from Questiz's DB 2) ---
CELERY_BROKER_URL=redis://127.0.0.1:6379/5
CELERY_RESULT_BACKEND=redis://127.0.0.1:6379/5

# --- Email (fill in real SMTP or leave SMTP vars blank while you test) ---
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.yourprovider.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=postmaster@yourdomain.com
EMAIL_HOST_PASSWORD=CHANGE_ME
DEFAULT_FROM_EMAIL="Calm Compass <no-reply@yourdomain.com>"

# --- Cookies / proxies ---
USE_X_FORWARDED_HOST=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SECURE=True
AUTH_REFRESH_COOKIE_NAME=calm_compass_refresh
AUTH_REFRESH_COOKIE_SECURE=True
AUTH_REFRESH_COOKIE_SAMESITE=Lax

# --- Stripe ---
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# --- bKash ---
BKASH_APP_KEY=
BKASH_APP_SECRET=
BKASH_USERNAME=
BKASH_PASSWORD=
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta
# BKASH_WEBHOOK_TOPIC_ARN=
# BKASH_WEBHOOK_URL=https://calmcompass.yourdomain.com/api/payments/bkash/webhook/
# BKASH_CALLBACK_TRUSTED_IPS=

LOG_LEVEL=INFO
AUDIT_LOG_LEVEL=INFO
```

Important settings-specific notes (pulled from [backend/calm_compass/settings.py](backend/calm_compass/settings.py)):

- `IS_PRODUCTION` becomes true because `ENVIRONMENT=production`. When it is true, the settings file **refuses to start** if `DJANGO_SECRET_KEY` is still the default or `DEBUG=True`. So fill both correctly.
- If `.env.production` exists in the backend, it will be loaded with override priority. You usually only need `.env` — do not also create `.env.production` unless you plan to use it.
- The Channels `CHANNEL_LAYERS` config reads `REDIS_HOST` only (no DB index). If you want Channels on DB 3 specifically, that requires a small code change; for now it shares the default DB but under its own channel name prefix, which is safe as long as no other app here uses Channels on the same Redis. Questiz's existing deployment does not generally share a channel name prefix, but **verify** by checking Questiz's own settings before going live:
  ```bash
  grep -R "CHANNEL_LAYERS\|channels_redis" /srv/questizsurvey/app/backend 2>/dev/null
  ```
  If you see evidence Questiz uses Channels on the same Redis, tell me and we will scope `CHANNEL_LAYERS` to DB 3 using a `hosts` dict instead of a tuple.

Lock the file down:

```bash
chmod 600 /srv/calmcompass/app/backend/.env
```

---

## 9. Run Migrations, Create Admin, Collect Static

Still inside the backend venv:

```bash
cd /srv/calmcompass/app/backend
source venv/bin/activate

python manage.py check --deploy
python manage.py migrate
python manage.py createsuperuser
python manage.py collectstatic --noinput
```

`migrate` seeds the Behavior Decoder knowledge base automatically (data migration `knowledgebase.0004_seed_behaviors`). It is idempotent, so re-running `migrate` on every deploy is safe and will pick up fixture updates in `backend/knowledgebase/data/behaviors.json`.

`check --deploy` should print a short list of warnings (HSTS, etc.) that are fine since Nginx handles TLS. If it **raises an error**, stop and fix before continuing.

---

## 10. Frontend `.env` And Build

```bash
cd /srv/calmcompass/app/frontend
nano .env
```

Contents:

```ini
VITE_API_URL=https://calmcompass.yourdomain.com/api
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

Install and build:

```bash
npm ci
npm run build
```

This produces `/srv/calmcompass/app/frontend/dist/`, which Nginx will serve.

If `npm ci` fails (e.g., lockfile mismatch), fall back to:

```bash
npm install
npm run build
```

---

## 11. Create Runtime Directories

These are the only Calm-Compass-only directories outside `/srv/calmcompass`.

### Who runs what (user model)

Everything in this guide runs as the **`buet`** user — the same user you SSH in as, and the same user that already owns `/srv/calmcompass/app` from the `git clone`. That means:

- Gunicorn, Celery worker, and Celery beat all run as `buet:buet`.
- You will `git pull` and `npm run build` as `buet` with no chown dance afterwards.
- Nginx still runs as `www-data` (the system default) and reaches Gunicorn through a unix socket that is group-owned by `www-data` — see section 12.
- Nginx reads the static files under `/srv/calmcompass/app/...` using the default world-readable permissions that `git clone` and `npm run build` produce (dirs `755`, files `644`). No special ACLs needed.

### Log directory (persistent)

```bash
sudo mkdir -p /var/log/calmcompass
sudo chown buet:buet /var/log/calmcompass
sudo chmod 0755 /var/log/calmcompass
```

### Runtime directory (`/run` is tmpfs — wiped on every reboot)

Because `/run` is a RAM disk, anything you `mkdir` there manually disappears on the next reboot. The clean way to have `/run/calmcompass/` auto-recreated at boot is a `tmpfiles.d` rule:

```bash
sudo tee /etc/tmpfiles.d/calmcompass.conf >/dev/null <<'EOF'
d /run/calmcompass 0755 buet buet -
EOF

# Create it right now, without waiting for a reboot:
sudo systemd-tmpfiles --create
ls -ld /run/calmcompass   # should show:  drwxr-xr-x  buet buet
```

That's it — no `chown` of `/srv/calmcompass/app` is needed, because `buet` already owns every file in there from the `git clone`.

---

## 12. Gunicorn Systemd Service (isolated from Questiz)

Create the socket unit:

```bash
sudo nano /etc/systemd/system/calmcompass-gunicorn.socket
```

```ini
[Unit]
Description=Calm Compass Gunicorn socket

[Socket]
ListenStream=/run/calmcompass/gunicorn.sock
# Socket file is owned by buet (so Gunicorn-as-buet can create it)
# but group-owned by www-data so Nginx (which runs as www-data) can connect.
SocketUser=buet
SocketGroup=www-data
SocketMode=0660

[Install]
WantedBy=sockets.target
```

Create the service unit:

```bash
sudo nano /etc/systemd/system/calmcompass-gunicorn.service
```

```ini
[Unit]
Description=Calm Compass Gunicorn (Django WSGI)
Requires=calmcompass-gunicorn.socket
After=network.target calmcompass-gunicorn.socket

[Service]
Type=notify
User=buet
Group=buet
WorkingDirectory=/srv/calmcompass/app/backend
EnvironmentFile=/srv/calmcompass/app/backend/.env
ExecStart=/srv/calmcompass/app/backend/venv/bin/gunicorn \
          --access-logfile /var/log/calmcompass/gunicorn-access.log \
          --error-logfile /var/log/calmcompass/gunicorn-error.log \
          --workers 3 \
          --bind unix:/run/calmcompass/gunicorn.sock \
          calm_compass.wsgi:application
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

No `chown` step is needed here — `buet` already owns `/srv/calmcompass/app` from the `git clone` earlier. Verify if you want:

```bash
ls -ld /srv/calmcompass/app /srv/calmcompass/app/backend /srv/calmcompass/app/backend/venv
# each line should start with "drwxr-xr-x ... buet buet ..."
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now calmcompass-gunicorn.socket
sudo systemctl enable --now calmcompass-gunicorn.service
sudo systemctl status calmcompass-gunicorn.service
```

If it failed, read:

```bash
sudo journalctl -u calmcompass-gunicorn -n 100 --no-pager
```

---

## 13. Celery Worker + Celery Beat Systemd Services

Calm Compass's [backend/calm_compass/settings.py](backend/calm_compass/settings.py) defines a `CELERY_BEAT_SCHEDULE` for subscription maintenance, so you need **both** a worker and a beat process.

Worker unit:

```bash
sudo nano /etc/systemd/system/calmcompass-celery.service
```

```ini
[Unit]
Description=Calm Compass Celery Worker
After=network.target redis-server.service postgresql.service

[Service]
Type=simple
User=buet
Group=buet
WorkingDirectory=/srv/calmcompass/app/backend
EnvironmentFile=/srv/calmcompass/app/backend/.env
ExecStart=/srv/calmcompass/app/backend/venv/bin/celery \
          -A calm_compass worker \
          --hostname=calmcompass-worker@%%h \
          --loglevel=INFO \
          --logfile=/var/log/calmcompass/celery-worker.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The `--hostname=calmcompass-worker@%%h` keeps this worker's node name distinct from any Questiz Celery worker on the same Redis.

Beat unit:

```bash
sudo nano /etc/systemd/system/calmcompass-celery-beat.service
```

```ini
[Unit]
Description=Calm Compass Celery Beat
After=network.target redis-server.service postgresql.service

[Service]
Type=simple
User=buet
Group=buet
WorkingDirectory=/srv/calmcompass/app/backend
EnvironmentFile=/srv/calmcompass/app/backend/.env
ExecStart=/srv/calmcompass/app/backend/venv/bin/celery \
          -A calm_compass beat \
          --loglevel=INFO \
          --pidfile=/run/calmcompass/celerybeat.pid \
          --schedule=/var/log/calmcompass/celerybeat-schedule \
          --logfile=/var/log/calmcompass/celery-beat.log
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now calmcompass-celery.service
sudo systemctl enable --now calmcompass-celery-beat.service
sudo systemctl status calmcompass-celery.service
sudo systemctl status calmcompass-celery-beat.service
```

---

## 14. Nginx Site — Phase 1 (HTTP-only, so certbot can do its work)

This is split into two phases to avoid the classic chicken-and-egg problem: a full HTTPS config references cert files that don't exist until certbot runs, but certbot needs a working HTTP site that serves its challenge file. Phase 1 is HTTP-only; phase 2 (section 16) is the full HTTPS config.

Create a **brand new** site file. Do not touch `/etc/nginx/sites-available/questiz` or any other existing site.

```bash
sudo nano /etc/nginx/sites-available/calmcompass
```

Paste **only** this minimal HTTP block for now:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name calmcompass.zai.bd;

    # certbot writes its challenge file here.
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Until we have a cert, just show a plain message at /.
    # This also confirms Nginx is serving this site at all.
    location / {
        default_type text/plain;
        return 200 "calmcompass bootstrap — certificate pending\n";
    }
}
```

Make sure `/var/www/html` exists (it does on a default Ubuntu Nginx install, but verify):

```bash
sudo mkdir -p /var/www/html
```

Enable the site, test config, reload:

```bash
sudo ln -s /etc/nginx/sites-available/calmcompass /etc/nginx/sites-enabled/calmcompass
sudo nginx -t
sudo systemctl reload nginx
```

If `nginx -t` fails, **do not reload**. Fix the error first — an unreloaded config keeps Questiz safe. (A harmless unrelated warning from `/etc/nginx/sites-enabled/questiz*` about "protocol options redefined" is an existing Questiz-side issue; ignore it.)

Quick sanity check from your local machine (or any other computer):

```bash
curl -I http://calmcompass.zai.bd/
# Expect: HTTP/1.1 200 OK  and Server: nginx/...
```

If that fails, DNS for `calmcompass.zai.bd` may not be pointing at this server yet. Fix DNS before moving on — certbot will also fail if DNS isn't resolving.

---

## 15. TLS Certificate (Let's Encrypt)

Now that Nginx is serving the domain over plain HTTP, get the cert. Use **webroot mode** so certbot only writes the cert files and does **not** try to rewrite your Nginx config — we'll write the full HTTPS config ourselves in section 16.

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot certonly --webroot \
  -w /var/www/html \
  -d calmcompass.zai.bd \
  --agree-tos \
  --no-eff-email \
  -m YOUR_REAL_EMAIL@example.com
```

Replace `YOUR_REAL_EMAIL@example.com` with a real address — Let's Encrypt uses it for expiry warnings.

On success you should see:

```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/calmcompass.zai.bd/fullchain.pem
Key is saved at:         /etc/letsencrypt/live/calmcompass.zai.bd/privkey.pem
```

Verify:

```bash
sudo ls /etc/letsencrypt/live/calmcompass.zai.bd/
# should show: cert.pem  chain.pem  fullchain.pem  privkey.pem  README
```

Certbot's systemd timer (already running on this server because of Questiz) will auto-renew this cert going forward. Nothing else to configure for renewal.

---

## 16. Nginx Site — Phase 2 (full HTTPS config)

Now that the cert files exist, replace the bootstrap site file with the full production config.

```bash
sudo nano /etc/nginx/sites-available/calmcompass
```

Delete everything and paste:

```nginx
upstream calmcompass_gunicorn {
    server unix:/run/calmcompass/gunicorn.sock;
}

# HTTP: serve ACME challenges, redirect everything else to HTTPS.
server {
    listen 80;
    listen [::]:80;
    server_name calmcompass.zai.bd;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS: the real site.
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name calmcompass.zai.bd;

    ssl_certificate     /etc/letsencrypt/live/calmcompass.zai.bd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/calmcompass.zai.bd/privkey.pem;

    client_max_body_size 25M;

    access_log /var/log/calmcompass/nginx-access.log;
    error_log  /var/log/calmcompass/nginx-error.log;

    # Frontend static build
    root /srv/calmcompass/app/frontend/dist;
    index index.html;

    # Django static files
    location /static/ {
        alias /srv/calmcompass/app/backend/staticfiles/;
        access_log off;
        expires 30d;
    }

    # Django media (user uploads)
    location /media/ {
        alias /srv/calmcompass/app/backend/media/;
        access_log off;
        expires 30d;
    }

    # Django API + admin
    location ~ ^/(api|admin)/ {
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;
        proxy_redirect off;
        proxy_pass http://calmcompass_gunicorn;
    }

    # React SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

> Note: this uses the legacy `listen 443 ssl http2;` form because it works on every Nginx version. Nginx 1.25.1+ also accepts a standalone `http2 on;` directive, but older versions (including what's on this server) reject it with `unknown directive "http2"`. The "protocol options redefined for [::]:443" warning you may see in `nginx -t` is a harmless side effect of both this site and Questiz's site using the same legacy form — it's a warning, not an error, and Nginx still loads cleanly.

Test and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

If this fails with a cert-file error again, you did not actually get the cert in section 15 — re-run certbot and make sure it says "Successfully received certificate" before coming back here.

Quick sanity check:

```bash
curl -I https://calmcompass.zai.bd/
# Expect: HTTP/2 200  and a valid TLS handshake
```

---

## 17. Wire Up Stripe And bKash Webhooks

Both providers need to reach the new domain.

- **Stripe dashboard** → Developers → Webhooks → Add endpoint
  `https://calmcompass.yourdomain.com/api/payments/stripe/webhook/` (or whatever the project actually exposes — grep for `stripe` under [backend/subscriptions/](backend/subscriptions/) to confirm the route).
  Copy the signing secret into `STRIPE_WEBHOOK_SECRET` in the backend `.env` and restart Gunicorn.

- **bKash** → confirm with bKash which IPs hit your server, fill them into `BKASH_CALLBACK_TRUSTED_IPS`, and set `BKASH_WEBHOOK_URL` to the public URL.

After changing `.env`:

```bash
sudo systemctl restart calmcompass-gunicorn
sudo systemctl restart calmcompass-celery
sudo systemctl restart calmcompass-celery-beat
```

---

## 18. First-Time Smoke Test

From a browser:

- `https://calmcompass.yourdomain.com/` — loads the React app.
- `https://calmcompass.yourdomain.com/api/` — returns a DRF 401 or a route listing, **not** a 502 and **not** the Questiz site.
- `https://calmcompass.yourdomain.com/admin/` — Django admin login page with Calm Compass styling.
- Register a test account → confirm it can log in.
- Trigger one protected API route from the SPA → confirm it returns real data.
- Open `https://questiz.yourdomain.com/` (or whatever Questiz's real URL is) and make sure **it still works unchanged**. This is the single most important check on a shared server.

Log tails while you test:

```bash
sudo journalctl -u calmcompass-gunicorn -f
sudo tail -f /var/log/calmcompass/gunicorn-error.log
sudo tail -f /var/log/calmcompass/celery-worker.log
```

---

## 19. Future Updates (after the first deploy)

Once the app is live, the normal update flow is:

```bash
# On your local machine
cd "/Users/nafew/Documents/Web Projects/Calm Compass"
git add <files>
git commit -m "..."
git push origin main
```

```bash
# On the server
cd /srv/calmcompass/app
git pull origin main

cd /srv/calmcompass/app/backend
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
python manage.py check

cd /srv/calmcompass/app/frontend
npm ci
npm run build

sudo systemctl restart calmcompass-gunicorn
sudo systemctl restart calmcompass-celery
sudo systemctl restart calmcompass-celery-beat
sudo nginx -t && sudo systemctl reload nginx
```

Always back up the DB before a migration:

```bash
pg_dump -U calmcompass_user -h 127.0.0.1 calmcompass_db > ~/calmcompass_backup_$(date +%F_%H%M).sql
```

---

## 20. Common Problems (shared-server edition)

### 502 Bad Gateway on calmcompass.yourdomain.com, but Questiz still works
Gunicorn failed to start or the socket path doesn't match.
```bash
sudo systemctl status calmcompass-gunicorn
sudo journalctl -u calmcompass-gunicorn -n 100 --no-pager
ls -l /run/calmcompass/
```
Common causes: wrong `WorkingDirectory`, venv path typo, or `.env` refused because `DEBUG=True`.

### Static files 404 on the new domain
You forgot `collectstatic` or the Nginx `alias` path does not match `STATIC_ROOT`.
```bash
cd /srv/calmcompass/app/backend && source venv/bin/activate && python manage.py collectstatic --noinput
ls /srv/calmcompass/app/backend/staticfiles | head
```

### Celery tasks never run
Either the worker is down, or the broker URL points at the wrong Redis DB.
```bash
sudo systemctl status calmcompass-celery
redis-cli -n 5 KEYS '*'   # should show some celery queue keys once a task fires
```

### Calm Compass and Questiz are fighting over Redis
Double-check that no two apps use the same DB number. Questiz uses `0/1/2`; Calm Compass uses `3/4/5`. If you see cross-talk in `redis-cli MONITOR`, fix the `.env` of whichever app has the wrong number and restart its services.

### Questiz suddenly broke after a deploy
Revert whatever **shared** thing you touched. Almost always this is `/etc/nginx/nginx.conf`, `/etc/nginx/sites-enabled/`, or Postgres/Redis system config. Calm-Compass-only files in `/srv/calmcompass/`, `/etc/systemd/system/calmcompass-*`, `/var/log/calmcompass/`, and `/run/calmcompass/` cannot break Questiz — so if Questiz broke, the cause is in shared config.
```bash
sudo nginx -t
sudo systemctl status questiz-gunicorn
sudo journalctl -u questiz-gunicorn -n 100 --no-pager
```

### `python manage.py check --deploy` errors about `DJANGO_SECRET_KEY` or `DEBUG`
Re-read section 8. In production the settings file **raises on boot** if those two are wrong.

### Stripe webhooks return 400
Signing secret does not match. Rotate it in the Stripe dashboard, paste it into `backend/.env`, then `sudo systemctl restart calmcompass-gunicorn`.

---

## 21. What Not To Do (short list)

- Do not run `sudo rm -rf /srv/questiz*` — ever.
- Do not `git init` or `git clone` inside `/srv/questizsurvey/app`.
- Do not reuse Questiz's Postgres user or database.
- Do not reuse Questiz's Redis DB numbers (`0/1/2`).
- Do not give Calm Compass the same Nginx `server_name` as Questiz.
- Do not edit `/etc/nginx/sites-available/questiz` or any `questiz-*.service` file.
- Do not force-push `main` to GitHub while the server is mid-deploy.
- Do not run `npm run build` or `migrate` without first confirming `pwd` starts with `/srv/calmcompass/`.

---

## 22. One-Shot "Looks Good, Deploy" Command Block

Only run this **after** sections 1–17 are done once manually. For subsequent deploys:

```bash
cd /srv/calmcompass/app && \
git pull origin main && \
cd /srv/calmcompass/app/backend && \
source venv/bin/activate && \
pip install -r requirements.txt && \
python manage.py migrate && \
python manage.py collectstatic --noinput && \
python manage.py check && \
cd /srv/calmcompass/app/frontend && \
npm ci && \
npm run build && \
sudo systemctl restart calmcompass-gunicorn && \
sudo systemctl restart calmcompass-celery && \
sudo systemctl restart calmcompass-celery-beat && \
sudo nginx -t && sudo systemctl reload nginx && \
echo "Calm Compass deploy complete."
```

If any line fails, the `&&` chain stops. Read the error, fix it, and re-run from the failing step.
