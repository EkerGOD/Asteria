# Local Development Infrastructure

This directory holds development-only infrastructure for Asteria / 星识.

## PostgreSQL + pgvector

Start the local database from the repository root:

```bash
docker compose up -d db
```

The `db` service uses the `pgvector/pgvector:pg16` image and initializes the MVP
development database with the `vector` extension.

Required environment variables are documented in the root `.env.example`:

- `ASTERIA_POSTGRES_USER`
- `ASTERIA_POSTGRES_PASSWORD`
- `ASTERIA_POSTGRES_DB`
- `ASTERIA_POSTGRES_PORT`
- `ASTERIA_API_DATABASE_URL`

For the default Docker Compose database, `apps/api` should use:

```text
postgresql+psycopg://asteria:asteria@127.0.0.1:5432/asteria
```

The init script runs only when PostgreSQL creates a fresh data volume. Future
Alembic migrations remain responsible for declaring required database extensions
for application schema setup.
