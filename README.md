# DevVault

A full-stack developer bookmark manager and knowledge vault. Save a URL and DevVault scrapes the page, uses Google Gemini to write a summary and suggest tags, and files it into searchable collections. A social layer lets you add friends and share bookmarks with them.

Live at **https://devvault.qd.je** (hosted on Google Kubernetes Engine).

## Features

- **Bookmarks**: save, edit, delete and search, with title, description and favicon
- **AI summaries and tags**: every new bookmark is scraped and sent to Gemini 2.5 Flash for a summary and 3-5 tags, processed asynchronously so the UI never waits
- **Collections**: group bookmarks into named folders
- **Tags**: manual and AI-generated, with a browsable tag index
- **Favorites**: star bookmarks for quick access
- **Social**: friend requests, share bookmarks with friends, notification bell for unread shares
- **Explore**: public feed of bookmarks from all users
- **Profiles**: public page at `/u/:username`
- **Dashboard**: stats cards and activity overview
- **Auth**: email/password with JWT, plus Google OAuth2 sign-in

## Tech stack

| Area | Technology |
|---|---|
| Backend | Java 17 source / Java 21 runtime, Spring Boot 3.2, Spring Security, Spring Data JPA |
| Database | PostgreSQL 16, Flyway migrations (11 so far) |
| Auth | JWT (jjwt) access + refresh tokens, Google OAuth2 |
| AI | Google Gemini 2.5 Flash via WebClient |
| Scraping | Jina AI Reader API + Jsoup |
| Async | Spring `@Async` + `@TransactionalEventListener` |
| API docs | SpringDoc OpenAPI (Swagger UI) |
| Code quality | SpotBugs, Spotless (Google Java Format) |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router, TanStack Query, React Hook Form + Zod |
| Frontend tests | Vitest + Testing Library |
| Infra | Docker, Kubernetes (GKE Autopilot), GCP Artifact Registry, nginx, GitHub Actions |

## Architecture

```
Browser
  └── React SPA (nginx)  ── GKE Ingress (static IP + managed TLS cert)
        └── REST calls → Spring Boot backend (ClusterIP :8080)
              ├── PostgreSQL (Deployment + 5Gi PVC, ClusterIP :5432)
              ├── Jina AI Reader (sync, while saving a bookmark)
              └── Google Gemini (async, after the bookmark is saved)
```

### Bookmark AI flow

1. The user saves a URL. `BookmarkService` scrapes it through Jina AI Reader.
2. After the transaction commits, a `BookmarkCreatedEvent` fires.
3. `AiService` handles it on a dedicated thread pool, calls Gemini, and writes the summary and tags back.
4. `aiStatus` moves `PENDING` → `PROCESSING` → `COMPLETED` (or `FAILED`).
5. On startup, `AiStartupRunner` reprocesses bookmarks left in an unfinished state. The `ai_attempts` column (migration V11) caps retries so permanently failing bookmarks stop being retried on every boot.

### Auth flow

- Email/password login returns a 15-minute access token and a 7-day refresh token.
- Google OAuth2 login issues the same pair from `OAuth2LoginSuccessHandler`.
- `JwtAuthFilter` protects all non-public routes. There is no server-side session.

### Database

Flyway migrations in `backend/src/main/resources/db/migration`: users, bookmarks, tags, bookmark_tags, collections, collection_bookmarks, google_id on users, friendships, shared_bookmarks, favorites, and ai_attempts on bookmarks. Hibernate runs with `ddl-auto: validate`, so the schema must match the entities or the app will not start.

## Repository layout

```
backend/      Spring Boot app (Gradle), Dockerfile
frontend/     React + Vite app, Dockerfile, nginx.conf
k8s/          Kubernetes manifests (namespace, secrets, postgres, backend, frontend, ingress)
.github/      GitHub Actions workflows (ci.yml, cd.yml)
docker-compose.yml   Local PostgreSQL
.env.example         Environment variables the app needs
```

## Running locally

Prerequisites: Java 21, Node 20, Docker.

1. **Environment.** Copy `.env.example` to `.env` and fill it in:

   | Variable | Purpose |
   |---|---|
   | `DB_USERNAME`, `DB_PASSWORD` | Postgres credentials |
   | `JWT_SECRET` | Signing key, e.g. `openssl rand -base64 48` |
   | `GEMINI_API_KEY` | Google AI Studio key |
   | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth2 client |

2. **Database.** The backend expects Postgres on **port 5444**, which is what compose publishes:

   ```bash
   set -a; . ./.env; set +a
   docker compose up -d postgres
   ```

3. **Backend** (port 8080). Flyway applies migrations on startup:

   ```bash
   cd backend
   set -a; . ../.env; set +a
   ./gradlew bootRun
   ```

   Swagger UI is served by SpringDoc, and the health check is at `/actuator/health`.

4. **Frontend:**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

If the backend fails with a connection error on 5444, Docker or the Postgres container is not running.

## Tests and checks

```bash
cd backend && ./gradlew build        # compile, tests, SpotBugs
cd frontend && npx tsc --noEmit      # type check
cd frontend && npm test              # Vitest
```

## CI/CD

**CI** (`.github/workflows/ci.yml`) builds and tests the backend against a Postgres service, then type-checks and builds the frontend. It is currently triggered manually (Actions, CI, Run workflow).

**CD** (`.github/workflows/cd.yml`) runs on every push to `main`, and can also be run manually. It:

1. Checks that the required secrets exist.
2. Authenticates to GCP with the deploy service account.
3. Builds the backend and frontend images and pushes them to Artifact Registry, tagged with the git SHA and `latest`.
4. Fetches GKE credentials and applies the `k8s/` manifests. The `devvault-secrets` Kubernetes secret is created from GitHub secrets.
5. Points the deployments at the new SHA and waits for each rollout to finish.

Deploys are serialised by a `concurrency` group, so overlapping pushes queue.

### Required GitHub secrets

`GCP_SA_KEY`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

`DB_USERNAME` must be `postgres`, because the backend's init container waits on `pg_isready -U postgres`.

## Production infrastructure

| Item | Value |
|---|---|
| GCP project | `devvault-oct` |
| Cluster | `devvault-cluster`, GKE Autopilot, `us-central1` |
| Namespace | `devvault` |
| Registry | `us-central1-docker.pkg.dev/devvault-oct/devvault` |
| Deploy service account | `devvault-deployer` (roles: `artifactregistry.writer`, `container.developer`) |
| Static IP | global address `devvault-ip`, used by the ingress |
| Domain | `devvault.qd.je`, an A record pointing at the static IP |
| TLS | GKE ManagedCertificate, issued after DNS resolves (can take up to an hour) |

Services: `frontend-service` (NodePort 80), `backend-service` (ClusterIP 8080), `postgres-service` (ClusterIP 5432). Resource requests are set explicitly on every container, because Autopilot bills by request.

Useful commands:

```bash
gcloud container clusters get-credentials devvault-cluster --location=us-central1 --project=devvault-oct
kubectl get pods,deploy,svc,ingress -n devvault
kubectl logs deploy/backend -n devvault
```

### One-time setup for a new project

```bash
gcloud services enable container.googleapis.com artifactregistry.googleapis.com compute.googleapis.com iam.googleapis.com
gcloud artifacts repositories create devvault --repository-format=docker --location=us-central1
gcloud compute addresses create devvault-ip --global
gcloud container clusters create-auto devvault-cluster --location=us-central1
gcloud container clusters update devvault-cluster --location=us-central1 --monitoring=SYSTEM
gcloud iam service-accounts create devvault-deployer
# grant roles/artifactregistry.writer and roles/container.developer to it,
# create a JSON key, and store it as the GCP_SA_KEY GitHub secret
```

Then point the domain's DNS at the static IP and add the OAuth redirect URI `https://devvault.qd.je/login/oauth2/code/google` to the Google OAuth client.

### Cost notes

- The Autopilot cluster fee is a fixed floor of roughly 64 EUR per month, and the load balancer and pod requests add to it.
- Monitoring is trimmed to `SYSTEM` to cut Prometheus sample costs.
- The backend keeps 1Gi memory, because a Spring Boot JVM runs out of memory at Autopilot's 512Mi minimum.
- Set a budget alert on the billing account, and note when any free credit period ends.

## Design decisions

- **Event-driven AI processing** keeps Gemini latency out of the HTTP request path.
- **Jina AI Reader** handles bot detection and JS-rendered pages (Medium, Substack) better than raw Jsoup.
- **Multi-stage Docker builds** ship only the JRE and the compiled static files.
- **Flyway** makes schema changes versioned and repeatable.
- **Stateless JWT auth** lets the backend scale horizontally.

## Known issues

- Postgres runs as a single pod with a PVC, with no backups or replication.
- CD deploys on every push to `main` without waiting for CI.
