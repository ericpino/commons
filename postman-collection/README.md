# Commons Postman collection

Import both files into Postman:

- `Commons.postman_collection.json`
- `Commons.local.postman_environment.json`

Select **Commons Local**, then send **01 · Start here → Login — establish session cookie**. The environment defaults to the local demo Root account so all administration examples are accessible. Postman stores the `commons_session` cookie automatically; keep its cookie jar enabled. The current API does not issue or accept a Bearer token.

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3100/api` | Running Docker frontend proxy; use `http://localhost:4101` for direct NestJS, or `http://localhost:3102/api` for the local dev runner. No trailing slash. |
| `demoPassword` | `local-demo-change-me` | Published local demo password; replace if your server uses another value. |
| `loginUserId` | `root` | Change to an active persona such as `maya`, `alex`, or `jordan`. |
| `viewAsUserId` | `alex` | Target of the demo-only switch request. |
| `teamId` | `product` | Team used in creation payloads; ordinary users must respect their team permissions. |
| `recipientId` | `maya` | Recognition recipient, who must differ from the signed-in author. |

## Requests and payloads

The collection has 46 example requests covering all 25 current API routes. Each create request captures its returned ID in a collection variable. Send Create before its Read, Update, Archive or Restore requests; a pre-request check rejects missing IDs. No existing seeded record IDs are used for those lifecycle examples. Goal payloads include completed units, total units, a measurement unit and dated evidence. The collection supplies the current UTC date for `evidenceDate` at request time.

Examples include all five record kinds, people/team administration, skills catalog and own expertise, joining/following, Insights, audit, persona switching and logout. Payloads use the API's flat fields (`teamId`, `completed`, `actual`, etc.), not a nested `data` object. Skills are selected by canonical names returned by `GET /skills`.

Read people and teams through `GET /workspace`: standalone GET people/team endpoints do not exist. Joining and following are toggles; sending twice reverses the action. Archive is reversible. Team archive returns 409 if active people or records still reference the team.

Mutation requests write to the configured database. Do not run the full collection against the clean submission demo unless you want example records and audit events added. Use a separate test API/database for a collection run. Requests are examples of the existing implementation, including its current security-review limitations, rather than security fixes.

Authentication troubleshooting: 401 means sign in again with Login; 403 generally means the selected persona lacks permission; inaccessible records can return 404. After changing `baseUrl` to another hostname, sign in there again. An archived person cannot sign in. Persona switching requires `DEMO_MODE=true` and changes subsequent request permissions.

Validation performed: both files parse as JSON, every raw JSON payload parses, collection routes match all current NestJS route decorators, and all embedded scripts pass JavaScript syntax checks. Requests were not executed, so the live demo data was not changed.
