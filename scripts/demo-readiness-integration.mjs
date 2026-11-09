import assert from "node:assert/strict";
const base = process.env.TEST_API_URL || "http://localhost:4000";
const password = process.env.DEMO_PASSWORD;
let cookie = "";
async function call(path, method = "GET", body) {
  const r = await fetch(`${base}/${path}`, {
    method,
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (r.headers.get("set-cookie"))
    cookie = r.headers.getSetCookie().at(-1).split(";")[0];
  return { status: r.status, body: await r.json() };
}
assert.equal(
  (await call("demo/view-as", "POST", { userId: "jordan" })).status,
  401,
);
assert.equal(
  (await call("login", "POST", { userId: "maya", password })).status,
  201,
);
assert.equal((await call("records/budget-product")).status, 404);
const employee = await call("insights");
assert.equal(employee.body.answers.length, 5);
assert.ok(
  employee.body.answers.every(
    (a) => a.coverage.includes("of 5") && a.arithmetic,
  ),
);
assert.equal(employee.body.answers[0].value, "58%");
assert.ok(employee.body.answers[0].arithmetic.includes("75"));
assert.equal(employee.body.answers[1].value, "20 hrs/week");
assert.equal(employee.body.answers[2].value, "1 of 3");
assert.equal(
  (await call("demo/view-as", "POST", { userId: "jordan" })).status,
  201,
);
assert.equal((await call("workspace")).body.user.id, "jordan");
assert.equal((await call("records/budget-product")).status, 200);
assert.equal((await call("insights")).body.answers.length, 6);
assert.equal(
  (await call("demo/view-as", "POST", { userId: "unknown" })).status,
  400,
);
assert.equal(
  (await call("demo/view-as", "POST", { userId: "alex" })).status,
  201,
);
const workspace = (await call("workspace")).body;
assert.equal(
  workspace.interests.filter((i) => i.record_id === "allocation-research")
    .length,
  2,
);
assert.ok(
  !workspace.interests.some((i) => i.record_id === "allocation-guides"),
);
assert.equal(
  (
    await call("records/goal-onboarding", "PATCH", {
      completed: 3,
      total: 4,
      unit: "acceptance checks",
      evidence: "Three checks passed; invitation delivery remains open.",
      evidenceDate: "2026-11-09",
    })
  ).body.data.progress,
  75,
);
assert.equal(
  (await call("records/goal-onboarding", "PATCH", { completed: 5, total: 4 }))
    .status,
  400,
);
assert.equal(
  (
    await call("records/goal-onboarding", "PATCH", {
      evidenceDate: "2026-02-30",
    })
  ).status,
  400,
);
assert.equal(
  (await call("demo/view-as", "POST", { userId: "maya" })).status,
  201,
);
assert.equal((await call("workspace")).body.interests.length, 0);
assert.equal((await call("records/budget-product")).status, 404);
assert.equal(
  (await call("demo/view-as", "POST", { userId: "root" })).status,
  201,
);
const audit = (await call("audit")).body;
assert.ok(audit.every((a) => a.record_label && a.record_label !== a.record_id));
assert.ok(
  audit.some((a) => a.record_label === "Goal: Make onboarding feel effortless"),
);
console.log(
  "PASS: demo persona switching and role boundaries, five/six evidence-backed answers, coverage/arithmetic, measured goals/date validation, owner-only interested colleagues and readable audit subjects.",
);
