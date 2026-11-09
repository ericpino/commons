import { test } from "node:test";
import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import AllocationCard, { AllocationCardProps } from "./allocation-card";
import { reconcileInterest } from "./allocation-interest";
const noop = () => {};
const props: AllocationCardProps = {
  record: {
    id: "a",
    title: "Review guide",
    body: "Help with a shared guide.",
    team_id: "product",
    owner_id: "alex",
    updated_at: "2026-11-09T08:00:00Z",
    data: { capacity: 8, needed: 16, hours: 4 },
  },
  user: { id: "alex", role: "lead" },
  team: () => "Product",
  people: [],
  interests: [],
  joined: false,
  state: { status: "idle" },
  onInterest: noop,
  onWithdraw: noop,
  onRetry: noop,
  onReload: noop,
  onSource: noop,
};
const render = (overrides: Partial<AllocationCardProps> = {}) =>
  renderToStaticMarkup(<AllocationCard {...props} {...overrides} />);
test("interest button renders default, saving, success and retry states", () => {
  assert.match(render(), /I&#x27;m interested/);
  const saving = render({ state: { status: "saving" } });
  assert.match(saving, /Saving\.\.\./);
  assert.match(saving, /disabled=""/);
  const done = render({ joined: true });
  assert.match(done, />\s*Interested</);
  assert.match(done, /Withdraw interest/);
  assert.doesNotMatch(done, /I&#x27;m interested/);
  const failed = render({
    state: { status: "error", message: "Could not save" },
  });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Could not save/);
  assert.match(failed, />Retry</);
});
test("empty and permission-limited colleagues are distinct without disclosing a count", () => {
  assert.match(render(), /Interested colleagues \(0\)/);
  assert.match(render(), /Be the first/);
  const restricted = render({ user: { id: "sam", role: "employee" } });
  assert.match(restricted, /You can&#x27;t see who else is interested/);
  assert.doesNotMatch(restricted, /colleagues \(0\)|Be the first/);
});
test("returned colleagues are alphabetical, self-labelled, and skills have no scores or ranks", () => {
  const people = [
    {
      id: "z",
      name: "Zoe Example",
      title: "Designer",
      role: "employee",
      team_id: "product",
      skills: ["Research"],
    },
    {
      id: "alex",
      name: "Alex Example",
      title: "Engineer",
      role: "lead",
      team_id: "product",
      skills: ["Writing", "Testing", "Research", "Design"],
      score: 99,
      rank: 1,
    },
  ];
  const html = render({
    people,
    interests: people.map((p) => ({ record_id: "a", id: p.id, name: p.name })),
  });
  assert.ok(html.indexOf("Alex Example") < html.indexOf("Zoe Example"));
  assert.match(html, />You</);
  assert.match(html, /\+1 more/);
  assert.doesNotMatch(html, /score|rank|99|best fit|match percentage/i);
  assert.doesNotMatch(render(), /assign|allocated to|owner of/i);
});
test("planning has source and as-of per number; covered and archived states explain themselves", () => {
  assert.equal((render().match(/View source/g) || []).length, 4);
  assert.equal((render().match(/As of/g) || []).length, 4);
  assert.match(
    render({
      record: { ...props.record, data: { capacity: 8, needed: 8, hours: 2 } },
    }),
    /Fully covered/,
  );
  const archived = render({
    record: { ...props.record, archived_at: "2026-11-09" },
  });
  assert.match(archived, /Interest cannot be changed/);
  assert.match(archived, /disabled=""/);
});
test("colleague loading and failed refresh expose status and retry", () => {
  assert.match(
    render({ listState: "loading" }),
    /Loading interested colleagues/,
  );
  assert.match(render({ listState: "error" }), /Retry colleague list/);
});
test("ambiguous successful toggle is not repeated on retry", async () => {
  let server = false,
    calls = 0;
  const read = async () => server;
  const toggle = async () => {
    calls++;
    server = !server;
    throw new Error("response lost");
  };
  await assert.rejects(reconcileInterest(true, read, toggle));
  assert.equal(await reconcileInterest(true, read, toggle), true);
  assert.equal(calls, 1);
});
test("failed read never toggles; withdrawal reconciles actual server state", async () => {
  let calls = 0;
  await assert.rejects(
    reconcileInterest(
      true,
      async () => {
        throw new Error("403");
      },
      async () => {
        calls++;
        return { joined: true };
      },
    ),
  );
  assert.equal(calls, 0);
  assert.equal(
    await reconcileInterest(
      false,
      async () => true,
      async () => {
        calls++;
        return { joined: false };
      },
    ),
    false,
  );
  assert.equal(calls, 1);
});
