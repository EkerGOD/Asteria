# Development Smoke Test

This smoke test verifies the MVP development stack from a clean checkout:

- PostgreSQL + pgvector starts locally.
- Alembic applies the MVP schema.
- FastAPI can read and write database-backed resources.
- Provider settings, health check, embeddings, semantic retrieval, and RAG answer generation all run through `apps/api`.
- The desktop app can manually confirm current frontend wiring for Diagnostics and Settings.

It does not build a production installer, configure cloud deployment, or add feature polish.

## Prerequisites

- Docker with Compose support.
- Python 3.11 or newer.
- Node.js and npm for the desktop manual checks.

No real AI Provider key is required. The smoke test uses `scripts/dev-smoke-test.py serve-provider`, a local fake OpenAI-compatible service.

## Terminal 1: Start The Database

Run from the repository root:

```powershell
docker compose up -d db
```

This is the Task 6.1 required test command and should leave the `asteria-db` container running.

## Terminal 2: Prepare And Start The API

Run from `apps/api`:

```powershell
cd apps/api
python -m pip install -e ".[dev]"
$env:ASTERIA_API_SECRET_KEY = python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
alembic upgrade head
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Keep this terminal running. The smoke runner expects the API at `http://127.0.0.1:8000` unless `--api-base-url` is passed. The secret key is required because the smoke path saves a temporary Provider API key and the backend encrypts it before storing it.

## Terminal 3: Start The Fake Provider

Run from the repository root:

```powershell
python scripts/dev-smoke-test.py serve-provider
```

Keep this terminal running. It serves:

- `GET /v1/models`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`

The default provider base URL is `http://127.0.0.1:18080/v1`.

## Terminal 4: Run The Automated API Smoke Path

Run from the repository root:

```powershell
python scripts/dev-smoke-test.py run --cleanup
```

The runner checks:

- `GET /health`
- provider list access, which catches missing database tables
- project creation
- active smoke provider creation
- provider health check
- knowledge creation
- explicit embedding refresh
- semantic search over generated embeddings
- conversation creation
- `/api/rag/answer` with source references

`--cleanup` archives the created project, knowledge unit, and conversation, deletes the smoke provider, and restores the previously active provider when possible.

To inspect created resources in the desktop UI, run without `--cleanup` only when you plan to archive or delete the printed resources manually afterward.

## Manual Frontend Checks

Manual steps are intentionally separate from the automated API runner.

### Diagnostics

Run from `apps/desktop`:

```powershell
cd apps/desktop
npm install
npm run typecheck
npm run dev
```

Open `http://127.0.0.1:1420` or run `npm run tauri:dev`.

Manual acceptance:

- Go to Diagnostics.
- Confirm the Local API base URL is `http://127.0.0.1:8000`.
- Confirm Local API is online.
- Confirm Database URL shows configured.
- Click Refresh and confirm the status remains healthy.

### Settings

Keep the fake provider and API running.

Manual acceptance:

- Go to Settings.
- Confirm provider loading does not show an API error.
- Create a temporary provider with:
  - Base URL: `http://127.0.0.1:18080/v1`
  - Chat model: `asteria-smoke-chat`
  - Embedding model: `asteria-smoke-embedding`
  - API key: any non-empty smoke value
  - Active provider: checked
- Save the provider.
- Run Health Check and confirm it reports reachable.

The current Task 6.1 frontend scope stops here. Projects, Knowledge, and Chat desktop pages are still expected to expose any remaining frontend wiring gaps as follow-up work rather than being implemented by this smoke-test task.

## Troubleshooting

- If `docker compose up -d db` fails, confirm Docker is running and port `5432` is free or set `ASTERIA_POSTGRES_PORT`.
- If `alembic upgrade head` fails, confirm the database URL matches `.env.example`.
- If the smoke runner says the provider is unreachable, confirm Terminal 3 is still serving `http://127.0.0.1:18080/v1`.
- If semantic search returns no source, rerun the automated smoke path with the fake provider still active and check API logs.
