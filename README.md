# Commons · Northstar workplace pilot

A working full-stack assessment prototype: **Next.js frontend, NestJS API, PostgreSQL database**. Fictional seed data only. All eight modules have persistent workflows or source-backed reads.

## Run with one command

Requires Docker with Compose:

```sh
docker compose up --build
```

Open http://localhost:3000. If those ports are occupied, use `DB_PORT=55433 API_HOST_PORT=4101 WEB_PORT=3100 WEB_ORIGIN=http://localhost:3100 docker compose up --build -d` and open http://localhost:3100. Select a demo persona and use `local-demo-change-me` for this local-only configuration. For an existing database created before Prisma, follow the one-time baseline procedure below before restarting the API. A fresh database is migrated and seeded automatically on first API startup. Startup is idempotent and does not overwrite edited records. PostgreSQL data survives container restarts in `commons_data`.

For a shared deployment, set `DEMO_PASSWORD`, `POSTGRES_PASSWORD`, `WEB_ORIGIN` and `COOKIE_SECURE=true` in the hosting environment. The checked-in defaults are intentionally public **local demo values**, not production secrets. Never reuse them on a public server. See [deployment](docs/DEPLOYMENT.md).

| Persona     | Role                      | Useful demo                                                         |
| ----------- | ------------------------- | ------------------------------------------------------------------- |
| Maya Chen   | Employee, Product         | Post, recognize, edit own expertise, follow teams, express interest |
| Alex Morgan | Lead, Product             | Update a goal and staffing capacity; inspect team audit             |
| Jordan Lee  | Finance admin, Operations | Edit budgets, see financial Insights and audit entries              |
| Root Admin  | Root administrator        | Full cross-team access; manage every record, person and team        |
| Sam Rivera  | Employee, Operations      | Verify Product-private posts are absent                             |

## Prisma migrations and seeders

Prisma **7.10.1** manages migrations and seeders. `apps/api/prisma/schema.prisma` maps the existing eight tables; SQL migrations retain PostgreSQL checks, the normalized skill index and the skill-validation trigger. API queries, authorization and audit transactions are unchanged.

For a fresh database, set `DATABASE_URL` in your environment or root `.env`, then run:

```sh
npm run db:generate
npm run db:migrate
npm run db:seed
```

`npm run dev` / API `dev` and `start` apply pending migrations and run the non-destructive seeder before starting. Builds generate Prisma Client. The ordinary seeder initializes an empty workspace with the five-team fictional scenario; an existing workspace is preserved and only missing canonical catalog entries are added. It does not reset sessions or duplicate audit history.

**Existing database upgrade:** back up the database and verify it matches the committed initial schema, including the skill trigger/checks/index. Once verified, run `npm run db:baseline` **once** to mark `20261109000000_initial` as already applied, then `npm run db:migrate`. Do not baseline an empty or mismatched database; baseline records history and does not repair schema drift. This change does not automatically baseline or reset existing data. See [database workflow](docs/DATABASE.md).

For a new schema change: `npm run db:migrate:dev -- --name descriptive_name` against a development database, review the SQL (especially checks/triggers), and commit both schema and migration. Production uses `db:migrate` (`prisma migrate deploy`), never `migrate dev` or `db push`.

`npm run seed:demo` explicitly **clears demo records, audit history and sessions** before rebuilding fictional fixtures. Use only an approved disposable demo database. `npm run test:migrations` requires an empty disposable database and refuses existing tables.

## Scope and implementation plan

- [Scope and acceptance criteria](docs/SCOPE.md)
- [24-hour implementation plan and architecture decisions](docs/IMPLEMENTATION_PLAN.md)
- [AI build log](docs/AI_BUILD_LOG.md)
- [15-minute demo and code walkthrough](docs/WALKTHROUGH.md)
- [Deployment and submission checklist](docs/DEPLOYMENT.md)
- [Postman API collection and environment](postman-collection/README.md)

## Why each module exists

| Module       | Implemented behavior and rationale                                                                                   |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Home         | Publish persistent updates and recognition; company/team visibility; Following filter makes shared work discoverable |
| People       | Search colleagues and self-listed skills; edit own expertise; recognize contributions without ratings                |
| Organization | Search teams/roles, inspect dated shared work and visible activity, and manage follows                               |
| Goals        | Create goals, update progress with evidence; links progress to an accountable record                                 |
| Allocation   | Publish opportunities, plan available/needed hours, opt in/out; exposes capacity gaps without assigning people       |
| Budget       | Finance-only planned/actual spending and source notes; makes drivers traceable                                       |
| Insights     | Deterministic permission-filtered calculations with source records and as-of timestamps; avoids opaque AI numbers    |
| Compliance   | Transactional audit log with before/after details and scoped access; makes sensitive changes inspectable             |

## Architecture

```mermaid
flowchart LR
  B[Browser] -->|same-origin /api| W[Next.js :3000]
  W -->|rewrite| A[NestJS :4000]
  A -->|parameterized SQL| P[(PostgreSQL)]
  A --> S[Session and permission checks]
  A --> T[Mutation + audit transaction]
```

The frontend stores no authoritative business data in localStorage. Next.js proxies API requests; NestJS authenticates an opaque HttpOnly cookie, applies visibility/role rules, and reads/writes PostgreSQL. Secrets stay on the server. The API URL is a server-side Next.js rewrite setting, established at build time.

The pilot uses typed domain records backed by JSONB for module-specific values. Prisma manages the versioned schema migrations and fictional seed data in `apps/api/prisma/`. The API retains its parameterized `pg` queries and transaction boundaries. Every SQL value is parameterized. This intentionally small model prioritizes connected workflows over enterprise configuration.

### Data model

| Table      | Purpose                                                                    |
| ---------- | -------------------------------------------------------------------------- |
| `teams`    | Team name and mission                                                      |
| `users`    | Fictional identity, team, role, owner-editable skills                      |
| `sessions` | Random opaque token, user and expiry                                       |
| `records`  | Kind, title, body, owner, team, visibility, module payload, timestamps     |
| `joins`    | Unique user/opportunity interest; no reporting-line or staffing assignment |
| `follows`  | Unique user/team feed preference                                           |
| `audit`    | Actor, action, source ID, team, before/after JSON and timestamp            |

Visibility is `company`, `team`, or `finance`. Root has full cross-team access. Tables also carry `archived_at` to support reversible deletion. Following never grants access. Finance admins can manage company planning and financial data but do not gain access to other teams' private feed posts. Audit visibility: own actions for employees, non-financial team actions plus own for leads, all actions for finance and root.

## Local development

Node.js 22 and PostgreSQL 16+ recommended. For a fresh checkout:

```sh
npm ci
cp .env.example .env
docker compose up -d db
npm run dev
```

`npm run dev` loads `.env` and optional `.env.development` (existing environment values take precedence), checks PostgreSQL connectivity, and starts both NestJS and Next.js with file watching. Ctrl+C stops both apps. The default development ports are 3000/4000; change `WEB_PORT`, `API_PORT`, `WEB_ORIGIN` and `API_URL` together if needed. `DATABASE_URL` must match the published PostgreSQL port.

On the current development machine, an ignored `.env.development` is initialized only if absent, using the verified database on port 55433 and development frontend/API ports 3102/4102. The Docker application remains on port 3100. Both use the same fictional pilot database.

## Complete record lifecycle and root administration

- Posts, recognition, goals, opportunities and budgets support create, read, edit, archive and restore. Forms expose all editable fields, including titles, details, team/visibility, goal targets/evidence, allocation hours, and financial values/source notes.
- **Archive is the delete operation:** data remains recoverable and audit history is preserved. Archived records are hidden by default and excluded from Insights. Enable **Include archived records** to inspect and restore entries you manage.
- Authors can edit/archive their posts and recognition; leads manage their team's plans; finance manages budgets and planning. **Root Admin** bypasses role/team restrictions across records and can create/edit/archive/restore people and teams.
- Root may change roles, team membership and profile fields. Role/team changes revoke other users' sessions; archived people cannot sign in. The active root account cannot archive or demote itself. Teams with active people or records must have those dependencies reassigned or archived first.
- Every successful mutation shows an in-app success notification. These are confirmation toasts, not email/SMS delivery or fraud alerts.
- Mutations, including follows and directory changes, write audit entries in the same PostgreSQL transaction. Audit entries remain read-only; root access does not erase history.

## Validation

```sh
npm run lint
npm test
npm run build
# With API and database running:
TEST_API_URL=http://localhost:4102 node --env-file=.env scripts/integration.mjs
TEST_API_URL=http://localhost:4102 node --env-file=.env scripts/crud-integration.mjs
```

Policy tests cover visibility, cross-team management and financial validation. HTTP integration checks use real PostgreSQL: authentication, persistent writes, direct-record authorization, budget restrictions, evidence links, opt-in, own profile edits, follows, audit visibility and logout. Integration checks create fictional test records, archive them, retain their audit records, and restore changed seed values. The CRUD suite also injects a temporary failing audit trigger to prove transaction rollback, removing it in a finally block. Run against a disposable database, not a customer deployment.

GitHub Actions (`.github/workflows/ci.yml`) and GitLab CI (`.gitlab-ci.yml`) run lint and typechecks, Semgrep SAST analysis, unit tests, production builds, PostgreSQL integration and demo readiness checks, and multi-target Docker image verification on every push and pull/merge request.

## Deployment and CI/CD

### 1. Docker Compose host deployment

Provision a host with Docker and Docker Compose (`docker-compose.yml` / `compose.yaml`):

```sh
export POSTGRES_PASSWORD="<strong-random-db-password>"
export DEMO_PASSWORD="<strong-random-demo-password>"
export WEB_ORIGIN="https://commons.ericpino.com"
export COOKIE_SECURE="true"
export DEMO_MODE="true" # Set to "false" outside demo environments

docker compose -f docker-compose.yml up --build -d
```

- **Network exposure:** `db` (`55433` -> `5432`) and `api` (`4101` -> `4000`) bind only to host loopback (`127.0.0.1`). `web` (`3005` -> `3000`) is published for reverse-proxy ingress, and Next.js proxies `/api/*` requests to `http://api:4000` over the internal Docker network.
- **Let's Encrypt / Certbot HTTPS (`commons.ericpino.com`):**
  - **Option A — Dockerized Nginx + Certbot (`docker-compose.letsencrypt.yml`):** Point the DNS `A` record for `commons.ericpino.com` to your server's public IP, set `POSTGRES_PASSWORD` and `DEMO_PASSWORD` in `.env`, and run:
    ```sh
    LETSENCRYPT_EMAIL="eric@posible.net" ./scripts/init-letsencrypt.sh
    ```
    This starts `db`, `api`, `web`, `nginx` (using [`deploy/nginx/commons.ericpino.com.conf`](deploy/nginx/commons.ericpino.com.conf)), obtains the certificate for `commons.ericpino.com`, and runs automatic 12-hour renewals.
  - **Option B — Host Nginx + Certbot on Ubuntu 24.04:** Copy [`deploy/nginx/host-nginx.conf`](deploy/nginx/host-nginx.conf) to `/etc/nginx/sites-available/commons.ericpino.com`, enable it, and run `sudo certbot --nginx -d commons.ericpino.com`.
- **Persistence & seeding:** PostgreSQL data persists across restarts in the `commons_data` volume. To load the clean 5-team Northstar demo dataset after initial startup:
  ```sh
  docker compose exec api npm run seed:demo
  ```
- **Health verification:** Check `GET /api/health` (through the web origin) or `http://127.0.0.1:4101/health` (on the host) for `{ "status": "ok" }`.

### 2. Multi-stage Dockerfile & separate service hosting

The root `Dockerfile` builds both services from shared workspace dependencies using multi-stage targets (per-service Dockerfiles are also available at `apps/api/Dockerfile` and `apps/web/Dockerfile`):

```sh
# Build the NestJS API image
docker build --target api -t commons-api:latest .

# Build the Next.js Web image (API_URL is compiled into Next.js rewrites at build time)
docker build --target web --build-arg API_URL=https://api.internal.example.com -t commons-web:latest .
```

When deploying `api` and `web` as separate container services, pass `DATABASE_URL`, `DEMO_PASSWORD`, `WEB_ORIGIN`, `COOKIE_SECURE=true`, and `DEMO_MODE` to the `api` runtime environment. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full deployment and submission checklist.

### 3. CI/CD pipelines (GitHub Actions & GitLab CI)

Both `.github/workflows/ci.yml` and `.gitlab-ci.yml` enforce a four-stage verification pipeline:

| Stage / Job | Checks performed                                                                                                                 |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `lint`      | `npm ci` and `npm run lint` (ESLint across `apps/` and `scripts/` + TypeScript `--noEmit` across workspaces)                     |
| `semgrep`   | Static application security testing (SAST) via `semgrep/semgrep:latest` (`semgrep scan --config auto --error`)                   |
| `test`      | API & Web unit tests (`npm test`), production build (`npm run build`), PostgreSQL 16 integration suites, and demo seed readiness |
| `docker`    | Validates `docker-compose.yml` (`docker compose config -q`) and builds both `--target api` and `--target web` container images   |

## API reference and Postman collection

A complete Postman collection covering all **25 API routes** (46 example requests) is included under [`postman-collection/`](postman-collection/README.md):

- **Collection:** [`postman-collection/Commons.postman_collection.json`](postman-collection/Commons.postman_collection.json)
- **Local Environment:** [`postman-collection/Commons.local.postman_environment.json`](postman-collection/Commons.local.postman_environment.json)
- **Usage & Route Guide:** [`postman-collection/README.md`](postman-collection/README.md)

### Quick start in Postman

1. Import both JSON files into Postman and select the **Commons Local** environment (`baseUrl` defaults to `http://localhost:3100/api` for the Docker frontend proxy; switch to `http://localhost:4101` for direct NestJS or `http://localhost:3102/api` for the local dev runner).
2. Run **01 · Start here → Login — establish session cookie** first. Postman's cookie jar automatically stores the `HttpOnly` `commons_session` cookie for subsequent requests.
3. The collection covers the full lifecycle across all five record kinds (`post`, `recognition`, `goal`, `allocation`, `budget`), people and team administration, skills catalog (`GET /skills`) and profile expertise updates, opportunity interest toggles (`POST /records/:id/join`), team follows (`POST /teams/:id/follow`), deterministic Insights (`GET /insights`), transactional audit logs (`GET /audit`), and demo persona switching (`POST /demo/view-as`).
4. Each `Create` request captures its new record ID into a collection variable so subsequent `Read`, `Update`, `Archive`, and `Restore` requests run without mutating seeded demo IDs. Run mutation examples against a disposable test database rather than a clean submission dataset.

## Assumptions and limits

**Organization UI assumptions:** role groups use returned job titles (permission roles only when no title is listed); no manager relation is inferred. Active allocation records are treated as open invitations because there is no separate invitation status. Activity facts count only active records returned to the current persona and link to their team-page source lists. Dates use the browser timezone and the workspace `asOf` snapshot. Root-only administration controls mirror the existing server role guard; the API has no separate capability flags. All checked roles receive the same team-directory scope, so no role-specific scope label is shown. The existing Root demo-account exclusion from member lists is presentation only; archive dependency checks still include all returned people. Section rendering errors are isolated, but all sections share the existing workspace request.

**Approved Organization scope:** P3 is a follow-only popup. Notification preferences are not stored by the API, so alert checkboxes are omitted rather than simulated. P2 customization is skipped. No browser-local preference store, API/schema/policy change, or dependency was added. Follow retries read the current state before calling the toggle endpoint; this reduces accidental reversal but does not make concurrent writes atomic. See [Organization UX validation](docs/ORGANIZATION_UX_VALIDATION.md).

**People UI assumptions:** directory search and team/skill filters operate only on the returned workspace data, in alphabetical order. The returned Root role determines person administration controls, matching the existing server guard; no separate capability flags exist. All three checked roles receive the same directory scope, so no misleading role-specific scope chip is shown. The existing exclusion of the fictional Root demo account is presentation only, not authorization. Profiles use hash links and existing identity, self-listed skills, shared work and recognition records; no biography fields were invented. Only existing opportunities are shown; no communities API exists. Dates use the browser timezone. Optional team grouping is omitted.

**People limitation:** the frontend only edits skills through the current user's expertise form. The existing Root person-write API still accepts other people's skills; owner-only enforcement is therefore not satisfied server-side and needs a separately approved backend fix. This frontend change does not claim to fix it. See [People UX validation](docs/PEOPLE_UX_VALIDATION.md).

**Allocation UI assumptions:** “role” in the colleague list means the returned job title (falling back to the returned permission role). Colleague details are joined only to identities in the returned interest list, sorted by name; the directory never supplies additional interest identities. The existing API exposes a full list only for an active opportunity’s creator or Root; otherwise an empty response is described as permission-limited, not zero interest. Archived lists are treated as unavailable. Dates use the browser timezone. Long descriptions are visually truncated to one line; View source retains the full text.

Allocation omits Edit/Archive controls because records do not expose a server-provided edit capability. Interest retries first read the current joined state before using the existing toggle endpoint; this avoids blindly repeating an ambiguous request but cannot guarantee idempotency across concurrent clients. No optimistic mutation is used. Colleague refresh shows loading/error/retry states on the existing workspace request.

**Allocation and Compliance presentation assumption:** the brief leaves these screens open, so Allocation uses existing opportunity cards with owner, capacity arithmetic, dated sources and voluntary interest. Compliance leads with the existing audit trail, readable changed fields and links to available current source records; original audit details remain expandable. The access overview describes the existing policy, not a new permission system.

One company, five teams, ten fictional colleagues plus a demo administrator, four roles, no real personal data. The supplied brief references a separate visual concept pack that was not supplied. The UI is an original interpretation. AI answers are explicitly deterministic, not LLM-backed. Recognition celebrates contribution, never proficiency. All financial amounts are USD. Progress is owner-reported; capacity is manually entered and independent of expressions of interest.

This is a pilot, not a production security claim. Before production: SSO, tenant isolation, per-resource schema constraints, SQL-level pagination/filtering, login throttling, audit tamper resistance, monitoring, backup/restore validation, granular budget roles, optimistic locking and broader accessibility checks. No deployment or public repository URL is claimed until actually provisioned and verified.

## Agent skills

Matt Pocock’s published engineering and productivity skills are installed locally in `.agents/skills/`. See [usage, setup, and provenance](docs/SKILLS.md). Open Commons as your Codex project to discover them.

### Shared expertise catalog

`GET /api/skills` through the frontend (`GET /skills` on NestJS) requires an authenticated session and returns `{ skills: [{ id, name }] }`, sorted by name. The own-expertise form fetches this catalog and filter suggestions locally, with keyboard selection and removable skill chips. Only selected suggestions are submitted.

The PostgreSQL `skills` table supplies canonical names and enforces case-insensitive uniqueness. Existing expertise is imported without discarding names; casing and duplicate entries are normalized. Both profile and Root person writes validate against the catalog, accept case-insensitive matches, reject unknown values, and store canonical names. A database trigger also rejects unknown names and more than 12 selections on user writes. The existing `users.skills` array remains compatible with directory search and audit history. New catalog entries are managed through database migrations for this pilot; no free-text creation is exposed in the picker.

### Submission demo

The header’s **View as** selector switches authenticated demo personas without signing out. This endpoint is available only with `DEMO_MODE=true` (enabled for the local pilot by Compose and the dev runner); set it to `false` outside the demo. Root remains available as a demo administrator but is excluded from colleague directories and team rosters.

After applying migrations, explicitly reset a disposable demo database to the clean five-team Northstar scenario with:

```sh
DATABASE_URL=postgresql://commons:local_demo_only@localhost:55433/commons npm run seed:demo
```

This deliberately replaces workspace records, people, teams, sessions and audit history. Back up first. It creates 10 fictional colleagues, three measured goals, a 20-hour weekly capacity gap, an explained budget overspend and six explicitly marked fictional audit events at different dates. Tests should use a separate database, never the submission database. The pre-cleanup local database backup is under `.local-backups/` and is excluded from Git.

Goals calculate progress from completed/total units and retain dated evidence. Insights provides five questions (six for Finance/Root), per-answer coverage and expandable arithmetic with permission-filtered source records. Team pages show structure, posts, shared work and voluntary engagement. Allocation owners and Root can see named expressions of interest. Compliance includes readable subjects and an access-policy review table. Success toasts dismiss after 4.5 seconds.

For the seeded readiness checks, point `TEST_API_URL` at an isolated API running with `DEMO_MODE=true`, seed its database, then run `node scripts/demo-readiness-integration.mjs` with `DEMO_PASSWORD` set. The existing integration suites mutate fixtures and must also use that isolated database.
