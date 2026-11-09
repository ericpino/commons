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

- Next.js App Router with a responsive client workspace UI and modular components (`AppShell`, `PeopleDirectory`, `OrganizationDirectory`, `AllocationCard`, `SkillPicker`, `RecordFields`, `AuditDetails`): provides fast navigation across desktop, tablet, and phone viewports. Production should split the remaining inline views into route-level segments with a query cache.
- NestJS API: explicit controller endpoints, parameterized SQL, server-side role checks. The compact controller is acceptable for this assessment; separate module services as domain rules grow.
- PostgreSQL with Prisma 7.10.1 migrations: relational users/teams/skills/sessions/follows/joins/audit tables plus a typed record envelope with JSONB module payloads. It reduces migration overhead for a time-boxed pilot. Module-specific relational tables and numeric constraints are the next schema step.
- Opaque random sessions in an HttpOnly cookie, eight-hour expiry, SameSite Lax; origin validation for browser writes. No role or identity header is accepted as authentication.
- Mocked AI by deterministic computation: no paid API, no hallucinated numbers, source-linked arithmetic. A future LLM should only narrate already-authorized computed results.
- No global admin bypass for normal employee/lead/finance roles; Finance privileges cover budgets and audit, not unrestricted feed inspection. Root Admin is explicitly scoped as a workspace administrator role.

## Multi-device responsiveness and accessible shell architecture

To ensure all eight modules are usable across desktop monitors, tablets, and mobile phones (`320px`–`1920px+` and `200%` browser zoom), the frontend implements a responsive `AppShell` (`apps/web/components/app-shell.tsx`, `shell-state.ts`, `shell-focus.ts`) paired with scoped viewport CSS (`apps/web/app/globals.css`):

| Device tier                  | Viewport range   | Navigation & shell behavior                                                                                                                                     | Content & control layout                                                                                                                    |
| ---------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop**                  | `>= 1024px`      | Full `240px` sidebar or user-toggled `72px` compact icon rail; preference persisted via guarded `localStorage` and hydrated pre-paint in `layout.tsx` (no CLS). | Multi-column card grids (up to 3 columns), inline filter toolbars, side-by-side form fields, and centered modal dialogs.                    |
| **Tablet**                   | `640px – 1023px` | Defaults to `72px` compact icon rail to maximize workspace width; burger button opens a full-label overlay drawer with backdrop.                                | 2-column card grids, wrapping filter/action toolbars, and horizontally scrollable focusable table containers.                               |
| **Phone (portrait & small)** | `< 640px`        | Sidebar hidden off-canvas; header burger button opens a modal navigation drawer with focus trap (`Tab`/`Shift+Tab`), `Escape`/backdrop close, and scroll lock.  | Single-column (`1fr`) cards with zero horizontal page overflow (`320px`/`375px`/`390px`), expandable header search, and full-screen sheets. |

### Cross-device ergonomics and accessibility guarantees

- **Touch targets & safe areas:** Interactive buttons, burger toggles, filter chips, and nav items enforce a minimum `44x44px` hit target on coarse pointers, with zoom-permitting viewport metadata and `env(safe-area-inset-*)` padding.
- **Header & persona switching:** Keeps the `View as` persona switcher and user identity accessible outside the collapsed drawer across all breakpoints, with breadcrumb truncation and an expandable mobile search bar.
- **Keyboard, focus & motion:** Includes a `Skip to main content` link, `aria-current="page"` plus a non-color active indicator on all eight navigation items, automatic focus restoration to the burger trigger when the drawer closes, and `prefers-reduced-motion` rules disabling drawer/skeleton transitions. See [App shell validation](APP_SHELL_VALIDATION.md).

## Multi-device responsiveness and accessible shell architecture

To ensure all eight modules are usable across desktop monitors, tablets, and mobile phones (`320px`–`1920px+` and `200%` browser zoom), the frontend implements a responsive `AppShell` (`apps/web/components/app-shell.tsx`, `shell-state.ts`, `shell-focus.ts`) paired with scoped viewport CSS (`apps/web/app/globals.css`):

| Device tier                  | Viewport range    | Navigation & shell behavior                                                                                                                                     | Content & control layout                                                                                                                     |
| ---------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop**                  | `>= 1024px`       | Full `240px` sidebar or user-toggled `72px` compact icon rail; preference persisted via guarded `localStorage` and hydrated pre-paint in `layout.tsx` (no CLS). | Multi-column card grids (up to 3 columns), inline filter toolbars, side-by-side form fields, and centered modal dialogs.                     |
| **Tablet**                   | `640px – 1023px`  | Defaults to `72px` compact icon rail to maximize workspace width; burger button opens a full-label overlay drawer with backdrop.                                | 2-column card grids, wrapping filter/action toolbars, and horizontally scrollable focusable table containers.                                |
| **Phone (portrait & small)** | `< 640px`         | Sidebar hidden off-canvas; header burger button opens a modal navigation drawer with focus trap (`Tab`/`Shift+Tab`), `Escape`/backdrop close, and scroll lock.  | Single-column (`1fr`) cards with zero horizontal page overflow (`320px`/`375px`/`390px`), expandable header search, and full-screen sheets. |

### Cross-device ergonomics and accessibility guarantees

- **Touch targets & safe areas:** Interactive buttons, burger toggles, filter chips, and nav items enforce a minimum `44x44px` hit target on coarse pointers, with zoom-permitting viewport metadata and `env(safe-area-inset-*)` padding.
- **Header & persona switching:** Keeps the `View as` persona switcher and user identity accessible outside the collapsed drawer across all breakpoints, with breadcrumb truncation and an expandable mobile search bar.
- **Keyboard, focus & motion:** Includes a `Skip to main content` link, `aria-current="page"` plus a non-color active indicator on all eight navigation items, automatic focus restoration to the burger trigger when the drawer closes, and `prefers-reduced-motion` rules disabling drawer/skeleton transitions. See [App shell validation](APP_SHELL_VALIDATION.md).

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
