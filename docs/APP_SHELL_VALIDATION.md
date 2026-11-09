# App shell validation

Implemented November 10, 2026. Frontend layout/navigation only. API calls, routes, authentication, policy, data and dependencies are unchanged.

## Files and purpose

- `apps/web/components/app-shell.tsx`: shared shell, named navigation, drawer, expandable header search, in-flow announcements.
- `apps/web/components/shell-state.ts`: guarded desktop preference persistence, pre-paint bootstrap and drawer reducer.
- `apps/web/components/shell-focus.ts`: focus trap/return and drawer scroll lock.
- `apps/web/components/app-shell.test.tsx`: eight shell tests in the existing Node runner.
- `apps/web/app/layout.tsx`: pre-paint preference script and zoom-permitting safe-area viewport.
- `apps/web/app/page.tsx`: compose existing content into shell slots; preserve persona and logout handlers; focusable table regions; modal scroll lock.
- `apps/web/components/organization-directory.tsx`: scroll lock while the existing follow dialog is open.
- `apps/web/app/globals.css`: scoped shell breakpoints, rail, drawer, header, grid/toolbars, tables, sheets, touch targets and reduced-motion treatment.
- `README.md`: assumptions only.

## Acceptance checklist

PASS below means supported by source or unit tests, not browser certification. Visual and device-dependent conditions remain UNVERIFIED.

| Section | Status | Evidence and remaining verification |
| --- | --- | --- |
| 1. Breakpoints | PASS | `globals.css` uses phone below 640, tablet 640–1023, desktop 1024+. |
| 2. Desktop | UNVERIFIED | Rail/persistence implemented in `AppShell`, `shell-state.ts`, root pre-paint script and scoped CSS. Storage and bootstrap tests pass, including blocked storage. Actual no-flash behavior, transitions and hover/focus tooltips need browser inspection. |
| 3. Tablet | UNVERIFIED | CSS defaults to 72px rail; AppShell opens an overlay with backdrop. Actual geometry requires a viewport check. |
| 4. Phone drawer | UNVERIFIED | Reducer and focus-helper tests cover open/close, Escape, backdrop/navigation actions, trapping, return and scroll lock. Actual pointer/keyboard integration needs a browser. Swipe is omitted. |
| 5. Header | UNVERIFIED | SSR test proves View as stays outside sidebar and search exposes expansion controls. Phone CSS keeps persona/ avatar, truncates breadcrumb and expands search. Actual persona switching at phone width is unverified. Existing demoMode gating remains. |
| 6. Content | UNVERIFIED | Scoped CSS covers grids, wrapping controls/tabs, table scroll containers, full-height phone dialogs, images/long text and 44px targets. Existing 5-second notices moved below header in flow. No rendered overflow, landscape or zoom checks were possible. |
| 7. Accessibility | UNVERIFIED | Skip link, landmarks, named navigation, aria-current/expanded, focus helpers and reduced-motion rules implemented/tested. Browser focus integration and complete 4.5:1 contrast audit remain unverified. |

## Real command results

- Steps (a) shell/breakpoints, (b) persistence, (c) drawer, (d) header, (e) page responsiveness and (f) sheets/tables/toasts each ran `npm run lint && npm test`. An unused Search import during the header step failed lint; it was removed and the check rerun successfully.
- Final `npm run lint`: exit 0, ESLint plus both workspace `tsc --noEmit` commands passed.
- Final `npm test`: exit 0, 5 API and 32 frontend tests passed, 0 failures (37 total). Eight new shell tests cover storage/bootstrap, reducer transitions, focus helper contracts, navigation names, shell structure and search markup.
- These are unit/SSR tests with a DOM-contract fixture, not a browser test runner. They do not establish physical viewport layout or real browser focus behavior.
- `npm run build -w apps/web`: production build passed; `/` and `/_not-found` prerendered. Generated `next-env.d.ts` was restored to its previous bytes.
- `git diff --check`: passed.
- Lighthouse CLI unavailable. `npm ls --depth=0 axe-core @axe-core/react @axe-core/playwright lighthouse` returned an empty dependency tree. No accessibility score is claimed; no dependency installed.

## Requested viewport checks

| Pages | 320 | 375 | 768 | 1024 | 1440 | 1920 | Phone landscape / 200% zoom |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Home, People, Organization, Goals, Allocation, Budget, Insights, Compliance | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED | UNVERIFIED |

Browser access was previously rejected by the browser security policy. No alternate browser or command workaround was used. Before/after screenshots at 375, 768 and 1440 are unavailable. A permitted browser session is needed to check horizontal page overflow, clipped controls, desktop/phone focus order, native selects, persona switching, modal sheets, short landscape heights and zoom. No known rendered defect is asserted or ruled out by the source tests.

## Assumptions

Desktop collapse alone persists; tablet/phone drawers start closed. Breakpoints use CSS viewport width, including landscape and zoom. People and Organization retain their local searches without a duplicate header field. Principles remain in the drawer and appear in the content footer when the rail hides the sidebar card. Toasts reserve space beneath the sticky header. No swipe gesture or new color scheme is introduced. These assumptions are also recorded in README.
