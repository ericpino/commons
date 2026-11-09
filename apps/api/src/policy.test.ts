import { test } from "node:test";
import assert from "node:assert/strict";
import { canRead, canManage, money, User } from "./policy";
const employee: User = {
  id: "a",
  name: "A",
  role: "employee",
  team_id: "product",
  skills: [],
  title: "",
};
test("team-private records do not leak across teams", () => {
  assert.equal(canRead(employee, "team", "operations"), false);
  assert.equal(canRead(employee, "team", "product"), true);
});
test("leadership does not grant finance visibility", () =>
  assert.equal(canRead({ ...employee, role: "lead" }, "finance", null), false));
test("employees cannot mutate team plans; leads are team-scoped", () => {
  assert.equal(canManage(employee, "product"), false);
  assert.equal(canManage({ ...employee, role: "lead" }, "operations"), false);
  assert.equal(canManage({ ...employee, role: "lead" }, "product"), true);
});
test("invalid financial values are rejected", () => {
  for (const v of [-1, "x", Infinity, null, "", " ", true, [], {}])
    assert.throws(() => money(v));
  assert.equal(money("12.34"), 12.34);
});

test("root can read and manage all teams without employee restrictions", () => {
  const root = { ...employee, role: "root" };
  assert.equal(canRead(root, "team", "operations"), true);
  assert.equal(canRead(root, "finance", null), true);
  assert.equal(canManage(root, "operations"), true);
});
