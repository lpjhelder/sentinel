# Sentinel Deployment Guide

This directory contains production deployment examples for a single-host Linux setup.

Included files:

- `deploy/.env.production.template`: runtime environment template
- `deploy/sentinel@.service`: example user-level systemd service
- `deploy/nginx/sentinel.conf`: example nginx reverse proxy

## Assumptions

- Node.js 22 or newer
- pnpm 9 or newer
- Linux with `systemd`
- Optional: nginx for TLS termination and reverse proxying

## 1. Build the app

```bash
git clone https://github.com/lpjhelder/sentinel.git
cd sentinel
pnpm install
pnpm run build
```

## 2. Create the runtime env file

```bash
cp deploy/.env.production.template deploy/.env.production
```

Set at minimum:

- `OAUTH_ENCRYPTION_SECRET`
- `INBOX_WEBHOOK_SECRET`
- `API_AUTH_TOKEN` for non-loopback access
- `OAUTH_BASE_URL` if the public URL differs from `http://127.0.0.1:8790`

If you run behind nginx on the same host, keep:

- `HOST=127.0.0.1`
- `PORT=8790`

If you expose the Node server directly on a LAN or VPN, set `HOST=0.0.0.0` and review `ALLOWED_ORIGINS` or `ALLOWED_ORIGIN_SUFFIXES`.

## 3. Install the user service

```bash
mkdir -p ~/.config/systemd/user
cp deploy/sentinel@.service ~/.config/systemd/user/sentinel.service
systemctl --user daemon-reload
systemctl --user enable --now sentinel
```

If you want the service to survive logout:

```bash
sudo loginctl enable-linger "$USER"
```

Useful commands:

```bash
systemctl --user status sentinel
journalctl --user -u sentinel -f
```

## 4. Optional nginx reverse proxy

```bash
sudo cp deploy/nginx/sentinel.conf /etc/nginx/sites-available/sentinel
sudo ln -s /etc/nginx/sites-available/sentinel /etc/nginx/sites-enabled/sentinel
sudo nginx -t
sudo systemctl reload nginx
```

Update `server_name` before enabling the site. If you use Let's Encrypt, install the certificate after the site is reachable.

## 5. Smoke checks

Local health check:

```bash
curl http://127.0.0.1:8790/api/health
```

Authenticated remote check:

```bash
curl -H "Authorization: Bearer YOUR_API_AUTH_TOKEN" https://sentinel.example.com/api/health
```

## 6. Updating

```bash
git pull
pnpm install
pnpm run build
systemctl --user restart sentinel
```

## Notes

- `deploy/.env.production` is a local runtime file and should stay untracked.
- The service example writes logs to `./logs`.
- The template is intentionally conservative. Add provider-specific keys only if you use those integrations.
