import assert from "node:assert/strict";
const base = process.env.TEST_API_URL || "http://localhost:4000";
const password = process.env.DEMO_PASSWORD;
if (!password) throw new Error("DEMO_PASSWORD required");
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(`${base}/health`);
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {}
  await new Promise((r) => setTimeout(r, 500));
}
assert.ok(ready, "API must become healthy");
async function call(path, { cookie, method = "GET", body } = {}) {
  return fetch(`${base}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
async function login(userId) {
  const r = await call("login", { method: "POST", body: { userId, password } });
  assert.equal(r.status, 201);
  return r.headers.get("set-cookie").split(";")[0];
}
assert.equal((await call("workspace")).status, 401);
assert.equal(
  (
    await call("login", {
      method: "POST",
      body: { userId: "maya", password: "wrong" },
    })
  ).status,
  401,
);
const maya = await login("maya"),
  alex = await login("alex"),
  jordan = await login("jordan"),
  sam = await login("sam");
const get = async (p, c) => (await call(p, { cookie: c })).json();
const mw = await get("workspace", maya),
  sw = await get("workspace", sam);
assert.equal(mw.user.id, "maya");
assert.ok(!mw.records.some((r) => r.kind === "budget"));
assert.ok(!sw.records.some((r) => r.id === "post-private"));
assert.equal(
  (await call("records/budget-product", { cookie: maya })).status,
  404,
);
assert.equal((await call("records/post-private", { cookie: sam })).status, 404);
assert.equal(
  (
    await call("records/budget-product", {
      cookie: alex,
      method: "PATCH",
      body: { planned: 1, actual: 0, driver: "Forbidden" },
    })
  ).status,
  404,
);
assert.equal(
  (
    await call("records/goal-onboarding", {
      cookie: maya,
      method: "PATCH",
      body: { progress: 90, evidence: "Forbidden" },
    })
  ).status,
  403,
);
assert.equal(
  (
    await call("records/goal-support", {
      cookie: alex,
      method: "PATCH",
      body: { progress: 90, evidence: "Cross-team" },
    })
  ).status,
  403,
);
const created = await call("records", {
  cookie: maya,
  method: "POST",
  body: {
    kind: "post",
    title: "Integration test update",
    body: "Persisted through the NestJS API.",
    visibility: "team",
  },
});
assert.equal(created.status, 201);
const post = await created.json();
assert.ok((await get("workspace", maya)).records.some((r) => r.id === post.id));
assert.equal((await call(`records/${post.id}`, { cookie: sam })).status, 404);
const goalBefore = await get("records/goal-onboarding", alex);
assert.equal(
  (
    await call("records/goal-onboarding", {
      cookie: alex,
      method: "PATCH",
      body: {
        progress: 72,
        evidence: "Integration check: acceptance criteria reviewed",
      },
    })
  ).status,
  200,
);
assert.equal((await get("records/goal-onboarding", alex)).data.progress, 72);
const budgetBefore = await get("records/budget-product", jordan);
assert.equal(
  (
    await call("records/budget-product", {
      cookie: jordan,
      method: "PATCH",
      body: { planned: -1, actual: 0, driver: "Invalid" },
    })
  ).status,
  400,
);
assert.equal(
  (
    await call("records/budget-product", {
      cookie: jordan,
      method: "PATCH",
      body: {
        planned: 20000,
        actual: 12500,
        driver: "Integration test evidence",
      },
    })
  ).status,
  200,
);
const fin = await get("insights", jordan),
  emp = await get("insights", maya);
assert.ok(fin.answers.some((a) => a.sources.some((s) => s.kind === "budget")));
assert.ok(!emp.answers.some((a) => a.sources.some((s) => s.kind === "budget")));
for (const a of fin.answers)
  for (const source of a.sources)
    assert.equal(
      (await call(`records/${source.id}`, { cookie: jordan })).status,
      200,
    );
const joinedBefore = mw.joined.includes("allocation-research");
await call("records/allocation-research/join", {
  cookie: maya,
  method: "POST",
});
assert.equal(
  (await get("workspace", maya)).joined.includes("allocation-research"),
  !joinedBefore,
);
await call("records/allocation-research/join", {
  cookie: maya,
  method: "POST",
});
await call("profile", {
  cookie: maya,
  method: "PATCH",
  body: { skills: ["Testing", "Research"] },
});
assert.deepEqual((await get("workspace", maya)).user.skills, [
  "Testing",
  "Research",
]);
assert.notDeepEqual((await get("workspace", sam)).user.skills, [
  "Testing",
  "Research",
]);
await call("teams/operations/follow", { cookie: maya, method: "POST" });
assert.equal(
  (await get("workspace", maya)).following.includes("operations"),
  !mw.following.includes("operations"),
);
await call("teams/operations/follow", { cookie: maya, method: "POST" });
const audit = await get("audit", jordan);
assert.ok(
  audit.some(
    (a) => a.action === "update budget" && a.detail.after.actual === 12500,
  ),
);
assert.ok((await get("audit", maya)).every((a) => a.actor_id === "maya"));
assert.ok(
  !(await get("audit", alex)).some((a) => a.action === "update budget"),
);
await call("profile", {
  cookie: maya,
  method: "PATCH",
  body: { skills: mw.user.skills },
});
await call("records/goal-onboarding", {
  cookie: alex,
  method: "PATCH",
  body: goalBefore.data,
});
await call("records/budget-product", {
  cookie: jordan,
  method: "PATCH",
  body: budgetBefore.data,
});
await call("logout", { cookie: maya, method: "POST" });
assert.equal((await call("workspace", { cookie: maya })).status, 401);
console.log(
  "PASS: sign-in, persistence, feed visibility, role isolation, goal/budget mutation, validation, evidence, opt-in, self-owned skills, following, audit, logout.",
);
