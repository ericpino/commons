# Allocation UI acceptance report

Scope: frontend only, brief pages 2–3 and page 7's simplest working Allocation version. No API, authorization, schema, authentication, dependency or seed changes. Existing deployment-related working-tree changes were left alone.

## Acceptance

| Check                                                                                       | Result                              | Evidence                                                                                                                           |
| ------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Status/team, title, one-line description, estimates, primary action, supporting content     | PASS                                | `apps/web/components/allocation-card.tsx`; desktop screenshot                                                                      |
| Available/needed/gap; non-color gap icon; Fully covered; Typical contribution               | PASS                                | Component rendering test: planning has source and as-of per number                                                                 |
| Every planning number has dated source access                                               | PASS                                | Same test verifies four source controls and four dates; source dialog opened in browser                                            |
| Edit/Archive overflow                                                                       | FAIL — approved omission            | Existing API has no explicit edit capability; controls omitted from Allocation and its source dialog rather than inferred          |
| Equal heights and phone grid                                                                | PASS                                | Desktop first-row heights both 938.53px with list expanded; phone viewport/page width both 390px; cards 354px wide within viewport |
| Alphabetical returned colleagues, initials/title/team, three plain skill tags, +N more, You | PASS                                | Component test; Alex browser shows Maya, Root Admin, Sam in that order, exactly the returned identities                            |
| Empty versus permission-limited                                                             | PASS                                | Component tests; Maya and Sam show permission-limited message, never a zero count                                                  |
| Loading skeleton and retryable colleague error                                              | PASS                                | Component rendering tests; actual refresh uses workspace request                                                                   |
| Primary interest, saving, interested, withdraw, error/retry, archived explanation           | PASS                                | Component tests; browser Sam expressed then withdrew interest in allocation-guides, restoring original joined state                |
| Safe retry without optimistic toggle                                                        | PASS                                | Reconciliation tests cover lost successful response, failed read and withdrawal                                                    |
| Confirmation and secondary create action                                                    | PASS                                | Browser displayed exact interest confirmation; source uses five-second dismiss timer and bottom-positioned toast                   |
| Keyboard and focus                                                                          | PASS                                | Enter expanded list; Tab focused first LI; Escape closed source dialog and restored source-button focus                            |
| Contrast and reduced motion                                                                 | PASS for changed card controls/text | Existing token pairs: ink/white 11.83:1, ink/paper 11.09:1, green/white and white/green 8.22:1; scoped reduced-motion CSS          |
| No score/rank or assignment wording in card                                                 | PASS                                | Rendering test injects score/rank fields; neither rendered; prohibited wording assertion                                           |
| Three-persona UI/API agreement                                                              | PASS                                | Normal login + GET workspace and browser checks below                                                                              |
| Before/after screenshots                                                                    | PASS                                | Four files in docs/screenshots named allocation-before/after-desktop/phone.png                                                     |

The optional Show all drawer was not added; native expandable lists retain keyboard behavior. The before screenshots show the older running Docker frontend, not a source checkout rebuilt immediately before this change.

## Actual validation

- After the presentation step: lint/typechecks passed; existing backend tests 5 passed, 0 failed.
- First frontend run: 6 passed, 1 failed because a test expected no whitespace between icon and Interested; assertion corrected.
- Final checks: `npm run lint` passed, including API and web TypeScript checks. `npm test`: 5 backend and 7 frontend tests passed, 0 failed. `npm run build -w apps/web` passed.
- A late stale variable in the refresh guard failed typecheck and build; corrected, then both checks rerun successfully.
- Browser UI checked at 1280px and 390px. Source and keyboard behavior were exercised. No automated screen-reader certification is claimed.

## Persona comparison

Normal demo login to the existing API, followed by `GET /workspace`, returned HTTP 200 for Alex (lead), Maya (employee), Sam (employee, Operations). Test API sessions were logged out; no tokens were read from storage.

All three received the three company-visible opportunities. Alex received three identities for allocation-research: Maya Chen, Sam Rivera, Root Admin. The UI alphabetized these and displayed all three, including Root because the API returned that identity. Maya and Sam received an empty interests array but joined contained allocation-research. Their UI showed Interested, Withdraw interest and the permission-limited message. No identities were inferred from the full people directory. There is no private opportunity in the current fixture; no private-opportunity denial is claimed as live-tested.

Sam's browser test added then withdrew interest in allocation-guides. This restored his starting interest membership; the normal audit events remain. No records were deleted or reseeded. Error, archive, empty-owner and ambiguous-response cases use component/controller tests rather than live fixture mutation.

## Assumptions and limits

Recorded in README Assumptions: role means returned job title, falling back to permission role; full-list visibility follows the existing active-record creator/Root rule; archived lists are unavailable; dates use browser timezone; long descriptions remain available through source details. No new capability fields were invented. Reconciliation reduces duplicate-toggle risk but the existing API cannot guarantee idempotency across concurrent clients.

Preview runs at http://localhost:3102; the existing Docker frontend on 3100 was not rebuilt. Backend permission gaps previously reported are not remediated by this presentation change.
