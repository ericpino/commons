import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import PeopleDirectory, {
  DirectoryPerson,
  DirectoryState,
  PersonCard,
  filterPeople,
} from "./people-directory";
const noop = () => {};
const teams = [
  { id: "p", name: "Product" },
  { id: "o", name: "Operations" },
];
const people: DirectoryPerson[] = [
  {
    id: "z",
    name: "Zoe Example",
    title: "Designer",
    role: "employee",
    team_id: "p",
    skills: ["Research"],
  },
  {
    id: "a",
    name: "Alex Example",
    title: "Engineer",
    role: "lead",
    team_id: "o",
    skills: ["TypeScript", "Testing", "Writing", "Research", "Design"],
  },
  {
    id: "old",
    name: "Archived Example",
    title: "Engineer",
    role: "employee",
    team_id: "o",
    skills: [],
    archived_at: "2026-11-09",
  },
];
const filters = { query: "", team: "", skill: "", archived: false };
const card = (extra: Partial<Parameters<typeof PersonCard>[0]> = {}) =>
  renderToStaticMarkup(
    <PersonCard
      person={people[1]}
      team="Operations"
      self={false}
      canAdmin={false}
      busy={false}
      onSkill={noop}
      onRecognize={noop}
      onEdit={noop}
      onArchive={noop}
      {...extra}
    />,
  );
test("directory search matches name, job title, role, team and self-listed skills alphabetically", () => {
  assert.deepEqual(
    filterPeople(people, teams, filters).map((p) => p.id),
    ["a", "z"],
  );
  for (const query of [
    "alex",
    "ENGINEER",
    "lead",
    "operations",
    "typescript",
    "operations testing",
  ])
    assert.deepEqual(
      filterPeople(people, teams, { ...filters, query }).map((p) => p.id),
      ["a"],
    );
  assert.equal(
    filterPeople(people, teams, { ...filters, team: "p", skill: "TypeScript" })
      .length,
    0,
  );
  assert.deepEqual(
    filterPeople(people, teams, { ...filters, skill: "Research" }).map(
      (p) => p.id,
    ),
    ["a", "z"],
  );
  assert.equal(
    filterPeople(people, teams, { ...filters, archived: true }).length,
    3,
  );
});
test("cards expose four skill filters and accessible expansion for remaining tags", () => {
  const html = card();
  assert.match(html, /\+1 more/);
  assert.match(html, /aria-expanded="false"/);
  assert.equal((html.match(/See colleagues who list /g) || []).length, 4);
  assert.doesNotMatch(html, />Design</);
  assert.match(html, /#people\/a/);
});
test("admin actions are absent without permission; archived entry offers Restore only", () => {
  assert.doesNotMatch(card(), /Edit person|Archive|Actions for/);
  assert.match(card({ canAdmin: true }), /Actions for Alex Example/);
  assert.match(card({ canAdmin: true }), /Edit person/);
  const archived = card({ person: people[2], canAdmin: true });
  assert.match(archived, /Restore/);
  assert.doesNotMatch(archived, /Edit person/);
  const unavailable = card({
    person: people[2],
    canAdmin: true,
    canRestore: false,
  });
  assert.match(unavailable, /disabled=""/);
  assert.match(unavailable, /Restore the colleague’s team first/);
});
test("own-card Recognize is disabled with a focusable explanation", () => {
  const html = card({ self: true });
  assert.match(html, /disabled=""/);
  assert.match(html, /You can&#x27;t recognize yourself/);
  assert.match(html, /tabindex="0"/);
});
test("score, rank and recognition aggregates in data are never projected into cards", () => {
  const person = {
    ...people[1],
    score: 98765,
    rank: 333,
    kudosCount: 444,
    recognitionCount: 555,
    bestMatch: 99,
  };
  const html = card({ person });
  assert.doesNotMatch(html, /98765|333|444|555|score|rank|kudos|best.match/i);
  assert.doesNotMatch(html, /assign|reporting line|owner of/i);
});
test("empty directory and filtered no-results states have distinct actions", () => {
  const empty = renderToStaticMarkup(
    <DirectoryState
      state="ready"
      empty
      noResults
      onRetry={noop}
      onClear={noop}
    />,
  );
  assert.match(empty, /No colleagues to show/);
  assert.match(empty, /Refresh directory/);
  const noResult = renderToStaticMarkup(
    <DirectoryState
      state="ready"
      empty={false}
      noResults
      onRetry={noop}
      onClear={noop}
    />,
  );
  assert.match(noResult, /No one lists that expertise yet/);
  assert.match(noResult, /Clear filters/);
});
test("loading, generic error and denied states have distinct accessible messaging", () => {
  for (const [state, text] of [
    ["loading", "Loading colleagues"],
    ["error", "Colleagues could not be loaded"],
    ["denied", "Directory access is unavailable"],
  ] as const)
    assert.match(
      renderToStaticMarkup(
        <DirectoryState
          state={state}
          empty={false}
          noResults={false}
          onRetry={noop}
          onClear={noop}
        />,
      ),
      new RegExp(text),
    );
});
test("directory exposes creation and archive filter only for returned root role", () => {
  const render = (role: string) =>
    renderToStaticMarkup(
      <PeopleDirectory
        people={people}
        teams={teams}
        user={{ ...people[0], role }}
        state="ready"
        busy={false}
        onRetry={noop}
        onExpertise={noop}
        onCreate={noop}
        onEdit={noop}
        onArchive={noop}
        onRecognize={noop}
      />,
    );
  assert.match(render("root"), /Create person/);
  assert.match(render("root"), /More filters/);
  for (const role of ["lead", "employee"]) {
    assert.doesNotMatch(render(role), /Create person|More filters|Edit person/);
    assert.match(render(role), /Edit my expertise/);
  }
  assert.equal(
    (render("employee").match(/Expertise is self-listed\./g) || []).length,
    1,
  );
});
