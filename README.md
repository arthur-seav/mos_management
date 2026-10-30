# MOS — back end and store dashboard

Spring Boot back end for the MOS (Mobile Ordering System) coffee shop
(SA 2.0, SV34 Mobile Application II). It serves:

- the **store dashboard** for staff and admins (React, in `frontend/`), and
- the **REST API** for the Flutter customer app (`arthur-seav/mos_flutter`).

The full README (API, demo accounts, deviations from SA) is written in the
last build step.

## Run it

Requirements: JDK 25 and Docker. Node is downloaded by Maven.

```bash
# 1. PostgreSQL 17 on 127.0.0.1:54322
docker run -d --name mos_management_db --restart unless-stopped \
  -e POSTGRES_DB=mos -e POSTGRES_USER=mos -e POSTGRES_PASSWORD=change-me \
  -p 127.0.0.1:54322:5432 -v mos_management_pgdata:/var/lib/postgresql/data postgres:17

# 2. Local settings
cp .env.example .env      # then set MOS_DB_PASSWORD and MOS_JWT_SECRET

# 3. Build the dashboard and start everything on http://localhost:8080
./mvnw spring-boot:run
```

Tests use Testcontainers (a throwaway PostgreSQL in Docker):

```bash
./mvnw test                                      # back end
cd frontend && npm install && npm test           # dashboard
```
