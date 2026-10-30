# Deploying MOS to the VPS

MOS runs as its own Docker Compose project in `/srv/mos`: `db` (PostgreSQL 17)
and `app` (Spring Boot: dashboard, `/api/admin`, `/api/app`). It publishes no
public port. HTTPS comes from the **SKU-Fashion Caddy container** in
`/srv/sku-fashion`, which serves both sites:

```text
internet ─ 80/443 ─ caddy (sku-fashion project) ─┬─ web:8000   (SKU, its own network)
                                                 └─ mos-app:8080 (MOS, `edge` network)
                                                       └─ db (MOS network only)
```

| File | Where it goes | What it does |
|---|---|---|
| `Dockerfile` | built by `docker compose` | builds the jar with the Maven wrapper (Node is downloaded for the dashboard), runs it on a JRE as uid 10001 |
| `compose.yaml` | `/srv/mos` | `db` + `app`; `app` joins the external `edge` network as `mos-app`; 8035 on 127.0.0.1 only, for debugging on the server |
| `.env.production.example` | copy to `/srv/mos/.env` | database password, JWT secret, the two demo passwords |
| `deploy/Caddyfile.mos` | read by SKU's Caddy | the MOS site: `{$MOS_DOMAIN}` → `mos-app:8080` |
| `deploy/sku-caddy/Caddyfile` | read by SKU's Caddy | new entry file: imports SKU's own Caddyfile, then the MOS site |
| `deploy/sku-caddy/compose.override.yaml` | copy to `/srv/sku-fashion/compose.override.yaml` | mounts the two files above into SKU's Caddy, sets `MOS_DOMAIN=mos.<SKU's SITE_DOMAIN>`, joins `edge` |

SKU's repo and its Caddyfile are not modified. Its certificate volume is kept, so
SKU keeps its certificate; Caddy only requests a new one for the MOS name.

## First deployment

Run as your sudo account on the VPS. Each step is safe to stop after.

1. **Check** (read only): `sudo ss -tlnp`, `sudo docker ps`, `df -h /`, `free -h`.
   80/443 must belong to `sku-fashion-caddy-1`; nothing may hold 8035.
2. **Clone and configure**
   ```bash
   sudo git clone https://github.com/arthur-seav/mos_management.git /srv/mos
   cd /srv/mos
   sudo cp .env.production.example .env && sudo chmod 600 .env
   ```
   Generate the secrets on the server (the variable names are built by
   concatenation so nothing secret-looking is ever typed or pasted):
   ```bash
   sudo python3 - <<'EOF'
   import re, secrets
   p = '/srv/mos/.env'; s = open(p).read()
   for name, n in (('MOS_DB_' + 'PASSWORD', 24), ('MOS_JWT_' + 'SECRET', 48),
                   ('MOS_DEMO_ADMIN_' + 'PASSWORD', 12), ('MOS_DEMO_STAFF_' + 'PASSWORD', 12)):
       s = re.sub(rf'^{name}=.*$', f'{name}={secrets.token_urlsafe(n)}', s, flags=re.M)
   open(p, 'w').write(s); print('updated')
   EOF
   sudo awk -F= '/^MOS_/ {print $1, length($2)}' .env
   sudo docker network create edge
   sudo docker compose config --quiet && echo config ok
   ```
3. **Build, seed, start**
   ```bash
   sudo docker compose build app
   sudo docker compose up -d db
   sudo docker compose run --rm app --mos.demo.seed=true --spring.main.web-application-type=none
   sudo docker compose up -d app
   curl -s http://127.0.0.1:8035/actuator/health
   ```
   The seed prints `MOS demo seed completed` and exits. It refuses a database
   that already has a menu, so running it twice changes nothing. Never put
   `--mos.demo.seed=true` into `compose.yaml`.
4. **Let SKU's Caddy serve MOS**
   ```bash
   cd /srv/sku-fashion
   sudo cp /srv/mos/deploy/sku-caddy/compose.override.yaml .
   sudo docker compose config --quiet && echo config ok
   sudo docker compose up -d caddy
   sudo docker compose logs --tail 40 caddy
   ```
   SKU is unreachable for a few seconds while Caddy is recreated. Wait for
   `certificate obtained successfully` for `mos.<SITE_DOMAIN>`.

Sign in at `https://mos.<SITE_DOMAIN>/` with `admin@mos.test` and the
`MOS_DEMO_ADMIN_PASSWORD` from `/srv/mos/.env`
(`sudo grep '^MOS_DEMO_ADMIN_' /srv/mos/.env`). The Flutter app on your
machine: `flutter run --dart-define=MOS_API_URL=https://mos.<SITE_DOMAIN>`.

## Updating

```bash
cd /srv/mos && sudo git pull && sudo docker compose up -d --build app
```

Database changes come from Flyway migrations at startup. Edits to the Caddy files
take effect with `cd /srv/sku-fashion && sudo docker compose restart caddy`.

## Teardown (same day as SKU-Fashion, MOS first)

```bash
cd /srv/mos && sudo docker compose down -v --rmi local    # deletes MOS data
cd /srv/sku-fashion && sudo rm compose.override.yaml && sudo docker compose up -d caddy
sudo docker network rm edge && sudo rm -rf /srv/mos
```

Then tear down SKU-Fashion as its own plan says.

## Known limits

- Payments are simulated (KHQR succeeds after ~5 s). Anyone with the URL can
  register as a customer and place orders.
- `sslip.io` is not on the Public Suffix List, so Let's Encrypt's weekly quota is
  shared by all its users; SKU's Caddyfile sets `email`, so Caddy falls back to
  ZeroSSL.
- If SKU's Caddy is down, both sites are down. If MOS is down, Caddy answers 502
  for MOS only.
