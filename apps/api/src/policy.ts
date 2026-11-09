export type User = {
  id: string;
  name: string;
  role: string;
  team_id: string;
  skills: string[];
  title: string;
};
export function canRead(
  u: User,
  visibility: string,
  team: string | null,
): boolean {
  return (
    u.role === "root" ||
    visibility === "company" ||
    (visibility === "team" && u.team_id === team) ||
    (visibility === "finance" && u.role === "finance")
  );
}
export function canManage(u: User, team: string): boolean {
  return (
    u.role === "root" ||
    u.role === "finance" ||
    (u.role === "lead" && u.team_id === team)
  );
}
export function money(value: unknown): number {
  const n = Number(value);
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim()) ||
    value == null ||
    !Number.isFinite(n) ||
    n < 0 ||
    n > 100000000
  )
    throw new Error("Enter an amount between 0 and 100,000,000");
  return Math.round(n * 100) / 100;
}

export function canEditRecord(
  u: User,
  record: { kind: string; owner_id: string; team_id: string },
): boolean {
  if (u.role === "root") return true;
  if (["post", "recognition"].includes(record.kind))
    return record.owner_id === u.id;
  if (record.kind === "budget") return u.role === "finance";
  return canManage(u, record.team_id);
}
