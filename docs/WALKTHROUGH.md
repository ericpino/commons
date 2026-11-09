# Demo and code walkthrough

## 15-minute product demo

1. **0–2 min — Framing.** Commons connects visible contributions with trustworthy planning. Eight modules, one fictional company, three permission roles. No ratings or surveillance-style inferred expertise.
2. **2–5 min — Employee.** Sign in as Maya. Share a team-private update, search People for customer research, recognize Sam, edit Maya's self-listed skills, follow Operations. Show the Following feed.
3. **5–7 min — Invitations.** Open Allocation and express interest. Explain that it does not assign a manager or commit capacity. Withdraw interest to demonstrate reversibility.
4. **7–9 min — Team lead.** Sign out and select Alex. Update the onboarding goal with concrete evidence. Adjust capacity. Show the saved changes and team audit event.
5. **9–12 min — Finance.** Select Jordan. Update the Product pilot budget, inspect the before/after audit event, then open Insights and show remaining budget arithmetic and both source records.
6. **12–14 min — Boundaries.** Select Sam. Product-private updates are absent. Budget access is blocked. Insights has no financial answer. Explain the same checks exist on direct API requests.
7. **14–15 min — Trade-offs.** Missing concept pack; deterministic AI; pilot JSONB schema; owner-reported progress. State what you would validate with the pilot customer and build next.

## Code walkthrough

- `apps/api/src/policy.ts`: company/team/finance visibility and team-scoped management.
- `apps/api/src/main.ts`: opaque sessions, parameterized SQL, direct record lookup, transactional budget write and audit entry, permission-filtered Insights.
- `apps/api/src/schema.ts`: relationships, unique joins/follows, no skill ratings or inferred performance.
- `scripts/integration.mjs`: negative authorization tests with real HTTP and PostgreSQL.
- `apps/web/app/page.tsx`: module workflows and the source-evidence dialog.
- `compose.yaml` and `.github/workflows/ci.yml`: reproducibility and continuous checks.

## Questions to be ready for

Why JSONB? Why not a real LLM? Does following grant access? How are competing edits handled? Can an administrator tamper with audit logs? How would you add tenant isolation? What does joining an opportunity commit? What is required before production? Use the limitations honestly rather than describing unimplemented functionality.
