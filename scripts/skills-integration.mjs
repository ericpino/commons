import assert from "node:assert/strict";
const base = process.env.TEST_API_URL || "http://localhost:4000";
const login = await fetch(`${base}/login`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ userId: "root", password: process.env.DEMO_PASSWORD }),
});
assert.equal(login.status, 201);
const cookie = login.headers.get("set-cookie").split(";")[0];
const call = (path, body) =>
  fetch(`${base}/${path}`, {
    method: body ? "PATCH" : "GET",
    headers: { Cookie: cookie, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
assert.equal((await fetch(`${base}/skills`)).status, 401);
const response = await call("skills");
assert.equal(response.status, 200);
const { skills } = await response.json();
assert.ok(skills.some((s) => s.name === "TypeScript"));
assert.equal(
  new Set(skills.map((s) => s.name.toLowerCase())).size,
  skills.length,
);
const original = (await (await call("workspace")).json()).user.skills;
try {
  assert.equal(
    (
      await call("profile", {
        skills: [" typescript ", "TYPESCRIPT", "PostgreSQL"],
      })
    ).status,
    200,
  );
  assert.deepEqual((await (await call("workspace")).json()).user.skills, [
    "PostgreSQL",
    "TypeScript",
  ]);
  for (const invalid of [
    ["Uncatalogued skill XYZ"],
    [null],
    Array(13).fill("Testing"),
  ]) {
    assert.equal((await call("profile", { skills: invalid })).status, 400);
    assert.equal((await call("people/root", { skills: invalid })).status, 400);
  }
  assert.deepEqual((await (await call("workspace")).json()).user.skills, [
    "PostgreSQL",
    "TypeScript",
  ]);
  assert.equal((await call("profile", { skills: [] })).status, 200);
} finally {
  assert.equal((await call("profile", { skills: original })).status, 200);
}
console.log(
  "Skills catalog authentication, normalization, deduplication, validation and clearing passed.",
);
if (process.env.DATABASE_URL) {
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await assert.rejects(
      pool.query(
        "UPDATE users SET skills=ARRAY['Uncatalogued skill XYZ'] WHERE id='root'",
      ),
      { code: "23514" },
    );
    await assert.rejects(
      pool.query("INSERT INTO skills(name) VALUES('typescript')"),
      { code: "23505" },
    );
    console.log(
      "Database rejected uncatalogued expertise and case-duplicate catalog entries.",
    );
  } finally {
    await pool.end();
  }
}
