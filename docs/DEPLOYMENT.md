# Deployment and submission

## Current target

The requested stack requires a Node runtime for Next.js and NestJS plus PostgreSQL. The available Sites publisher runs Cloudflare Workers and is not a direct host for this architecture. No hosting account, public repository remote or domain was supplied, so the project includes deployment configuration without inventing a live URL.

## Container host

1. Provision a host with Docker Compose or use equivalent container services. The assessment says not to spend personal money; use an existing authorized host or a provider's suitable free tier after checking its current terms.
2. Set `DEMO_PASSWORD` and `POSTGRES_PASSWORD` to new random values via the deployment environment. Set `WEB_ORIGIN=https://commons.ericpino.com` and `COOKIE_SECURE=true`.
3. Run `docker compose up --build -d` (or use `docker-compose.letsencrypt.yml` via `./scripts/init-letsencrypt.sh` for built-in Nginx + Certbot). Persist the database volume. Do not expose PostgreSQL or the NestJS port publicly; Compose binds both to loopback.
4. Put HTTPS termination in front of port 3005 (mapped to container port 3000) for `commons.ericpino.com` (either via the included `docker-compose.letsencrypt.yml` + `deploy/nginx/commons.ericpino.com.conf`, or host Nginx + `sudo certbot --nginx -d commons.ericpino.com` with `deploy/nginx/host-nginx.conf`). Preserve `/api` paths and cookies. Next.js rewrites proxy to `http://api:4000` inside the Docker network.
5. Verify `/api/health`, sign in as each persona, create and re-read an update, change a budget, inspect sources and audit, restart services, and confirm the write remains.
6. Share the public HTTPS URL, repository URL, and demo password with reviewers. Use only fictional data.

## Separate frontend/API services

Using the root multi-stage `Dockerfile` (or `apps/api/Dockerfile` and `apps/web/Dockerfile`), build each target separately:

```sh
docker build --target api -t commons-api:latest .
docker build --target web --build-arg API_URL=https://api.your-hostname -t commons-web:latest .
```

Set `API_URL` to the private or public NestJS origin **during Next.js build**, since rewrites are compiled into the route manifest. Set the API's `DATABASE_URL`, `DEMO_PASSWORD`, `WEB_ORIGIN` and `COOKIE_SECURE=true` at runtime. Restrict API exposure if possible. Configure PostgreSQL TLS according to your provider; do not disable certificate validation as a shortcut. API startup runs Prisma migrate deploy and non-destructive seeding. Existing databases must first follow the reviewed baseline procedure in [DATABASE.md](DATABASE.md). For production, run migrations as a dedicated deployment job before starting replicas; never run the destructive demo reset.

## Continuous integration & security scanning

Both GitHub Actions (`.github/workflows/ci.yml`) and GitLab CI (`.gitlab-ci.yml`) run:

1. **Lint & Typecheck (`lint`)**: `npm run lint` (ESLint + workspace TypeScript checks).
2. **Semgrep SAST (`semgrep`)**: `semgrep scan --config auto --error` using `semgrep/semgrep:latest` and `.semgrepignore`.
3. **Unit & Integration Tests (`test`)**: `npm test`, `npm run build`, PostgreSQL 16 integration suites (`npm run test:integration`), and demo seed readiness (`npm run seed:demo` + `node scripts/demo-readiness-integration.mjs`).
4. **Container Verification (`docker` / `docker-build`)**: Validates `docker-compose.yml` (`docker compose -f docker-compose.yml config -q`) and builds both `api` and `web` image targets.
