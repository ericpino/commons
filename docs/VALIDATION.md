# Verification results

Verified on November 9, 2026. These are executed checks, not planned checks.

| Check                                                    | Result                                                                                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint plus TypeScript checks for both apps              | Passed                                                                                                                                                   |
| Backend policy tests                                     | 4 passed; visibility, finance restriction, team management and invalid amounts                                                                           |
| NestJS production compile                                | Passed                                                                                                                                                   |
| Next.js 16.4.5 production build                          | Passed                                                                                                                                                   |
| Real PostgreSQL HTTP integration suite                   | Passed against standalone API and final Docker API                                                                                                       |
| Docker Compose build/start                               | Passed for PostgreSQL, NestJS and Next.js                                                                                                                |
| Frontend HTTP and proxied health check                   | HTTP 200                                                                                                                                                 |
| Same-origin cookie sign-in through Next.js               | Passed                                                                                                                                                   |
| Browser-created update persisted after container rebuild | Passed                                                                                                                                                   |
| Untrusted-origin write rejected                          | HTTP 403                                                                                                                                                 |
| Browser UI review                                        | Employee sign-in, update publishing, all module screens, finance restriction, finance budget display and edit form; narrow and desktop layouts inspected |
| Production dependency audit                              | 0 reported vulnerabilities                                                                                                                               |

The HTTP integration suite covers unauthenticated access, wrong passwords, cross-team feed isolation, direct record access, employee/lead budget restrictions, unauthorized goal changes, persistent posts, goal progress, budget validation and writes, source-backed Insights, opt-in/out, self-owned expertise, follows, audit visibility and logout.

## Remaining limits

- GitHub Actions is configured but has not run remotely: no remote repository was supplied.
- No public hosting destination, domain or deployment credentials were supplied. The verified URL is local only.
- The separate design concept PDF was not supplied. Visual fidelity to that pack has not been evaluated.
- Full development dependency audit reports 10 moderate findings in the ESLint/TypeScript-ESLint minimatch dependency chain. Production containers prune development dependencies and their audit reports zero findings. A breaking lint-tool downgrade was not applied automatically.
- Browser review is a manual smoke test, not a full automated accessibility/end-to-end suite. Budget saving, permission boundaries and persisted data are exercised by the HTTP integration suite.
- Demo authentication is deliberately simplified. Production gaps are documented in the README and plan.

## Local handoff

The full Compose stack is running at http://localhost:3100. Local demo password: `local-demo-change-me`.

Configured local host ports: frontend 3100, API 4101, PostgreSQL 55433. This avoids the existing project and common default ports. The temporary standalone test API and separate test database were stopped after verification; the delivered Compose stack remains running.

To stop the delivered stack without deleting its data:

```sh
cd /Volumes/Data/projects/commons
docker compose stop
```

To rebuild/restart with the verified ports:

```sh
DB_PORT=55433 API_HOST_PORT=4101 WEB_PORT=3100 WEB_ORIGIN=http://localhost:3100 docker compose up --build -d
```
