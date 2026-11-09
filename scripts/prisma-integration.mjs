import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { Pool } from "pg";
if (!process.env.DATABASE_URL)
  throw new Error("DATABASE_URL must point to an empty disposable database");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
function run(command) {
  const result = spawnSync("npm", ["run", command], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, command);
}
try {
  const existing = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public'",
  );
  assert.equal(
    existing.rowCount,
    0,
    "Refusing migration test: database is not empty. Use a disposable database.",
  );
  run("db:migrate");
  run("db:seed");
  const before = (
    await pool.query(
      "SELECT (SELECT count(*) FROM users)::int AS people,(SELECT count(*) FROM audit)::int AS audit",
    )
  ).rows[0];
  assert.equal(before.people, 11);
  assert.equal(before.audit, 6);
  const original = (
    await pool.query("SELECT title FROM records WHERE id='goal-onboarding'")
  ).rows[0].title;
  await pool.query("UPDATE records SET title=$1 WHERE id='goal-onboarding'", [
    "Edited fictional goal",
  ]);
  run("db:migrate");
  run("db:seed");
  assert.equal(
    (await pool.query("SELECT title FROM records WHERE id='goal-onboarding'"))
      .rows[0].title,
    "Edited fictional goal",
  );
  assert.deepEqual(
    (
      await pool.query(
        "SELECT (SELECT count(*) FROM users)::int AS people,(SELECT count(*) FROM audit)::int AS audit",
      )
    ).rows[0],
    before,
  );
  await pool.query("UPDATE records SET title=$1 WHERE id='goal-onboarding'", [
    original,
  ]);
  await assert.rejects(
    pool.query(
      "UPDATE users SET skills=ARRAY['Not in catalog'] WHERE id='maya'",
    ),
    { code: "23514" },
  );
  await assert.rejects(
    pool.query("UPDATE users SET role='invalid' WHERE id='maya'"),
    { code: "23514" },
  );
  await assert.rejects(
    pool.query(
      "UPDATE records SET visibility='invalid' WHERE id='goal-onboarding'",
    ),
    { code: "23514" },
  );
  await assert.rejects(
    pool.query("INSERT INTO skills(name) VALUES('typescript')"),
    { code: "23505" },
  );
  assert.equal(
    (
      await pool.query(
        "SELECT count(*)::int AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL",
      )
    ).rows[0].count,
    1,
  );
  console.log(
    "PASS: fresh migration, repeat deploy, idempotent seed, edited-data preservation, audit stability, skill trigger, role/visibility checks and normalized index.",
  );
} finally {
  await pool.end();
}
