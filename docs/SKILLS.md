# Matt Pocock skills in Commons

The 27 skills in the upstream published engineering/productivity bundle are installed as project-local Codex skills under `.agents/skills/`. They are development workflows, not application dependencies or features exposed to Commons users.

## Start using them

Open `/Volumes/Data/projects/commons` as the Codex project. The skills will be available on your next turn in that project. This chat originally used the portfolio directory; project-local discovery depends on the active project, so open a Commons chat if the skills do not appear here.

Example requests:

- `$tdd Add a regression test for cross-team goal permissions, then implement the fix.`
- `$code-review Review the NestJS authorization and audit paths.`
- `$diagnosing-bugs Investigate a failed Commons API request.`
- `$improve-codebase-architecture Review module boundaries before proposing a refactor.`
- `$grill-with-docs Help clarify the next Commons feature.`

Select only the workflow relevant to the task. Installing these files does not execute their scripts, run a refactor, create tickets or publish anything.

## Repository workflow setup

Installation is complete. The separate interactive `$setup-matt-pocock-skills` workflow has **not** been run. Run it before using engineering workflows that require issue-tracker/domain configuration. It asks where issues live, which triage labels to use, where domain documents belong, and which agent instructions file to configure; it then presents the configuration for review.

Commons currently has no repository remote or established issue tracker. Local Markdown issues are a reasonable option until a remote is connected. Existing assessment documents remain in `docs/`.

## Installed bundle

- `ask-matt`
- `diagnosing-bugs`
- `grill-with-docs`
- `triage`
- `improve-codebase-architecture`
- `setup-matt-pocock-skills`
- `tdd`
- `to-spec`
- `to-tickets`
- `wayfinder`
- `implement`
- `implement-spec`
- `prototype`
- `research`
- `domain-modeling`
- `codebase-design`
- `code-review`
- `pr`
- `retro`
- `wizard`
- `grill-me`
- `grilling`
- `handoff`
- `teach`
- `to-questionnaire`
- `wait-what`
- `writing-for-agents`

## Provenance and updates

Source: [mattpocock/skills](https://github.com/mattpocock/skills).

Installed upstream version: `1.3.2`; revision: `4ae2317ddb22b046e26455e4f9c9b3aaaf62212d`.

The tracked `.agents/mattpocock-skills.lock.json` records the revision, upstream paths, and SHA-256 hashes of every installed file. Supporting references and scripts are preserved unchanged. The MIT license is retained in `docs/licenses/mattpocock-skills-LICENSE.txt`.

Updates are manual: review the new upstream revision, compare installed directories for local edits, replace the desired skill directories, and refresh the provenance hashes. Do not install a second global copy of the same bundle unless you intentionally want both scopes.

The bundle follows upstream's published plugin manifest. Experimental and miscellaneous skills outside that manifest were not installed.

Project-local discovery reference: [OpenAI installation documentation](https://developers.openai.com/api/reference/cli).
