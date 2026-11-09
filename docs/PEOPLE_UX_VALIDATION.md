# People UX validation — 9 November 2026

Scope: brief p3 People hub, current stack and frontend only. Preview: http://localhost:3102/#people. The older Docker frontend at port 3100 was not rebuilt.

## Files and purpose

- `apps/web/components/people-directory.tsx`: returned-data search/filtering, alphabetical cards, overflow controls, expandable skills, profile navigation and directory states.
- `apps/web/app/page.tsx`: existing workspace/API integration, retry state, profile source records, existing opt-in opportunities, own-expertise-only UI and recognition confirmation.
- `apps/web/app/globals.css`: scoped responsive layout, existing tokens, focus and reduced-motion styles.
- `apps/web/components/people-directory.test.tsx`: eight tests using the existing Node/tsx/React runner; no dependency added.
- README: explicit People assumptions and existing backend limitation. Screenshots below capture the change.

## Acceptance checklist

PASS means the listed evidence supports the frontend requirement; it does not certify the entire backend.

| Item | Result | Evidence |
| --- | --- | --- |
| 1. Create placement | PASS | Desktop screenshot: right end of toolbar, after Edit my expertise. |
| 2. Controls grouping | PASS | Search/team/skill/actions aligned; Root archive checkbox in More filters. No scope label because the checked API directory scope does not differ by role. |
| 3. Card hierarchy | PASS | Left-aligned linked avatar/name, job title/team; desktop and phone screenshots. |
| 4. Repeated expertise disclaimer | PASS | One statement above toolbar; test `directory exposes creation and archive filter only for returned root role`. |
| 5. Action hierarchy | PASS | Heart Recognize button; administration in Root-only native details; live Root form inspected. |
| 6. Skill tags | PASS | Four tags and +N more; live Leo expansion revealed TypeScript and Show fewer. Component test verifies initial four and expansion control. |
| 7. Local filters | PASS | `filterPeople` test covers name/title/role/team/skills and intersections; live TypeScript filter returned Alex, Leo and Owen (3 colleagues). |
| 8. Profile navigation | PASS | Live Alex link opened #people/alex and focused heading; reload retained profile, Back to colleagues worked. Existing returned work and recognition retain source controls/as-of dates. |
| 9. States | PASS | State component tests cover skeleton, empty, no-results, denied and error/retry. Live zzzz query displayed exact requested no-results message and clear action. Network failure and denial rendered in component tests, not injected into the live API. |
| A. Header/controls | PASS | Desktop screenshot, root/lead/employee component tests; alphabetical default. Optional Team grouping omitted. |
| B. Cards | PASS | Card tests and live checks; own recognition disabled with focusable explanation; native controls avoid nested links. 1280px: 3 columns; 900px: 2; 390px: 1. |
| C. Existing opportunities | PASS | Existing returned allocation records below directory, source link and opt-in interest/withdrawal handler reused. No communities API or invented communities. |
| D. States/confirmation | PASS | Component tests and workspace retry wiring; page.tsx success message `Recognition sent.` and existing 5000ms dismissal. A new recognition was not submitted during this pass, to avoid adding test artifacts to demo content. |
| E. Quality floor | PASS | Scoped focus-visible, semantic labels/native controls, static skeleton, reduced-motion rule; existing ink/green tokens. No horizontal overflow at 1280/900/390px. No new libraries, fonts, fields or seed content. Full assistive-technology audit remains unverified. |
| Server owner-only expertise | FAIL (pre-existing) | `apps/api/src/main.ts:594` accepts b.skills in Root savePerson and writes it at line 598. UI no longer sends it, but that is not server authorization. Requires separately approved backend work. |

## Real command results

After card/toolbar step: npm run lint (ESLint + API/web typechecks) exit 0; npm test: API 5 passed, web 7 passed.

After profile/states/test step and final restore guard: npm run lint exit 0; npm test: API **5 passed, 0 failed**, web **15 passed, 0 failed** (8 new People tests, 7 existing Allocation tests). Production `npm run build -w apps/web`: exit 0, compiled successfully, TypeScript finished, 3 static pages generated. Generated next-env.d.ts was restored to its original contents.

HTTP checks used normal demo login, GET /workspace?archived=true, then logout; no tokens read from storage or printed. Sandbox first returned EPERM; the approved local request then returned:

| Persona | Workspace | Returned role | Returned people | Non-root PATCH /people/alex with {} |
| --- | --- | --- | --- | --- |
| Root Admin | 200 | root | 11 | Not attempted |
| Alex Morgan | 200 | lead | 11 | 403 |
| Maya Chen | 200 | employee | 11 | 403 |

All responses returned alex, ella, imani, jordan, leo, maya, nina, owen, priya, root, sam. The UI displays 10 because it preserves the documented Root demo-account exclusion. This is a presentation difference, not an authorization boundary. No archived people were needed for live verification; archive/restore controls were tested with fictional component fixtures. Root edit form had name/title/role/team and no skill picker. Lead/employee browser DOM had no Create person or administration menus; own Recognize was disabled. No action/API permission mismatch was observed in those checks. Existing Root skill-write exception remains the explicit FAIL above.

The recognition/rank test injects score, rank, kudosCount, recognitionCount and bestMatch fields into a fixture and proves none appear in rendered cards. No new code reads or orders by such fields. This test is not a complete API security audit.

Computed contrast for the new directory token pairs: ink/white **11.83:1**, ink/paper **11.09:1**, green/white **8.22:1**. These measurements cover the specified new text/button pairs, not an audit of every inherited shell style.

## Screenshots

| Width | Before | After |
| --- | --- | --- |
| Desktop 1280px | [Before](screenshots/people-before-desktop.png) | [After](screenshots/people-after-desktop.png) |
| Phone 390px | [Before](screenshots/people-before-phone.png) | [After](screenshots/people-after-phone.png) |

## Assumptions and unchanged scope

All assumptions are recorded under README Assumptions and limits: client filtering of returned records, role-derived administration controls matching the existing guard, no misleading scope chip, Root demo exclusion, hash-based profiles of existing records, opportunities only, browser timezone and omitted optional grouping. API, authentication, policy, database, seeds and dependencies were not changed. Concurrent deployment/CI edits in the workspace were preserved and excluded from People commits.

Not verified: live recognition submission/toast timing, forced real network failure/403 directory response, every screen-reader/browser combination, full backend principle compliance. Existing component/state evidence is distinguished from live evidence above.
