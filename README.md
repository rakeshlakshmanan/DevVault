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

## Design decisions

Each entry says what was chosen, what it was chosen over, and why.

### Event-driven AI processing instead of calling Gemini inside the request

Saving a bookmark returns as soon as the page is scraped and the row is stored. A `BookmarkCreatedEvent` is published, and `AiService` handles it on a separate thread pool after the transaction commits.

- **Why not call Gemini inline:** an LLM call takes several seconds and can time out or fail. Doing it in the request would make every save slow and tie the save's success to a third-party API.
- **Why `@TransactionalEventListener`:** the listener only runs after the commit, so it can never read a bookmark that does not exist yet, and a rolled-back save never triggers an AI call.
- **Why not a message queue (RabbitMQ, Kafka, Pub/Sub):** a queue adds a new service to run and pay for. Spring's in-process events are enough for one backend instance.
- **Trade-off:** in-process events are lost if the pod dies mid-processing. This is covered by the `aiStatus` column and `AiStartupRunner`, which reprocesses unfinished bookmarks on boot. The `ai_attempts` counter stops permanently failing bookmarks from being retried forever.

### Jina AI Reader for scraping instead of Jsoup alone

- **Why:** many developer reading sites (Medium, Substack and similar) block plain HTTP clients or render content with JavaScript, so Jsoup gets an empty or blocked page. Jina returns clean, readable text, which also gives Gemini better input than raw HTML.
- **Why not a headless browser (Playwright, Puppeteer):** it would mean shipping and scaling Chromium in the backend image, which is heavy on memory and CPU. That matters on a cluster billed by resource requests.
- **Jsoup is still used** for lightweight parsing such as page metadata.
- **Trade-off:** a dependency on an external service. If Jina is down, new bookmarks are saved without scraped content.

### Gemini 2.5 Flash instead of a larger model

- **Why:** the task is short summarisation plus tag extraction. It needs speed and low cost per call, not deep reasoning, and Flash fits that.
- **Why not a self-hosted model:** it would need GPU or large-memory nodes, which cost far more than API calls at this scale.
- **Trade-off:** vendor lock-in and an API key to manage. The model call is isolated in `AiService`, so swapping providers is a local change.

### Stateless JWT instead of server-side sessions

- **Why:** the backend keeps no session state, so any replica can serve any request and it scales horizontally without sticky sessions or a shared session store such as Redis.
- **Why a short access token plus a refresh token:** a 15-minute access token limits the damage if one leaks, and the 7-day refresh token keeps users signed in.
- **Why Google OAuth2 as well:** one-click sign-in for developers. The success handler issues the same JWT pair, so the rest of the app does not care how the user logged in.
- **Trade-off:** a JWT cannot be revoked before it expires without extra machinery. The short lifetime is the mitigation.

### PostgreSQL instead of MongoDB or another NoSQL store

- **Why:** the data is relational: users, bookmarks, tags, collections, friendships and shares, joined many-to-many. Foreign keys, unique constraints and joins give integrity and simple queries for these.
- **Why Postgres specifically:** it is free, runs everywhere (including as a container in the cluster), and has good full-text search if search needs to grow.
- **Trade-off:** running it as a single pod in Kubernetes means no automatic backups or failover. A managed service (Cloud SQL) would add that at extra cost.

### Flyway migrations with `ddl-auto: validate` instead of Hibernate auto-update

- **Why:** schema changes are versioned SQL files that are reviewed, committed and applied in order on every environment, so local, CI and production end up with the same schema.
- **Why `validate`:** Hibernate only checks that entities match the schema and refuses to start otherwise. This catches a missing migration at boot instead of at runtime. (For example, code that uses `ai_attempts` will not start without migration V11.)
- **Why not `ddl-auto: update`:** it can silently alter or fail to alter tables, cannot express data fixes, and gives no history to roll forward from.

### Spring Boot instead of Node.js or another backend stack

- **Why:** Spring Security, Spring Data JPA, validation, OAuth2 client and actuator health checks come ready and well tested, which matters most for auth and data access.
- **Why MapStruct and Lombok:** MapStruct generates DTO mappers at compile time (no reflection cost, mapping errors caught at build). Lombok removes getter and constructor boilerplate.
- **Trade-off:** a JVM needs more memory than a Node process, which is why the backend container is given 1Gi.

### Static analysis and formatting in the build

- **Why SpotBugs and Spotless:** SpotBugs catches common bug patterns before they ship. Spotless with Google Java Format ends style debates and keeps diffs clean. Both run in `./gradlew build`, so CI enforces them.

### React, Vite and shadcn/ui on the frontend

- **Why Vite instead of Create React App:** fast dev server and builds, and CRA is no longer maintained.
- **Why shadcn/ui and Tailwind instead of a packaged library like MUI:** the components are copied into the repo, built on accessible Radix primitives, and fully editable. There is no heavy runtime library to fight when customising the look.
- **Why TanStack Query:** it handles caching, refetching and loading and error states for server data, so there is no hand-written fetch state or global store for API data.
- **Why React Hook Form with Zod:** uncontrolled inputs keep forms fast, and Zod gives one typed schema for validation and TypeScript types.

### Docker multi-stage builds

- **Why:** the backend image is built with a JDK and shipped with only a JRE, and the frontend is compiled with Node and shipped as static files behind nginx. Images stay small, start faster and contain no build tools, which also reduces the attack surface.

### Kubernetes on GKE Autopilot instead of a single VM or Cloud Run

- **Why Kubernetes:** declarative manifests, rolling deployments with health-gated rollouts, and the same setup for the database, backend and frontend.
- **Why Autopilot instead of Standard:** Google manages the nodes, so there is no node pool sizing or patching, and billing follows the pod resource requests.
- **Why not Cloud Run:** it is cheaper and scales to zero, but this project deliberately runs on Kubernetes, and Postgres needs a persistent volume, which Cloud Run does not provide.
- **Trade-off:** Autopilot has a fixed cluster fee, so it costs more than a small VM for a project this size.

### GitHub Actions CI/CD with images tagged by git SHA

- **Why:** the pipeline lives next to the code. Every image is tagged with the commit SHA, so each deployment maps to exactly one commit and a rollback is just deploying an earlier SHA. `latest` is only a convenience tag.
- **Why `rollout status` gates:** the pipeline fails if the new pods never become healthy, instead of reporting success on a broken deploy.
- **Why a service account key with minimal roles:** the deploy account can only push images and deploy to GKE, so a leaked key cannot touch other resources.
