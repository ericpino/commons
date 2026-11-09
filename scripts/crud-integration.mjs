import assert from "node:assert/strict";
import { Pool } from "pg";
const base = process.env.TEST_API_URL || "http://localhost:4000";
const password = process.env.DEMO_PASSWORD;
assert.ok(password, "DEMO_PASSWORD is required");
const suffix = Date.now().toString();
async function request(path, cookie, method = "GET", body) {
  const r = await fetch(`${base}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return {
    status: r.status,
    body: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(id) {
  const r = await request("login", null, "POST", { userId: id, password });
  assert.equal(r.status, 201);
  return r.cookie;
}
const root = await login("root"),
  maya = await login("maya"),
  alex = await login("alex"),
  sam = await login("sam");
assert.equal((await request("records/post-private", root)).status, 200);
assert.equal((await request("records/budget-product", root)).status, 200);
assert.equal(
  (await request("people", maya, "POST", { name: "Forbidden" })).status,
  403,
);
assert.equal(
  (await request("teams", alex, "POST", { name: "Forbidden" })).status,
  403,
);
assert.equal(
  (await request("records/post-launch/archive", sam, "POST")).status,
  403,
);
assert.equal(
  (
    await request("records/post-launch", alex, "PATCH", {
      title: "Not the owner",
    })
  ).status,
  403,
);
const created = [];
for (const kind of ["post", "recognition", "goal", "allocation", "budget"]) {
  const data = {
    kind,
    title: `CRUD ${kind} ${suffix}`,
    body: "Fictional integration record",
    teamId: "operations",
    visibility: "team",
    recipient: "maya",
    target: "Verified outcome",
    progress: 12,
    evidence: "Initial evidence",
    capacity: 4,
    needed: 10,
    hours: 2,
    planned: 100,
    actual: 120,
    driver: "Overspend explanation: fictional research session",
  };
  const r = await request("records", root, "POST", data);
  assert.equal(r.status, 201, JSON.stringify(r.body));
  const id = r.body.id;
  created.push(id);
  assert.equal((await request(`records/${id}`, root)).status, 200);
  const update = await request(`records/${id}`, root, "PATCH", {
    title: `Edited ${kind} ${suffix}`,
    body: "Updated details",
    teamId: "product",
    visibility: "company",
    target: "Updated target",
    progress: 25,
    evidence: "Updated evidence",
    capacity: 8,
    needed: 11,
    hours: 3,
    planned: 130,
    actual: 140,
    driver: "Updated justification",
  });
  assert.equal(update.status, 200, JSON.stringify(update.body));
  assert.equal(update.body.title, `Edited ${kind} ${suffix}`);
  assert.equal(update.body.team_id, "product");
  if (kind === "goal") {
    assert.equal(update.body.data.target, "Updated target");
    assert.equal(update.body.data.progress, 25);
  }
  if (kind === "allocation") assert.equal(update.body.data.hours, 3);
  assert.equal(
    (await request(`records/${id}/archive`, root, "POST")).status,
    201,
  );
  assert.ok(
    !(await request("workspace", root)).body.records.some((x) => x.id === id),
  );
  assert.ok(
    (await request("workspace?archived=true", root)).body.records.some(
      (x) => x.id === id && x.archived_at,
    ),
  );
  assert.equal(
    (
      await request(`records/${id}`, root, "PATCH", {
        title: "Cannot update archive",
      })
    ).status,
    409,
  );
  assert.equal((await request(`records/${id}`, sam)).status, 404);
  if (kind === "allocation")
    assert.equal(
      (await request(`records/${id}/join`, root, "POST")).status,
      404,
    );
  const insights = (await request("insights", root)).body;
  assert.ok(insights.answers.every((a) => !a.sources.some((x) => x.id === id)));
  assert.equal(
    (await request(`records/${id}/restore`, root, "POST")).status,
    201,
  );
  assert.ok(
    (await request("workspace", root)).body.records.some(
      (x) => x.id === id && !x.archived_at,
    ),
  );
  await request(`records/${id}/archive`, root, "POST");
}
// Authors can update/archive their own posts; other employees cannot.
const own = (
  await request("records", maya, "POST", {
    kind: "post",
    title: `Own ${suffix}`,
    body: "Owner workflow",
  })
).body;
assert.equal(
  (
    await request(`records/${own.id}`, maya, "PATCH", {
      title: "Owner revised",
    })
  ).status,
  200,
);
assert.equal(
  (await request(`records/${own.id}/archive`, sam, "POST")).status,
  403,
);
assert.equal(
  (await request(`records/${own.id}/archive`, maya, "POST")).status,
  201,
);
assert.equal(
  (await request(`records/${own.id}/restore`, maya, "POST")).status,
  201,
);
await request(`records/${own.id}/archive`, maya, "POST");
// Root manages the directory; active dependencies prevent orphaned teams.
const team = (
  await request("teams", root, "POST", {
    name: `Test team ${suffix}`,
    mission: "Exercise directory lifecycle",
  })
).body;
assert.equal(
  (
    await request(`teams/${team.id}`, root, "PATCH", {
      name: "Revised team",
      mission: "Revised mission",
    })
  ).status,
  200,
);
const personResult = await request("people", root, "POST", {
  name: `Test colleague ${suffix}`,
  title: "Fictional tester",
  role: "employee",
  teamId: team.id,
  skills: ["Testing"],
});
assert.equal(personResult.status, 201);
const person = personResult.body;
const personCookie = await login(person.id);
assert.equal(
  (await request(`teams/${team.id}/archive`, root, "POST")).status,
  409,
);
assert.equal(
  (
    await request(`people/${person.id}`, root, "PATCH", {
      name: "Updated colleague",
      title: "Test lead",
      role: "lead",
      skills: ["Verification"],
    })
  ).status,
  200,
);
assert.equal(
  (await request("workspace", personCookie)).status,
  401,
  "Role change invalidates old sessions",
);
const freshCookie = await login(person.id);
assert.equal(
  (await request(`people/${person.id}/archive`, root, "POST")).status,
  201,
);
assert.equal((await request("workspace", freshCookie)).status, 401);
assert.equal(
  (await request("login", null, "POST", { userId: person.id, password }))
    .status,
  401,
);
assert.equal(
  (await request(`teams/${team.id}/archive`, root, "POST")).status,
  201,
);
assert.equal(
  (await request(`people/${person.id}/restore`, root, "POST")).status,
  400,
);
assert.equal(
  (await request(`teams/${team.id}/restore`, root, "POST")).status,
  201,
);
assert.equal(
  (await request(`people/${person.id}/restore`, root, "POST")).status,
  201,
);
assert.equal(
  (await request(`people/${person.id}/archive`, root, "POST")).status,
  201,
);
await request(`teams/${team.id}/archive`, root, "POST");
assert.equal((await request("people/root/archive", root, "POST")).status, 400);
const audit = (await request("audit", root)).body;
for (const id of created) {
  assert.ok(
    audit.some((a) => a.record_id === id && a.action.startsWith("archive ")),
  );
  assert.ok(
    audit.some((a) => a.record_id === id && a.action.startsWith("restore ")),
  );
}
// Force an audit failure and verify the business write rolls back too.
if (process.env.DATABASE_URL) {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const r = (
    await request("records", root, "POST", {
      kind: "post",
      title: `Rollback ${suffix}`,
      body: "Before transaction",
    })
  ).body;
  const trigger = `test_audit_${suffix}`;
  try {
    await pool.query(
      `CREATE FUNCTION ${trigger}() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.record_id='${r.id}' AND NEW.action='update post' THEN RAISE EXCEPTION 'Intentional integration test audit failure'; END IF; RETURN NEW; END $$`,
    );
    await pool.query(
      `CREATE TRIGGER ${trigger} BEFORE INSERT ON audit FOR EACH ROW EXECUTE FUNCTION ${trigger}()`,
    );
    assert.equal(
      (
        await request(`records/${r.id}`, root, "PATCH", {
          body: "Should roll back",
        })
      ).status,
      500,
    );
    assert.equal(
      (await request(`records/${r.id}`, root)).body.body,
      "Before transaction",
    );
  } finally {
    await pool.query(`DROP TRIGGER IF EXISTS ${trigger} ON audit`);
    await pool.query(`DROP FUNCTION IF EXISTS ${trigger}()`);
    await pool.end();
    await request(`records/${r.id}/archive`, root, "POST");
  }
}
console.log(
  "PASS: five record lifecycles, root access, owner permissions, archival visibility, restore, people/team CRUD, session revocation, dependency guards, audit history and transactional rollback.",
);
