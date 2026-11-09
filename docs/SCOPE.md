# Commons: assessment scope

## Product point of view

Northstar employees need a low-friction way to make their work discoverable. Team leads need a reliable view of goals and staffing gaps. Finance needs transparent budget records. Connect those workflows through shared source records without turning employee contributions into performance scores.

The first pilot serves one fictional company, two teams, four people, and three permission roles. Optimize for a reviewer completing an entire workflow in minutes, rather than broad enterprise configuration.

## Minimum useful workflows

| Module       | Problem                               | Included workflow                                                                     | Acceptance criterion                                                                      |
| ------------ | ------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Home         | Contributions disappear in chat       | Publish a company or own-team update; filter by followed teams; recognize a colleague | New update persists; another team cannot fetch a private post                             |
| People       | Expertise is hard to discover         | Search names, titles and self-listed skills; edit own expertise; send recognition     | Only the authenticated person can edit their skills; recognition contains no score        |
| Organization | Teams lack shared context             | Browse team purpose and members; follow/unfollow a team                               | Follow preference persists and changes the Following feed; no access escalation           |
| Goals        | Progress lacks context                | Create goals; lead updates progress with evidence; inspect source                     | Progress and evidence persist together; another team's lead cannot edit                   |
| Allocation   | Staffing gaps are invisible           | Create opportunities; edit weekly available/needed hours; express/withdraw interest   | Capacity gap is computed; opt-in persists without changing manager or allocation          |
| Budget       | Numbers are disconnected from sources | Finance creates cost-center budget records and edits plans/actuals/driver notes       | Changes are audited; unauthorized users cannot retrieve records or derived answers        |
| Insights     | Leaders cannot trust summaries        | Compute goal average, staffing gaps and remaining budget from authorized records      | Every answer lists source records, arithmetic, as-of time and coverage caveats            |
| Compliance   | Sensitive changes are hard to trace   | Browse actor, time, action, record and before/after values                            | Financial and planning writes commit with an audit entry; audit visibility is role-scoped |

## Personas and permissions

- Maya Chen, employee, Product: company content and own-team content; create updates and recognition; own expertise; opt-in and follows; own audit events.
- Alex Morgan, lead, Product: employee access plus Product goal/capacity management and non-financial team audit events.
- Jordan Lee, finance admin, Operations: company content, own-team content, all budgets, cross-team planning management, all audit events. Finance is not a blanket grant to read other teams' private feed records.
- Sam Rivera, employee, Operations: demonstrates cross-team private-content isolation.

Following affects feed selection, not authorization. Default feed includes all accessible updates. Insights uses accessible records irrespective of follow preference to avoid accidentally omitting sources. This is an explicit interpretation of the brief's follower/permission language.

## Product principles

No recognition score, endorsement rating, performance ranking, inferred skill level or automatic reporting-line change exists. Profiles belong to their owners. Opportunity joins express interest, not binding staffing assignments. Finance visibility is enforced at the API. Audit events are append-only through the application; database administrators could still alter them.

## Deliberate scope limits

No SSO, tenant provisioning, email delivery, calendar integration, comments, uploads, external document ingestion, real LLM calls, automated alerts, community administration or drag-and-drop page customization. Organization structure is the seeded team membership and lead role, not a configurable org chart. Recognition uses one contribution badge. Budget driver notes are manual source records, not an accounting integration. Goal progress is owner-reported and not an independent measurement.

All eight modules work at a basic level; optional design-pack interactions are excluded. The separate concept PDF was not supplied, so the layout is an original interpretation of the brief. Additional visual alignment requires that PDF.

## Success measures for pilot

A reviewer can publish and re-read an update, find a colleague by expertise, follow a team, update a goal with evidence, express interest in an opportunity, change a budget as finance, verify an Insights answer against its records, and inspect its audit event. Permission-negative tests must pass, not merely hidden UI controls.
