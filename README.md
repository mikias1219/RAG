# OKDE SaaS - Production Ready

**Operational Knowledge & Decision Engine** - Multi-tenant B2B SaaS platform with RAG, workflow automation, and AI agents.

## Unified Workspace Structure

```
okde-saas/
├── backend/                    # Node.js Express API (TypeScript)
│   ├── src/
│   │   ├── api/               # Controllers + Routes + Middleware
│   │   ├── application/       # Business logic + Services
│   │   ├── domain/            # Entities, Interfaces, Errors
│   │   ├── infrastructure/    # Database, Azure, Cache, Queue
│   │   ├── config/            # Environment + Logger
│   │   ├── shared/            # Utilities
│   │   ├── app.ts             # Express setup
│   │   └── main.ts            # Entry point
│   ├── prisma/                # Database schema + migrations
│   ├── tests/                 # Integration + Unit tests
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                  # Next.js React App (TypeScript)
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   ├── components/       # Reusable UI components
│   │   ├── lib/              # Utilities, API client
│   │   └── styles/           # Global CSS
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml        # Local dev environment
├── .github/workflows/        # CI/CD (Tests, Build, Deploy)
├── infra/                    # Terraform for Azure
└── docs/                     # Architecture, runbooks
```

## Quick Start

### 1. Prerequisites
- Node.js 20+ 
- Docker & Docker Compose
- Azure CLI (for cloud deployment)

### 2. Install & Run Locally

```bash
# Backend
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Or with Docker:

```bash
docker-compose up
```

Services:
- Backend: http://localhost:8080/api
- Frontend: http://localhost:3000
- Database: postgres://localhost:5432

### 3. Environment Variables

Create `.env` files:

**backend/.env:**
```env
NODE_ENV=development
PORT=8080
LOG_LEVEL=debug
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai102
JWT_SECRET=your-secret
AZURE_OPENAI_ENDPOINT=https://your.openai.azure.com
AZURE_OPENAI_API_KEY=your-key
AZURE_AI_SEARCH_ENDPOINT=https://your.search.windows.net
AZURE_AI_SEARCH_API_KEY=your-key
AZURE_STORAGE_CONNECTION_STRING=your-connection
```

**frontend/.env.local:**
```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api
```

## Core Features

### Multi-Tenant
- All data scoped by `tenantId`
- Workspace-level isolation
- Tenant header validation

### Authentication
- JWT-based (configurable: local, Google, Azure AD B2C)
- RBAC: admin, manager, user

### Document Processing
Upload → Extract → Chunk → Embed → Index

### RAG System
Hybrid search (vector + keyword) → Context retrieval → LLM generation

### Workflows
Rule-based automation with async queue processing

### Multi-Agent
- Data Analyst Agent
- Risk Analyst Agent  
- Operations Agent
- Tool-calling system

## API Endpoints

```
POST   /api/auth/login
POST   /api/auth/register
GET    /api/auth/me

POST   /api/documents
GET    /api/documents
DELETE /api/documents/:id

POST   /api/chat/sessions
POST   /api/chat/sessions/:id/messages
GET    /api/chat/sessions/:id/messages

POST   /api/workflows
GET    /api/workflows
POST   /api/workflows/:id/execute

GET    /api/agents
POST   /api/agents/:id/run
```

## Testing

```bash
# Backend
cd backend && npm test
npm run test:watch

# Frontend
cd frontend && npm run build
npm run typecheck
npm run lint
```

### Quick API smoke (local or deployed)

```bash
BASE_URL=http://localhost:8080/api ./scripts/smoke-e2e.sh
```

### CI/CD (GitHub Actions)

- Runs only when `backend/**`, `frontend/**`, or `.github/workflows/**` change (doc-only edits skip the pipeline).
- **Concurrency**: newer pushes cancel in-progress runs on the same branch/PR.
- **Validate**: single job — backend + frontend `lint` + `typecheck` (no duplicate matrix runners).
- **Backend tests**: `npm test` without coverage in CI for speed; run `npm test -- --coverage` locally when needed.
- **Deploy**: still requires `frontend-build` + passing tests; Docker build runs only on `main` after checks pass.

## Build & Deploy

### Local Build
```bash
# Backend
npm run build

# Frontend  
npm run build
```

### Azure Deployment

1. **Set GitHub Secrets:**
   - `AZURE_CREDENTIALS` - Service principal JSON
   - `ACR_LOGIN_SERVER` - Container registry URL
   - `ACR_USERNAME` - Registry username
   - `ACR_PASSWORD` - Registry password

2. **Push to main branch** → CI/CD pipeline runs automatically

3. **Pipeline stages:**
   - ✅ Test backend (PostgreSQL integration)
   - ✅ Test frontend (build check)
   - ✅ Build & push Docker images
   - ✅ Deploy to Azure Container Apps

## Database

PostgreSQL with Prisma ORM.

**Key models:**
- Tenant (Company)
- Workspace
- User
- Document
- Chunk
- ChatSession
- IngestionJob
- Workflow

All models include `tenantId` for multi-tenant isolation.

## Troubleshooting

### API returns 500 on `/workflows`, `/audit`, `/documents/jobs`

The database schema must include `Workflow`, `AuditLog`, and extra `IngestionJob` / `Chunk` columns. **Run migrations** before using the app:

```bash
cd backend && npx prisma migrate deploy
# or during local dev:
npm run prisma:migrate
```

Docker images run `prisma migrate deploy` automatically via `backend/docker-entrypoint.sh` when the container starts.

### Frontend “Internal server error” or proxy failures in Docker

Next.js calls the API from the **server** route `src/app/backend-api/[...path]/route.ts`. Inside a container, `localhost:8080` is wrong. Set:

- **`BACKEND_INTERNAL_API_URL`** = internal URL (e.g. `http://backend:8080/api` in Compose, or your Azure Container App **internal** ingress URL).

See `.env.example`. Browser traffic still uses same-origin `/backend-api/...`.

### Admin page: `Unexpected end of JSON input`

Fixed in the API client: PATCH user status/role returns **204 No Content** (empty body). Older clients called `response.json()` on empty bodies and threw. Ensure the latest `frontend/src/lib/apiClient.ts` is deployed.

### Azure / production logging

- **Container Apps**: Log stream + Log Analytics workspace (see Azure Portal → your app → **Log stream** / **Logs**).
- **Application Insights**: Optional — add the Node SDK to the backend and `NEXT_PUBLIC_*` for the frontend.
- Tail errors: `docker compose logs -f backend` and check the `err` / `requestId` fields from `pino`.

### Checking Azure from your machine (CLI)

Signing in must be done **on your computer** (browser/device code flow, often MFA). From the project directory:

```bash
az login
az account show
# Replace with your resource group and Container App names:
az containerapp logs show -g <resource-group> -n ai102-backend --follow
az containerapp logs show -g <resource-group> -n ai102-frontend --follow
```

Confirm **frontend** app settings include **`BACKEND_INTERNAL_API_URL`** pointing at the **internal** backend URL (see `.env.example`). A **404** on `/favicon.ico` or missing static assets is harmless; a 404 on `/backend-api/...` usually means the Next rewrite/proxy is not deployed or env is wrong.

### Ingestion job retry (400 “no storage key”)

Older jobs could have `storageObjectKey` null in Postgres while the blob still exists. The backend now **infers** the blob path using the same rule as upload (`tenantSegment/documentId/safeFilename`) and **backfills** the column after a successful read. Redeploy the **backend** (and run migrations) after pulling this change.

### AI services (RAG / ingestion)

- **Chat + embeddings** use **Azure OpenAI** from the Node backend (`AZURE_OPENAI_*` env vars) when configured.
- **Optional** `services/ai-python` (Compose profile `full`) exposes a separate embedding HTTP API; wiring it into RAG is optional (`PYTHON_AI_BASE_URL` is reserved for future use).

```bash
# Reset database
npm run prisma:migrate reset
npm run seed

# View database
npm run prisma:studio

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Security

- JWT authentication + RBAC
- Tenant isolation on all queries
- Input validation (Zod)
- Rate limiting (ready for production)
- HTTPS enforced in production
- CORS configured

## Support

Refer to `/docs` directory for detailed documentation.
