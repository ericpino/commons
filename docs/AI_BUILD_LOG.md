# AI build log

## Tools and use

OpenAI Codex generated the initial scope, Next.js interface, NestJS endpoints, PostgreSQL schema and fictional seed data, Docker setup, CI configuration, tests and documentation. Shell tools were used to inspect files, install dependencies, build and execute checks. This log describes the actual AI-assisted process; it does not claim that the candidate manually wrote or reviewed work they have not yet reviewed.

## Useful instructions

1. Candidate direction: “Build the assessment in a separate project … Next.js for the frontend and NestJS for the back-end and PostgreSQL as the database.” This fixed project isolation and stack choice.
2. Working implementation constraint: deliver one persistent end-to-end workflow for each of eight modules, with three permission roles and no recognition scoring. This kept scope bounded while avoiding empty screens.
3. Working verification constraint: test direct API access across roles, not only UI visibility; verify financial answers and audit events do not leak to employees. This focused checks on the most consequential failure modes.

Items 2–3 record the agent's working instructions, not additional candidate messages or claims of separate human prompting.

## Rejected or rewritten direction

The available Sites hosting workflow targets Cloudflare Workers. It was rejected for deployment because substituting its database/runtime would conflict with the requested NestJS/PostgreSQL stack. The project instead uses independently runnable Node services and Docker Compose. Similarly, model-generated prose is not used to invent financial answers: Insights computes arithmetic from authorized source records and labels itself deterministic.

## Review that deserves human attention

Before submission, the candidate should personally review session handling, the `canRead`/`canManage` policy, sensitive-write transactions and audit scope, and the trade-off of JSONB module payloads. Practice explaining these decisions in the code walkthrough. Do not say these were reviewed “by hand” until that review actually happens.

## Verification

See `docs/VALIDATION.md` for executed checks and remaining limits. Tests and build outcomes should be described as tool-verified, not as evidence of human authorship.

## Architecture & requirements refinement via `$grill-me` (Matt Pocock skills)

To stress-test architectural decisions, prepare for the technical walkthrough, and uncover gaps in the initial prototype, the candidate ran an interactive `$grill-me` session using [Matt Pocock's agent skills](https://github.com/mattpocock/skills) (`.agents/skills/grilling/`).

### Key decisions and trade-offs established during the session

1. **Product framing & employee trust (Q1):**
   - Centered Commons on making day-to-day work discoverable and organizational decisions traceable, starting with employee updates and self-listed expertise.
   - Explicitly rejected recognition leaderboards, ratings, or proficiency scores to preserve psychological safety and employee trust.

2. **Explicit Next.js + NestJS + PostgreSQL boundaries (Q2):**
   - Defended separating the Next.js frontend and NestJS backend as a deliberate boundary choice: Next.js handles presentation and same-origin `/api` proxy rewrites, while NestJS centralizes session resolution, role/team authorization, business rules, and PostgreSQL transactions—acknowledging the added operational overhead compared to a single Next.js full-stack app.

3. **Transparent AI attribution (Q3):**
   - Established a clear distinction between AI-generated scaffolding/implementation and human-reviewed decisions, prioritizing human inspection of session authentication, permission policies (`canRead`/`canManage`), transactional auditing, and deterministic Insights arithmetic.

4. **Authentication vs. authorization & feed preferences (Q4):**
   - Clarified the implementation's actual session mechanism: opaque random session tokens stored in `HttpOnly` cookies (rather than `Authorization: Bearer` headers), with public access limited strictly to `/login`, `/demo-users`, and `/health`.
   - Enforced defense-in-depth at the API layer across direct record lookups, workspace payloads, derived Insights, and audit logs so hiding UI tabs is never the security boundary.
   - Kept team `Follow` strictly as a feed preference rather than an access grant, and scoped formal access-request/approval workflows out of the 24-hour pilot in favor of reliable RBAC across all eight modules.

5. **JSONB prototype compromise vs. relational financial integrity (Q5):**
   - Framed the shared `records` table with JSONB `meta` payloads as a time-boxed prototype trade-off to ship connected workflows quickly.
   - Identified **Budget** as the first module to extract into dedicated relational columns (` NUMERIC` planned/actual amounts, currency, and database `CHECK` constraints) in production so data integrity holds even against direct SQL imports or migrations.
   - Distinguished valid business overspending (which must be recorded accurately and explained via spend-driver notes, resulting in a negative remaining balance) from invalid data entry.

6. **Deterministic Insights & LLM permission boundaries (Q6):**
   - Defended deterministic backend arithmetic with explicit source citations and coverage metadata over live LLM generation to eliminate hallucination risk and API cost.
   - Established that if an LLM is introduced later for natural-language querying, authorization and aggregation must remain strictly in backend code derived from the authenticated session—because prompt instructions ("do not reveal private budgets") are not an access-control boundary against prompt injection.

7. **Transactional audit logs & asynchronous alerting (Q7–Q9):**
   - Required sensitive mutations and their `audit` entries to commit or roll back atomically in a single PostgreSQL transaction so no financial or planning mutation can persist unaudited.
   - Differentiated synchronous transactional auditing from external alerting (email for routine threshold review, SMS for urgent cases, omitting raw confidential figures from message bodies), noting that production alerting should use an asynchronous transactional outbox rather than blocking or rolling back committed business writes on third-party messaging outages. Rule triggers should flag items as "requires review" rather than declaring fraud automatically.

8. **Pilot scope & actionable engineering follow-ups (Q10–Q13):**
   - Defined the prototype honestly as a working pilot rather than hardened enterprise software (noting production prerequisites such as SSO, tenant isolation, migrations, and replacing shared demo credentials).
   - **Direct implementation outcomes triggered by the `$grill-me` session:**
     - **Complete archival CRUD (Q12):** Expanded records from create/read/partial-update to full create, view, edit, archive (soft-delete preserving audit traceability), and restore across posts, recognition, goals, opportunities, and budgets, while keeping audit logs strictly append-only.
     - **Unrestricted Root administration:** Added a `root` administrator role with full cross-team record and directory (people/teams) lifecycle management.
     - **In-app operation notifications:** Added confirmation toasts for successful mutations (explicitly distinguished from external email/SMS fraud alerts).
     - **Unified local developer experience (Q13):** Added a single root `npm run dev` launcher (`scripts/dev.mjs`) that verifies PostgreSQL connectivity and runs both NestJS and Next.js concurrently alongside Docker Compose support.

## Agentic engineering patterns: Reflection, external file synthesis, and subjective vs. objective comparison

Beyond initial code generation, the build workflow combined three deliberate agentic patterns to keep quality verifiable and prevent hallucinated compliance:

### 1. Reflection pattern (Generate → Critique → Refine → Re-verify)

Rather than treating first-pass AI output as final, each milestone ran through an explicit self-critique and verification loop:

- **Architectural & security reflection (`$grill-me`):** The agent challenged initial mental models against the actual codebase—correcting "bearer token" assumptions to the implemented `HttpOnly` cookie session model, exposing that first-pass records lacked archival deletion and full editability, and separating synchronous PostgreSQL audit transactions from asynchronous notification outboxes.
- **Implementation & UI reflection (`docs/ALLOCATION_UX_VALIDATION.md`, `docs/PEOPLE_UX_VALIDATION.md`):** After generating component updates, the agent audited its own work against an item-by-item acceptance rubric and recorded honest `PASS` / `FAIL` verdicts before fixing defects:
  - Caught and fixed a skill-picker dropdown layout shift during `Save` by switching to an overlay suggestion list that closes on selection.
  - Caught a stale variable in the Allocation colleague refresh guard during typecheck/build reflection and resolved it before completion.
  - Explicitly documented approved omissions and pre-existing backend boundaries (such as omitting Allocation card Edit/Archive overflow controls where the API lacked capability flags, and flagging `apps/api/src/main.ts` `savePerson` skill writes as a separate backend boundary rather than claiming frontend hiding solved server authorization).

### 2. Combination of external files and grounded references

To prevent the agent from relying on stale training weights or inventing unsupported features, prompts combined multiple external and repo-local reference files:

- **Assessment brief & scope specifications:** Referenced specific brief requirements (pages 2–3 and page 7 simplest working module rules) alongside `docs/SCOPE.md` and `docs/IMPLEMENTATION_PLAN.md`.
- **External agent skill definitions:** Integrated [Matt Pocock's skills](https://github.com/mattpocock/skills) (`.agents/skills/`, locked with SHA-256 provenance in `.agents/mattpocock-skills.lock.json`) for structured grilling (`grilling`), test-driven development (`tdd`), and architecture review (`codebase-design`).
- **Framework-local agent rules (`apps/web/AGENTS.md`):** Combined workspace instructions directing the agent to inspect `node_modules/next/dist/docs/` for Next.js 16 breaking changes and conventions before modifying App Router components.
- **Live schema & policy source files (`apps/api/src/schema.ts`, `apps/api/src/policy.ts`):** Grounded UI state and test assertions directly against the SQL schema and NestJS role guards so frontend components never invented fields, communities, or capabilities absent from the API.

### 3. Subjective vs. objective comparison

Every major iteration was evaluated along two complementary axes—pairing human-centered design judgment with deterministic machine checks:

| Dimension               | Subjective comparison (UX, visual hierarchy & product judgment)                                                                                                                                                                                   | Objective comparison (Deterministic metrics, tests & protocol checks)                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Visual & layout**     | Before/after visual inspection across desktop (`1280px`) and phone (`390px`) screenshots (`docs/screenshots/*-before-*.png` vs. `*-after-*.png`) for card scanability, toolbar grouping, and progressive disclosure (`+N more` chips).            | Exact DOM geometry assertions (`938.53px` matched desktop row heights, `390px` viewport with `0px` horizontal overflow across `1280px`/`900px`/`390px`) and computed WCAG contrast ratios (`11.83:1` ink/white, `11.09:1` ink/paper, `8.22:1` green).  |
| **Trust & domain copy** | Qualitative review ensuring recognition celebrates contribution without numeric ratings, leaderboards, or inferred proficiency, and that Allocation language frames opt-in as voluntary interest rather than manager assignment.                  | Automated component tests injecting synthetic `score`, `rank`, `kudosCount`, and `bestMatch` fields into fixtures and asserting zero projection into the rendered DOM (`people-directory.test.tsx`, `allocation-card.test.tsx`).                       |
| **State & permissions** | Evaluating whether empty, loading, error, and permission-limited states read clearly to each persona (e.g., distinguishing "no colleagues have expressed interest yet" from "only the opportunity owner or Root can view interested colleagues"). | Multi-persona HTTP status verification (`Root`, `Alex`, `Maya`, `Jordan`, `Sam` testing `200` vs. `403`/`404` across `/workspace`, `/records/:id`, `/insights`, and `/audit`) plus 5 backend policy tests, 15 frontend tests, and 4 PostgreSQL suites. |
| **Data & reliability**  | Assessing whether Insights explanations and Compliance audit trails give leaders enough context to trace decisions and budget variances.                                                                                                          | Verifying deterministic Insights arithmetic (`58%`, `20 hrs/week`, `1 of 3`) against seeded records, proving transaction rollback via a failing PostgreSQL audit trigger (`crud-integration.mjs`), and enforcing CI `lint`, `semgrep`, and `test`.     |

## Agentic engineering patterns: Reflection, external file synthesis, and subjective vs. objective comparison

Beyond initial code generation, the build workflow combined three deliberate agentic patterns to keep quality verifiable and prevent hallucinated compliance:

### 1. Reflection pattern (Generate → Critique → Refine → Re-verify)

Rather than treating first-pass AI output as final, each milestone ran through an explicit self-critique and verification loop:

- **Architectural & security reflection (`$grill-me`):** The agent challenged initial mental models against the actual codebase—correcting "bearer token" assumptions to the implemented `HttpOnly` cookie session model, exposing that first-pass records lacked archival deletion and full editability, and separating synchronous PostgreSQL audit transactions from asynchronous notification outboxes.
- **Implementation & UI reflection (`docs/ALLOCATION_UX_VALIDATION.md`, `docs/PEOPLE_UX_VALIDATION.md`):** After generating component updates, the agent audited its own work against an item-by-item acceptance rubric and recorded honest `PASS` / `FAIL` verdicts before fixing defects:
  - Caught and fixed a skill-picker dropdown layout shift during `Save` by switching to an overlay suggestion list that closes on selection.
  - Caught a stale variable in the Allocation colleague refresh guard during typecheck/build reflection and resolved it before completion.
  - Explicitly documented approved omissions and pre-existing backend boundaries (such as omitting Allocation card Edit/Archive overflow controls where the API lacked capability flags, and flagging `apps/api/src/main.ts` `savePerson` skill writes as a separate backend boundary rather than claiming frontend hiding solved server authorization).

### 2. Combination of external files and grounded references

To prevent the agent from relying on stale training weights or inventing unsupported features, prompts combined multiple external and repo-local reference files:

- **Assessment brief & scope specifications:** Referenced specific brief requirements (pages 2–3 and page 7 simplest working module rules) alongside `docs/SCOPE.md` and `docs/IMPLEMENTATION_PLAN.md`.
- **External agent skill definitions:** Integrated [Matt Pocock's skills](https://github.com/mattpocock/skills) (`.agents/skills/`, locked with SHA-256 provenance in `.agents/mattpocock-skills.lock.json`) for structured grilling (`grilling`), test-driven development (`tdd`), and architecture review (`codebase-design`).
- **Framework-local agent rules (`apps/web/AGENTS.md`):** Combined workspace instructions directing the agent to inspect `node_modules/next/dist/docs/` for Next.js 16 breaking changes and conventions before modifying App Router components.
- **Live schema & policy source files (`apps/api/src/schema.ts`, `apps/api/src/policy.ts`):** Grounded UI state and test assertions directly against the SQL schema and NestJS role guards so frontend components never invented fields, communities, or capabilities absent from the API.

### 3. Subjective vs. objective comparison

Every major iteration was evaluated along two complementary axes—pairing human-centered design judgment with deterministic machine checks:

| Dimension               | Subjective comparison (UX, visual hierarchy & product judgment)                                                                                                                                                                                   | Objective comparison (Deterministic metrics, tests & protocol checks)                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Visual & layout**     | Before/after visual inspection across desktop (`1280px`) and phone (`390px`) screenshots (`docs/screenshots/*-before-*.png` vs. `*-after-*.png`) for card scanability, toolbar grouping, and progressive disclosure (`+N more` chips).            | Exact DOM geometry assertions (`938.53px` matched desktop row heights, `390px` viewport with `0px` horizontal overflow across `1280px`/`900px`/`390px`) and computed WCAG contrast ratios (`11.83:1` ink/white, `11.09:1` ink/paper, `8.22:1` green).  |
| **Trust & domain copy** | Qualitative review ensuring recognition celebrates contribution without numeric ratings, leaderboards, or inferred proficiency, and that Allocation language frames opt-in as voluntary interest rather than manager assignment.                  | Automated component tests injecting synthetic `score`, `rank`, `kudosCount`, and `bestMatch` fields into fixtures and asserting zero projection into the rendered DOM (`people-directory.test.tsx`, `allocation-card.test.tsx`).                       |
| **State & permissions** | Evaluating whether empty, loading, error, and permission-limited states read clearly to each persona (e.g., distinguishing "no colleagues have expressed interest yet" from "only the opportunity owner or Root can view interested colleagues"). | Multi-persona HTTP status verification (`Root`, `Alex`, `Maya`, `Jordan`, `Sam` testing `200` vs. `403`/`404` across `/workspace`, `/records/:id`, `/insights`, and `/audit`) plus 5 backend policy tests, 15 frontend tests, and 4 PostgreSQL suites. |
| **Data & reliability**  | Assessing whether Insights explanations and Compliance audit trails give leaders enough context to trace decisions and budget variances.                                                                                                          | Verifying deterministic Insights arithmetic (`58%`, `20 hrs/week`, `1 of 3`) against seeded records, proving transaction rollback via a failing PostgreSQL audit trigger (`crud-integration.mjs`), and enforcing CI `lint`, `semgrep`, and `test`.     |

## CRUD follow-up

Codex implemented complete record editing/archival/restoration, root directory administration, action success toasts, and a combined development launcher. Verification was expanded to every record kind and directory lifecycle, employee ownership restrictions, root cross-team access, session revocation, archived-source exclusion and a deliberately failed audit insert to check rollback. Browser checks exercised goal create/edit/archive/restore and the corresponding notifications. No candidate manual review is implied by these tool-executed checks.

Added a database-backed skills catalog, authenticated GET endpoint, canonical-name validation on profile and Root writes, and a shared searchable skill picker. Preserved existing expertise during migration. Browser testing caught a dropdown layout shift during Save; suggestions now overlay without shifting the form and close upon selection. Verified selection persistence and removal, API validation, database guards and existing integration suites.

Completed the submission-readiness review: added demo-gated authenticated persona switching, protected asynchronous Insights/audit responses against stale persona results, derived goal measurements and dated evidence, five/six evidence-backed answers with coverage, team pages, interested-colleague lists for owners, readable audit subjects, access review, and auto-dismissed notifications. Backed up the local database before the authorized clean fictional reseed. Used a separate PostgreSQL database for mutation tests so the submission data remained clean. Seeded historical audit events are explicitly marked as fictional fixtures.
