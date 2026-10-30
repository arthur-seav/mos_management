# MOS: back end and store dashboard

Spring Boot API and React store dashboard for the MOS coffee-shop coursework (SV34 Mobile Application II, SA 2.0). Staff handle online and walk-in orders; admins also manage the menu, options, accounts, reports and store settings. The same back end exposes `/api/app` for the separate Flutter customer app.

**Scope:** the dashboard calls the real API. The Flutter customer app (`arthur-seav/mos_flutter`, branch `feature/api-integration`) calls `/api/app` by default; orders placed in the app appear in the dashboard queue and status changes made there reach the app. Payments and password recovery are demonstrations, not production integrations.

## Requirements

- JDK 25, Docker Engine and Python 3 (configuration helper / HTTP smoke test).
- PostgreSQL 17. The command below runs it in Docker.
- Maven and Node do not need separate installations: the Maven wrapper and frontend-maven-plugin use the pinned versions. The first build needs network access to download tools and dependencies.

Backend: Spring Boot 4.1.2, Spring Data JPA, Flyway, Spring Security JWT, Apache POI 5.5.1 and Google libphonenumber. Frontend: React 19.2, TypeScript 5.9, Vite 7, Tailwind 4, shadcn/Base UI, TanStack Query/Table, React Hook Form/Zod, Recharts and Sonner. Exact pins are in `pom.xml` and `frontend/package-lock.json`.

## First local run

Run these commands from this repository's root. They create a new database, not an existing production database.

```bash
# Generates matching database credentials, a JWT signing secret and demo passwords.
# Creates mode-0600 files and refuses to overwrite either existing file.
python3 scripts/configure-local.py

docker run -d --name mos_management_db --restart unless-stopped \
  --env-file .postgres.env \
  -p 127.0.0.1:54322:5432 \
  -v mos_management_pgdata:/var/lib/postgresql/data postgres:17

# Builds React into the executable jar and runs the Java tests.
./mvnw -B package

# FIRST startup only, against an empty database:
java -jar target/dashboard-0.0.1-SNAPSHOT.jar --mos.demo.seed=true
```

Open <http://localhost:8080>. Demo users use fictional names:

| Role | Sign-in email | Name |
|---|---|---|
| Admin | `admin@mos.test` | Vanna Chea |
| Staff | `staff@mos.test` | Sophea Lim |

Open your private `.env` locally to obtain the generated passwords (`MOS_DEMO_ADMIN_PASSWORD` / `MOS_DEMO_STAFF_PASSWORD`). They are never printed by the helper or seed. Do not commit or paste either private environment file.

The opt-in seed calls the normal account/menu/option services. It creates 4 categories, 18 drinks (one inactive), 6 option groups and 21 options, with the Flutter mock's names, prices and defaults. It creates no fabricated sales history. It works on a database that has **no menu yet**: each demo account is created only if its email is missing (an existing account and its password are left alone, so only the missing account's password variable is needed). A database that already has a menu is refused unchanged. Normal startup does **not** seed accounts or menu data:

```bash
java -jar target/dashboard-0.0.1-SNAPSHOT.jar
# Optional different HTTP port:
java -jar target/dashboard-0.0.1-SNAPSHOT.jar --server.port=8092
```

If you already have `.env`, keep it. Set the required variables using `.env.example` as a reference and prepare a matching database yourself rather than running the configuration helper. Changing an env file does not reset the password of an existing PostgreSQL volume or an already seeded user.

### Schema and seed as SQL files

`database/schema.sql` (the 14 tables) and `database/seed.sql` (demo menu, options, per-drink prices, store settings and opening hours; **no user accounts**, so no password hashes in git) are generated from Flyway V1 plus the demo seed. Flyway stays the source of truth: the app builds its own schema, so you only need these files to read the design, hand it in, or load a database by hand:

```bash
psql -v ON_ERROR_STOP=1 -d <empty database> -f database/schema.sql
psql -v ON_ERROR_STOP=1 -d <same database> -f database/seed.sql
```

They use plain `INSERT`s (pgAdmin's Query Tool can run them) and avoid PostgreSQL-17-only statements. A database loaded this way has no Flyway history, so point the app at a Flyway-built database instead. Regenerate after changing a migration or `demo/menu.json` (needs Docker and `./mvnw package`): `python3 scripts/export-sql.py`. The script builds a throwaway database, dumps it, re-imports both files as a non-superuser to prove they load, then drops everything it created.

**Product photos.** The 18 demo drinks have photos in `src/main/resources/demo/images/` (one JPEG per drink, about 100 KB, 800 px wide, made from the originals in `SV34/.../MOS/database/images/`). They ship inside the jar and are served at `/demo-images/<drink>.jpg`; the seed (both `--mos.demo.seed=true` and `database/seed.sql`) stores that path as the drink's `image_url`, so the dashboard and the Flutter app show the same picture. A photo uploaded in the dashboard's product page replaces it with an `/uploads/...` file. To change a demo photo, replace the JPEG with the same name (keep it small: 800 px, quality ~80) and re-run `scripts/export-sql.py`.

### Configuration

Spring imports `.env` from the **current working directory**; real process environment variables take precedence. Start the jar from the repository root, or supply the variables through your service manager.

| Variable / property | Purpose |
|---|---|
| `MOS_DB_URL` | PostgreSQL JDBC URL; local default `jdbc:postgresql://127.0.0.1:54322/mos` |
| `MOS_DB_USER` / `MOS_DB_PASSWORD` | Database credentials |
| `MOS_JWT_SECRET` | HS256 signing secret, at least 32 characters |
| `MOS_DEMO_ADMIN_PASSWORD` / `MOS_DEMO_STAFF_PASSWORD` | Seed-only initial passwords, at least 8 characters |
| `--mos.demo.seed=true` | Explicit fresh-database bootstrap; omit after the first run |
| `--mos.store.zone=Asia/Phnom_Penh` | Store timezone, default shown |
| `--mos.upload-dir=uploads` | Product-image directory, relative to the working directory by default |

Keep the database volume and upload directory when moving an installation. Flyway manages the 14 application tables; Hibernate validates the schema and does not recreate it. The JVM uses UTC for stored timestamps, with opening hours interpreted in the store timezone. Sign-in JWT lifetime defaults to 12 hours.

## Development and tests

```bash
# Back-end tests, including real PostgreSQL Testcontainers (Docker must be running).
./mvnw -B test

# Front-end tests and type checking, using the Node installed by Maven:
export PATH="$PWD/frontend/node:$PATH"
npm --prefix frontend run check-types
npm --prefix frontend test

# Local-tool safety tests (Python standard library only):
python3 scripts/test_local_tools.py

# Vite dev server; /api, /uploads and /demo-images are proxied to localhost:8080.
npm --prefix frontend run dev
```

`package` builds/types-checks the frontend and runs the Java tests. It does **not** run Vitest; use the explicit frontend test command as well. To skip frontend rebuilding for a Java-only test run after the first successful build:

```bash
./mvnw -B -Dskip.installnodenpm -Dskip.npm test
```

### Destructive HTTP smoke test (disposable local database only)

`scripts/smoke.py` exercises actual HTTP, with no mocked API responses: staff/admin sign-in, server-priced $9.20 walk-in order, queue advancement, customer sign-up, simulated KHQR, rejection/refund, reports/Excel, ordering pause and role/deactivation guards. It assumes a **freshly seeded** database with no sales and the default store open at the time of execution. It is not safe to run against a database you want to keep and is not idempotent.

Start a separate seeded instance on port 8092, using its own database. In a second terminal, supply its seed passwords without placing them in shell history:

```bash
read -r -s -p 'Disposable admin password: ' MOS_SMOKE_ADMIN_PASSWORD; printf '\n'
read -r -s -p 'Disposable staff password: ' MOS_SMOKE_STAFF_PASSWORD; printf '\n'
export MOS_SMOKE_ADMIN_PASSWORD MOS_SMOKE_STAFF_PASSWORD
python3 scripts/smoke.py --base-url http://127.0.0.1:8092 --allow-writes
unset MOS_SMOKE_ADMIN_PASSWORD MOS_SMOKE_STAFF_PASSWORD
```

Only `localhost` and `127.0.0.1` are accepted. Optional `--sessions <path>` writes private JWT sessions with mode 0600; do not commit that file. See [VERIFICATION.md](VERIFICATION.md) for the executed acceptance checks.

## Structure

```text
src/main/java/mos/management/dashboard/
  config/          Security, JWT, timezone, opt-in demo bootstrap
  entity/          JPA entities and domain state rules
  repository/      Spring Data repositories
  service/         Auth, menu/pricing, orders/payments, store, accounts, reports
  dto/             Request/response records (API source of truth)
  web/             Thin app/admin REST controllers and SPA forwarding
src/main/resources/
  db/migration/    Flyway schema and initial store settings
  demo/            Shared demo menu catalogue
frontend/src/
  lib/             Typed API client/DTOs, session and formatting
  components/      Shared UI plus feature-specific controls and pure rules
  pages/           Dashboard screens
  config/          Role-aware navigation
  test/            Rendering, fetch and browser-event test helpers
scripts/           Local configuration and real HTTP smoke test
```

The dashboard polls the queue every 3 seconds and plays a notification sound for newly placed orders (the browser may require a user gesture before audio is available). The backend checks stale pending-payment orders every minute and marks unpaid orders older than 30 minutes abandoned. Ready orders beyond their pickup grace period are highlighted for staff; completion remains manual.

## API and permissions

[API.md](API.md) lists endpoints, authentication, request examples and integration rules. Staff can operate orders/payments, switch sold-out state and pause online ordering. Admin-only API methods separately enforce menu/option editing, account management, sales reports and store-setting writes. Hiding a menu item is not the security boundary. Customers can only access their own orders, payments and cards.

AdminCN's MIT component notice is preserved in `frontend/src/components/ui/LICENSE-AdminCN.md`. Its page layout is the reference; colours and bundled Fraunces / DM Sans fonts follow SA 4.1.

## Demonstration limits and deviations from SA 2.0

- **No live banking:** `SimulatedPaymentGateway` is the only implementation, regardless of `MOS_DEMO`. KHQR succeeds after roughly 5 seconds when polled and expires after 5 minutes. Cards ending in `0002` are declined. Never scan/pay the demo payload or submit real card data. Refund marking records a staff action; it does not transfer money.
- **Password recovery is demo-only:** phone matching issues a reset ticket without SMS/OTP or verified delivery. It is unsafe for an Internet-facing account system. Real recovery, rate limiting and a payment-provider integration are required before production use.
- **Flutter integration:** done for the Flutter web build and the API (see VERIFICATION.md, "Cross-end with the Flutter app"). Not yet run on an Android emulator or phone by Hermes (no Android SDK on that machine): the emulator uses `http://10.0.2.2:8080`, a phone `--dart-define=MOS_API_URL=http://<LAN IP>:8080`. Cross-origin calls to `/api/app/**` are allowed from `localhost`/`127.0.0.1` only (`MOS_CORS_APP_ORIGINS` to add a hosted Flutter web origin).
- **BR-07:** backend default scheduled lead time is 30 minutes. The settings accept 0–240 and warn below 30; the Flutter mock currently uses 5. Whether to enforce a hard 30-minute minimum or retain an intentional deviation needs Arthur's decision. Current seed stays at 30.
- **BR-10 / FR-33:** cancelling/rejecting a paid order automatically marks `refund_pending`; staff mark the actual refund `refunded` afterward.
- **BR-12:** overdue Ready orders are highlighted, never automatically completed.
- **Logout:** the client discards its stateless token; it is not server-revoked on logout. Account deactivation is checked on every authenticated request and immediately blocks existing tokens.
- No push/email/SMS delivery, live deployment or production security approval has been completed.

### Data-dictionary additions / interpretations to confirm

`option_groups.sort_order`, `needs_iced_drink`, `summary_noun`; `options.is_iced`; `store_settings.asap_prep_min`; `saved_cards.holder_name`; `payments.failure_reason`. These support existing Flutter behaviour but need to be added to the SA dictionary if accepted.

`product_options` also declares which options are offered by each drink: absent means unavailable; a null price override inherits the option's price. Order option-name snapshots contain the unambiguous customer-facing label (for example `Less ice`). Pickup codes use `A` plus the unique order ID, padded to at least 3 digits, rather than restarting daily.
