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

## CRUD follow-up

Codex implemented complete record editing/archival/restoration, root directory administration, action success toasts, and a combined development launcher. Verification was expanded to every record kind and directory lifecycle, employee ownership restrictions, root cross-team access, session revocation, archived-source exclusion and a deliberately failed audit insert to check rollback. Browser checks exercised goal create/edit/archive/restore and the corresponding notifications. No candidate manual review is implied by these tool-executed checks.
