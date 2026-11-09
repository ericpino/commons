# Organization UX validation — 10 November 2026

Scope: Organization teams/roles/structure and the existing team page; P3 follow-only per explicit user approval. Frontend only. P3 notification preferences and optional P2 customization are intentionally skipped.

## Files changed

| File                                                  | Purpose                                                                                                                                                     |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/components/organization-directory.tsx`      | Local search, monogram cards, permission-dependent controls, team sections, role grouping, dated record facts, section boundaries and native follow dialog. |
| `apps/web/components/organization-follow.ts`          | Read current follow state before using the existing toggle endpoint, including retries.                                                                     |
| `apps/web/components/organization-directory.test.tsx` | Nine tests in the existing Node/tsx/React runner.                                                                                                           |
| `apps/web/app/page.tsx`                               | Existing workspace refresh/error handling, persona checks, source/Goals links, follow handler and existing five-second confirmation toast.                  |
| `apps/web/app/globals.css`                            | Scoped layout, responsive two/one-column grid, focus, contrast tokens and reduced-motion rules.                                                             |
| README and this report                                | Assumptions, approved omissions, evidence and limitations.                                                                                                  |

Implementation commit: `ffb1d9a` — `M03/P3: improve Organization and add follow-only settings`.

## Acceptance checklist

PASS indicates the stated source/test evidence. It does not imply browser verification where none was possible.

| Item                                  | Status                | Evidence / qualification                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Create-team placement              | PASS                  | `organization-directory.tsx`: toolbar search followed by right-aligned Root-only Create team; scoped toolbar CSS.                                                                                                                                                                                                                                        |
| 2. Admin actions                      | PASS                  | `TeamCard` native details menu, labelled summary; permission test. Active dependencies disable Archive with explanatory text, matching the API guard.                                                                                                                                                                                                    |
| 3. Follow control                     | PASS                  | `FollowButton` compact secondary with check/aria-pressed. Both states open `FollowPopup`; Unfollow is inside. Disclaimer appears only in the popup.                                                                                                                                                                                                      |
| 4. Plurals and source links           | PASS                  | `organization labels are pluralized and link to dated source sections`; shared goal/update links target team sections. Cards and result counts have as-of dates.                                                                                                                                                                                         |
| 5. Members                            | PASS                  | Preview up to four, dated total and +N more link; single lead tag; preview/role grouping test. All active returned non-Root members appear on the team page.                                                                                                                                                                                             |
| 6. Distinguishable icons              | PASS                  | `TeamCard` derives monogram from team name; existing paper/ink tokens, no assets.                                                                                                                                                                                                                                                                        |
| 7. Structure and engagement           | PASS                  | `RoleGroups` uses listed job titles, not reporting lines. `teamFacts` counts active returned post/goal/allocation records only; source sections and snapshot dates. No follower/kudos metric, comparison or ranking is projected.                                                                                                                        |
| 8. Search and states                  | PASS                  | Search-by-role/alphabetical/archive test; separate loading, empty, no-result, generic-error and denied component test.                                                                                                                                                                                                                                   |
| 9. Follow & alerts                    | SKIPPED (alerts only) | Follow popup implemented. Stored alert preferences do not exist; user approved follow-only. No nonfunctional checkboxes or invented preference persistence.                                                                                                                                                                                              |
| A. Header/controls                    | PASS                  | Search/create toolbar, Root More filters and dated result count. Scope label omitted because all checked roles receive the same team list. Existing heading/subtitle retained.                                                                                                                                                                           |
| B. Cards                              | PASS                  | Source and component tests cover hierarchy, four-member preview, role tag, linked plurals, follow state, admin guard and archive explanation. Responsive CSS uses two columns, one at 760px and below; actual visual layout unverified.                                                                                                                  |
| C. Team page                          | PASS                  | Existing team destination improved with hash-linked purpose, members/roles, shared goals, recent updates, open invitations and engagement. Goal actions open Goals plus the existing source detail. Each section has empty copy and a rendering error boundary/retry. Network errors affect the shared workspace request, not independent API endpoints. |
| D. Approved follow-only popup         | PASS                  | `FollowContent` tests saving/error/retry/Unfollow presence. Native `dialog.showModal()` supplies focus containment; cleanup restores prior focus and cancel closes on Esc. Successful handler uses existing 5000ms toast. Browser interaction/timing not verified.                                                                                       |
| D. Alert preferences                  | SKIPPED               | Explicit approval: “go, follow-only.” No API or schema change.                                                                                                                                                                                                                                                                                           |
| E. Customize page                     | SKIPPED               | Optional, outside approved scope; no owner/preference persistence invented.                                                                                                                                                                                                                                                                              |
| F. Accessibility/state implementation | PASS                  | Labelled controls, semantic links/buttons/details, aria-pressed, visible focus and reduced-motion CSS; static skeleton and explicit status text. New directory text uses existing ink/green colors.                                                                                                                                                      |
| F. Visual/keyboard acceptance         | SKIPPED               | Browser security policy rejected observation. Desktop/phone screenshots, live focus/Esc checks and visual contrast/layout inspection could not be performed. This is not a full accessibility certification.                                                                                                                                             |

## Real validation output

First implementation step: `npm run lint` exit 0 (ESLint and API/web TypeScript checks); `npm test` 5 API + 15 frontend passed.

After Organization tests and final code adjustment: `npm run lint` exit 0; `npm test` **5 API + 24 frontend passed, 0 failed**. The nine added tests cover plurals/links/dates; permission menus/archive dependencies; visible-record-only facts; previews and role grouping; search; follow/popup states; safe retries; empty/error/denied states; and exclusion of injected score/rank/kudos fields.

`npm run build -w apps/web`: exit 0. Next.js 16.4.5 compiled successfully, TypeScript passed and 3 static pages generated. Existing generated `next-env.d.ts` contents were preserved.

The first standalone API-to-component comparison failed with `React is not defined` because it used the root JSX configuration. Rerunning with `TSX_TSCONFIG_PATH=apps/web/tsconfig.json` passed. This was a verification harness issue; the existing frontend runner and production build passed.

## Three-persona API/component comparison

Normal demo logins against `http://localhost:4101`, GET `/workspace?archived=true`, rendered the actual returned data through the new React component, then logged out. Tokens were neither stored in files nor printed. Non-admin PATCH `/teams/product` with `{}` was rejected before any write.

| Persona                         | Workspace status | Returned teams | Product updates | Product-private post | Rendered admin controls | Direct team edit |
| ------------------------------- | ---------------- | -------------- | --------------- | -------------------- | ----------------------- | ---------------- |
| Root Admin                      | 200              | 5              | 3               | Present              | Present                 | Not submitted    |
| Alex Morgan, Product lead       | 200              | 5              | 3               | Present              | Absent                  | 403              |
| Sam Rivera, Operations employee | 200              | 5              | 2               | Absent               | Absent                  | 403              |

Rendered fact labels matched the API-derived counts for all three. No permission/action mismatch was observed in these checks. Active-team archive actions are disabled based on returned dependencies (Root receives all records). This is API plus component rendering verification, not a browser persona walkthrough. Follow mutations and Root administrative mutations were not submitted against demo data during this pass.

Intentional presentation differences: archived teams are hidden by default; non-Root roles have no archive filter. The fictional Root account remains omitted from member previews and structure, as in the prior build. These filters are not authorization. Facts do not use the existing API follower aggregate, and recognition records are never counted.

## Browser limitation and assumptions

Attempting to observe the existing preview was rejected by browser security policy: it did not grant access to the tab and reported a disallowed URL protocol. No alternate browser surface or indirect automation was used to bypass that restriction. Before/after screenshots and live popup keyboard behavior remain unverified. A later authorized browser session is needed to complete those checks.

README Assumptions and limits records: role grouping from existing titles; active allocations treated as open invitations; snapshot/browser-local dates; Root role as the existing permission signal; no misleading scope label; existing Root demo-account exclusion; shared workspace failure boundary; and toggle retry concurrency limitations.

API contracts, authentication, policy, Prisma schema/migrations, seed data, libraries and fonts were unchanged by this Organization work. Existing unrelated workspace changes were preserved and excluded from its implementation commit.
