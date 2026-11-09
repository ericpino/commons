# 24-hour implementation plan

This is a time-box allocation, not a claim about actual elapsed work. The deadline must be calculated from the assessment receipt time, which has not been provided.

| Window      | Work                                                                               | Exit criterion                                                  |
| ----------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 0–2 hours   | Scope, personas, permission matrix, architecture, schema                           | One real workflow per module and written assumptions            |
| 2–5 hours   | Monorepo, PostgreSQL, idempotent schema/seed bootstrap, NestJS sessions and policy | Database-backed sign-in and isolated record access              |
| 5–10 hours  | Feed, people, organization, goals                                                  | Persistent updates, own skills, follows, team-scoped goal edits |
| 10–14 hours | Allocation, budget, audit                                                          | Opt-in workflow, finance-only writes, atomic audit events       |
| 14–17 hours | Source-backed Insights and Next.js UI                                              | All modules usable with loading/error/empty/access states       |
| 17–20 hours | Backend negative tests, integration tests, builds, responsive review               | Employee/lead/finance flows pass; no data leakage               |
| 20–22 hours | Deployment, health check, reviewer access                                          | Public HTTPS URL, PostgreSQL volume, verified sign-in           |
| 22–24 hours | README, AI log, demo rehearsal, submission                                         | Repository, live URL and build log ready                        |

## Implementation sequence

1. Keep authorization on the server and make the UI consume filtered records.
2. Use a single PostgreSQL transaction for each sensitive mutation plus its audit event.
3. Build module workflows on shared records, then add derived answers. Avoid maintaining duplicate summary data.
4. Keep Next.js and NestJS deployable as separate services. Next.js proxies `/api/*` so browser sessions remain same-origin.
5. Run policy tests and real PostgreSQL HTTP integration tests, then check the production build and responsive UI.
6. Deploy with provider-managed secrets and TLS; share the seeded-user demo password separately from the repository.

## Architecture decisions

- Next.js App Router with a client workspace UI: fast navigation for a small authenticated pilot. Production should split the large view into module components and use a query cache and route-level loading.
- NestJS API: explicit controller endpoints, parameterized SQL, server-side role checks. The compact controller is acceptable for this assessment; separate module services as domain rules grow.
- PostgreSQL: relational users/teams/session/follow/join/audit tables plus a typed record envelope with JSONB module payloads. It reduces migration overhead for a time-boxed pilot. Module-specific relational tables and numeric constraints are the next schema step.
- Opaque random sessions in an HttpOnly cookie, eight-hour expiry, SameSite Lax; origin validation for browser writes. No role or identity header is accepted as authentication.
- Mocked AI by deterministic computation: no paid API, no hallucinated numbers, source-linked arithmetic. A future LLM should only narrate already-authorized computed results.
- No global admin bypass for private records. Finance privileges cover budgets and audit, not unrestricted feed inspection.

## Risk register and cut lines

| Risk                                                  | Handling                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Missing design pack                                   | Document interpretation; preserve usable hierarchy and core principles                       |
| Shared demo password is not production authentication | Randomize at deployment; label pilot; replace with SSO before production                     |
| Hosted services unavailable                           | Deliver reproducible Docker build and deployment instructions; never claim an unverified URL |
| Time pressure                                         | Preserve all eight end-to-end workflows; cut optional polish/integrations                    |
| Permission regression                                 | Test direct record lookup, derived answers, cross-team writes and audit filtering            |
| Unbounded growth                                      | Pilot datasets only; production needs SQL-level filters/pagination and retention             |

## Next iteration

SSO and tenant isolation; versioned migrations; resource-specific tables and stronger DB constraints; rate limiting; audit log tamper resistance; pagination; optimistic concurrency/version checks; structured observability; backups/restore drills; granular budget permissions; automated browser accessibility tests; persisted in-app alerts; design-pack alignment.
