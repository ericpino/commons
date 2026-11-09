# Deployment and submission

## Current target

The requested stack requires a Node runtime for Next.js and NestJS plus PostgreSQL. The available Sites publisher runs Cloudflare Workers and is not a direct host for this architecture. No hosting account, public repository remote or domain was supplied, so the project includes deployment configuration without inventing a live URL.

## Container host

1. Provision a host with Docker Compose or use equivalent container services. The assessment says not to spend personal money; use an existing authorized host or a provider's suitable free tier after checking its current terms.
2. Set `DEMO_PASSWORD` and `POSTGRES_PASSWORD` to new random values via the deployment environment. Set `WEB_ORIGIN=https://your-hostname` and `COOKIE_SECURE=true`.
3. Run `docker compose up --build -d`. Persist the database volume. Do not expose PostgreSQL or the NestJS port publicly; Compose binds both to loopback.
4. Put HTTPS termination in front of port 3000. Preserve `/api` paths and cookies. Next.js rewrites proxy to `http://api:4000` inside the Docker network.
5. Verify `/api/health`, sign in as each persona, create and re-read an update, change a budget, inspect sources and audit, restart services, and confirm the write remains.
6. Share the public HTTPS URL, repository URL, and demo password with reviewers. Use only fictional data.

## Separate frontend/API services

Set `API_URL` to the private or public NestJS origin **during Next.js build**, since rewrites are compiled into the route manifest. Set the API's `DATABASE_URL`, `DEMO_PASSWORD`, `WEB_ORIGIN` and `COOKIE_SECURE=true` at runtime. Restrict API exposure if possible. Configure PostgreSQL TLS according to your provider; do not disable certificate validation as a shortcut. Automatic schema bootstrap is suitable for this single-instance pilot only; production should use a migration job.

## Submission template

Hello [name],

Thank you for the opportunity. Here is my Commons assessment submission:

- Working prototype: [verified HTTPS URL]
- Repository: [repository URL]
- Demo sign-in: choose a seeded persona; password shared separately
- Scope and rationale: `docs/SCOPE.md`
- Architecture and implementation plan: `docs/IMPLEMENTATION_PLAN.md`
- AI build log: `docs/AI_BUILD_LOG.md`

The prototype implements all eight modules using Next.js, NestJS and PostgreSQL. Insights uses deterministic calculations with visible source records. The README documents assumptions, permission boundaries and production gaps.

Best,
Eric

Replace placeholders only with verified details. The candidate must confirm the actual 24-hour deadline from the receipt timestamp. No email has been sent by this project.
