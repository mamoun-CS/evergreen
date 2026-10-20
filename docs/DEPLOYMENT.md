# Evergreen VPS deployment

## Runtime and environment

Run the Next.js application on a single Linux VPS with Node.js, PostgreSQL, Nginx, and PM2. Keep the production environment file outside the repository at `/etc/evergreen/evergreen.env`; restrict it to the service account (`chmod 600`). Configure at least:

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL URL reachable only from the application host/network. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Initial setup | Initial owner account credentials. Replace/remove bootstrap credentials after provisioning. |
| `ADMIN_SESSION_SECRET` | Yes | Strong unique random secret; do not reuse between environments. |
| `PAYMENT_RECONCILIATION_SECRET` | Yes | Strong unique scheduler secret, different from all other secrets. |
| `NEXT_PUBLIC_APP_URL` | Yes | Public HTTPS origin used for links and payment callbacks. |
| `NEXT_PUBLIC_SITE_URL` | Recommended | Canonical public site origin. |
| `UPLOAD_DIR` | Yes | Persistent local directory, default `/var/www/evergreen/uploads`; keep outside the repo and `.next`. |
| `TRUSTED_IP_HEADER` | Behind Nginx | Set to `x-forwarded-for`. This is safe only when Nginx overwrites the header and the app port is not publicly reachable. |
| `LAHZA_SECRET_KEY` | Card payments | Merchant secret, server-side only. |
| `LAHZA_CALLBACK_URL` | Card payments | Absolute HTTPS callback URL; defaults to `/payment/lahza/callback` under `NEXT_PUBLIC_APP_URL`. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Email | SMTP transport and sender configuration. |

Uploaded images are decoded and re-encoded as WebP with `sharp`, removing source metadata. Their database URLs are relative paths such as `/uploads/products/<uuid>.webp`. `next.config.mjs` uses unoptimized images, so local disk paths and optional remote pasted HTTPS URLs do not require a broad Next image host allow-list.

## Install and deploy

Create `/var/www/evergreen/app`, clone the repository there, create `/var/www/evergreen/uploads`, and grant the service account write permission to the upload directory. Install PM2 globally and copy `deploy/nginx.conf.example` to an Nginx site file after replacing the example domain and certificate paths. Obtain certificates with Certbot.

Copy `deploy/ecosystem.config.cjs` and `deploy/deploy.sh` with the repository. Run deploys as the application account with `APP_DIR=/var/www/evergreen/app deploy/deploy.sh`. The script uses `npm ci`, Prisma generate, `prisma migrate deploy`, builds the app, and reloads PM2. It never uses `db push` or `migrate dev` in production.

Nginx serves `/uploads/` directly from `/var/www/evergreen/uploads/` with 30-day immutable caching. Next.js production does not serve files added to `public/` after build. If Nginx is unavailable in development or another environment, `/uploads/[...path]` streams from `UPLOAD_DIR` after validating the path remains inside the configured root and sets content type, `nosniff`, and cache headers.

## Backups and scheduled jobs

`deploy/backup.sh` runs `pg_dump` and archives the upload directory, retaining the last 14 days. It expects the env file to be shell-compatible key/value assignments; do not source files containing untrusted shell text. Example cron entry, run as the app account:

```cron
15 2 * * * ENV_FILE=/etc/evergreen/evergreen.env UPLOAD_DIR=/var/www/evergreen/uploads BACKUP_DIR=/var/backups/evergreen /var/www/evergreen/app/deploy/backup.sh >> /var/log/evergreen-backup.log 2>&1
```

Configure a cron or systemd timer to call `POST /api/payments/lahza/reconcile-reservations` with `Authorization: Bearer $PAYMENT_RECONCILIATION_SECRET` on a regular schedule. The current codebase has consent-based abandoned-cart tracking and admin recovery campaigns, but no callable scheduled email sender; do not schedule one until that job and its authorization secret are implemented. Keep scheduler secrets outside command-line arguments and logs.

Register this exact public webhook URL in the Lahza dashboard:

```text
https://YOUR_DOMAIN/api/payments/lahza/webhook
```

## Production checklist

- [ ] Set unique, strong `ADMIN_SESSION_SECRET` and `PAYMENT_RECONCILIATION_SECRET` values in the external env file.
- [ ] Set `NODE_ENV=production`, `NEXT_PUBLIC_APP_URL`, and the canonical site URL to HTTPS origins.
- [ ] Use HTTPS only; production session cookies are marked `Secure`.
- [ ] Allow only ports 80, 443, and SSH in the firewall. Bind Next.js to localhost through Nginx.
- [ ] Do not expose PostgreSQL publicly; allow connections only from the app host/network.
- [ ] Set `TRUSTED_IP_HEADER=x-forwarded-for` only when Nginx overwrites it; the sample config sets it from `$remote_addr`.
- [ ] Set `UPLOAD_DIR` to persistent storage outside the repository/build output and ensure the app user can write it.
- [ ] Configure Lahza callback URL and register the webhook URL above.
- [ ] Install and verify the payment reconciliation cron/systemd timer with the secret header.
- [ ] Keep abandoned-cart campaigns manual until a secured scheduled sender is implemented; then configure its secret and verify consent handling.
- [ ] Configure nightly database and upload backups; periodically test restoring both.
- [ ] Apply database changes only through reviewed migrations and `npx prisma migrate deploy`.

## Database migrations

Commit migrations and apply them during deployment with `npx prisma migrate deploy`. Do not run `prisma db push` or `prisma migrate dev` in production.
