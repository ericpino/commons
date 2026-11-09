# Verification results

Verified on November 9, 2026. These are executed checks, not planned checks.

| Check                                                    | Result                                                                                                                                                   |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint plus TypeScript checks for both apps              | Passed                                                                                                                                                   |
| Backend policy tests                                     | 5 passed; visibility, finance restriction, team management, invalid amounts and Root Admin access                                                        |
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

## CRUD follow-up verification

- All five record types passed create, read, update, archive and restore tests against the rebuilt Docker API and real PostgreSQL.
- Root Admin passed cross-team record access and people/team management tests. Employee and lead restrictions remain enforced.
- Archived records are excluded from active workspace results and Insights. Archived accounts cannot sign in; role changes and archival revoke affected sessions.
- Team archival dependency checks and active Root Admin self-protection passed.
- A temporary database trigger deliberately rejected an audit insert: the API returned an error and the business change rolled back. The trigger was removed afterward.
- Browser testing verified goal creation, editing, archival and restoration, with success notifications and persistence after a Docker rebuild.
- Root `npm run dev` launched both apps using the local `.env.development`; lint, TypeScript checks, policy tests and production Docker builds passed.
- The local development override uses frontend 3102 and API 4102 with the existing PostgreSQL on 55433, allowing development alongside Docker on 3100.

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

## Skills catalog follow-up

Verified authenticated GET catalog access, case-insensitive normalization, deduplication, unknown/null/over-limit rejection through both profile and Root APIs, and clearing/restoring expertise. Direct PostgreSQL writes rejected unknown user skills and case-duplicate catalog names. All three HTTP integration suites and five policy tests passed. Lint, TypeScript and Docker production builds passed. Browser verification covered searching, keyboard selection, saving, reopening persisted selections, removing a selection and saving again; original demo expertise was restored afterward.

## Submission readiness pass

The new readiness integration script passed against `commons_readiness_test`, a separate PostgreSQL database: switching personas changes API permissions, employee Insights has five answers and Finance six, each answer has coverage and arithmetic, goal progress is derived from measurement units, invalid dates/counts are rejected, only opportunity owners/Root see interested names, and audit subjects are readable. All existing HTTP suites and policy tests also passed; the submission database was not used for these mutations.

The submission database was backed up before replacement and reseeded with five teams, ten colleagues, three measured goals, a 20-hour weekly capacity gap, explained overspend, and six marked fictional audit events with distinct dates. Root is excluded from People/Organization rosters. The backup is local and Git-ignored.

Browser checks confirmed header switching (including Priya), Finance-only budget access, five/six Insights cards and expanded arithmetic, team drill-through with permission-filtered posts, dated goal measurements, clean readable audit history and the access review table. Employee Budget has no archive checkbox. Toasts disappeared automatically. The demo-disabled API check returned 404 for persona switching and preserved the employee identity. Final Docker production build passed.
