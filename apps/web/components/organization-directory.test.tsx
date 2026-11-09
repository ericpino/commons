import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import OrganizationDirectory, {
  FollowButton,
  FollowContent,
  OrganizationStatus,
  RoleGroups,
  TeamCard,
  plural,
  searchTeams,
  teamFacts,
  OrganizationRecord,
} from "./organization-directory";
import { reconcileFollow } from "./organization-follow";
const noop = () => {};
const team = {
  id: "product",
  name: "Product & Engineering",
  mission: "Help colleagues discover work.",
};
const people = [
  {
    id: "alex",
    name: "Alex Example",
    title: "Engineering lead",
    role: "lead",
    team_id: "product",
  },
];
const records: OrganizationRecord[] = [
  {
    id: "goal",
    kind: "goal",
    team_id: "product",
    title: "Shared goal",
    body: "Fictional goal",
    updated_at: "2026-11-10T00:00:00Z",
  },
  {
    id: "post",
    kind: "post",
    team_id: "product",
    title: "Visible update",
    body: "Fictional update",
    updated_at: "2026-11-10T00:00:00Z",
  },
];
const card = (extra: Partial<Parameters<typeof TeamCard>[0]> = {}) =>
  renderToStaticMarkup(
    <TeamCard
      team={team}
      members={people}
      allPeople={people}
      records={records}
      canAdmin={false}
      following={false}
      busy={false}
      asOf="2026-11-10T00:00:00Z"
      onFollow={noop}
      onEdit={noop}
      onArchive={noop}
      {...extra}
    />,
  );
test("organization labels are pluralized and link to dated source sections", () => {
  assert.equal(plural(0, "shared goal"), "0 shared goals");
  assert.equal(plural(1, "visible update"), "1 visible update");
  assert.equal(plural(2, "team"), "2 teams");
  const html = card();
  assert.match(html, /1 shared goal</);
  assert.match(html, /1 visible update</);
  assert.match(html, /#organization\/product\/goals/);
  assert.match(html, /#organization\/product\/updates/);
  assert.match(html, /As of/);
});
test("team facts count only active returned records for that team, never recognition", () => {
  const facts = teamFacts(
    [
      ...records,
      { ...records[0], id: "archived", archived_at: "2026-11-10" },
      { ...records[1], id: "other", team_id: "operations" },
      { ...records[1], id: "kudos", kind: "recognition" },
    ],
    team.id,
  );
  assert.deepEqual(
    facts.goals.map((r) => r.id),
    ["goal"],
  );
  assert.deepEqual(
    facts.updates.map((r) => r.id),
    ["post"],
  );
  assert.equal(facts.invitations.length, 0);
  assert.equal(teamFacts([], team.id).updates.length, 0);
});
test("administration menus require root permission and used teams cannot be archived", () => {
  assert.doesNotMatch(card(), /Edit team|Archive|Actions for/);
  const root = card({ canAdmin: true });
  assert.match(root, /Actions for Product/);
  assert.match(root, /disabled="">Archive/);
  assert.match(root, /Active members or records/);
  assert.doesNotMatch(
    card({ canAdmin: true, allPeople: [], members: [], records: [] }),
    /disabled="">Archive/,
  );
  const archived = card({
    canAdmin: true,
    team: { ...team, archived_at: "2026-11-10" },
  });
  assert.match(archived, /Restore/);
  assert.doesNotMatch(archived, /Edit team/);
  assert.match(archived, /Archived teams cannot be followed/);
});
test("member preview caps at four, links remaining members and gives a single lead tag", () => {
  const members = Array.from({ length: 6 }, (_, i) => ({
    ...people[0],
    id: String(i),
    name: `Person ${i}`,
    role: i === 0 ? "lead" : "employee",
  }));
  const html = card({ members });
  assert.match(html, /6 members/);
  assert.match(html, /\+2 more/);
  assert.doesNotMatch(html, /Person 4|Person 5/);
  assert.equal((html.match(/>Team lead</g) || []).length, 1);
  const grouped = renderToStaticMarkup(<RoleGroups people={people} />);
  assert.equal((grouped.match(/Engineering lead/g) || []).length, 1);
});
test("team search matches listed roles, sorts alphabetically and omits archives", () => {
  const teams = [
    team,
    { id: "ops", name: "Customer Operations", mission: "Support" },
    { id: "old", name: "Archived", mission: "Old", archived_at: "2026-11-10" },
  ];
  assert.deepEqual(
    searchTeams(teams, people, "engineering lead", false).map((t) => t.id),
    ["product"],
  );
  assert.deepEqual(
    searchTeams(teams, people, "", false).map((t) => t.id),
    ["ops", "product"],
  );
  assert.equal(searchTeams(teams, people, "", true).length, 3);
});
test("follow button exposes pressed state; popup is follow-only with saving and retry states", () => {
  assert.match(
    renderToStaticMarkup(
      <FollowButton following disabled={false} onClick={noop} />,
    ),
    /aria-pressed="true"/,
  );
  assert.match(
    renderToStaticMarkup(
      <FollowButton following={false} disabled={false} onClick={noop} />,
    ),
    />Follow</,
  );
  const props = {
    name: team.name,
    following: true,
    state: "ready" as const,
    error: "Connection failed",
    onSave: noop,
    onUnfollow: noop,
    onRetry: noop,
    onClose: noop,
  };
  const html = renderToStaticMarkup(<FollowContent {...props} />);
  assert.match(html, /Unfollow/);
  assert.match(html, /Save/);
  assert.match(html, /doesn&#x27;t give you access/);
  assert.doesNotMatch(html, /checkbox|new updates|notification preferences/i);
  assert.doesNotMatch(
    renderToStaticMarkup(<FollowContent {...props} following={false} />),
    />Unfollow</,
  );
  assert.match(
    renderToStaticMarkup(<FollowContent {...props} state="saving" />),
    /Saving\.\.\./,
  );
  const error = renderToStaticMarkup(
    <FollowContent {...props} state="error" />,
  );
  assert.match(error, /role="alert"/);
  assert.match(error, />Retry</);
});
test("follow retry does not reverse an ambiguous success or toggle after a failed read", async () => {
  let toggles = 0;
  const toggle = async () => {
    toggles++;
    return { following: true };
  };
  assert.equal(await reconcileFollow(true, async () => true, toggle), true);
  assert.equal(toggles, 0);
  await assert.rejects(
    reconcileFollow(
      true,
      async () => {
        throw new Error("read failed");
      },
      toggle,
    ),
  );
  assert.equal(toggles, 0);
  assert.equal(await reconcileFollow(true, async () => false, toggle), true);
  assert.equal(toggles, 1);
  assert.equal(
    await reconcileFollow(
      false,
      async () => true,
      async () => ({ following: false }),
    ),
    false,
  );
  await assert.rejects(
    reconcileFollow(
      true,
      async () => false,
      async () => ({ following: false }),
    ),
    /changed elsewhere/,
  );
});
test("organization has distinct loading, empty, no-result, error and denied states", () => {
  const props = {
    state: "ready" as const,
    empty: false,
    noResults: false,
    canCreate: false,
    onRetry: noop,
    onClear: noop,
    onCreate: noop,
  };
  for (const [state, text] of [
    ["loading", "Loading teams"],
    ["error", "Teams could not be loaded"],
    ["denied", "Organization access is unavailable"],
  ] as const)
    assert.match(
      renderToStaticMarkup(<OrganizationStatus {...props} state={state} />),
      new RegExp(text),
    );
  assert.match(
    renderToStaticMarkup(<OrganizationStatus {...props} empty />),
    /No teams yet/,
  );
  assert.match(
    renderToStaticMarkup(<OrganizationStatus {...props} empty canCreate />),
    /Create team/,
  );
  assert.match(
    renderToStaticMarkup(<OrganizationStatus {...props} noResults />),
    /Clear filters/,
  );
});
test("directory projects no scores, recognition aggregates, rankings or people comparisons", () => {
  const scored = { ...team, score: 987654, rank: 654321, kudosCount: 333333 };
  const html = card({ team: scored });
  assert.doesNotMatch(
    html,
    /987654|654321|333333|kudos|rank|score|most engaged|reports to/i,
  );
  for (const userRole of ["root", "lead", "employee"]) {
    const directory = renderToStaticMarkup(
      <OrganizationDirectory
        teams={[team]}
        people={people}
        records={records}
        userRole={userRole}
        following={[]}
        asOf="2026-11-10T00:00:00Z"
        state="ready"
        busy={false}
        onRetry={noop}
        onCreate={noop}
        onEdit={noop}
        onArchive={noop}
        onFollow={async () => {}}
        onSource={noop}
        onGoal={noop}
      />,
    );
    if (userRole === "root")
      assert.match(directory, /Create team|More filters/);
    else
      assert.doesNotMatch(
        directory,
        /Create team|More filters|Edit team|Actions for/,
      );
  }
});
