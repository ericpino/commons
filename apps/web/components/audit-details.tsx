const labels: Record<string, string> = {
  planned: "Planned budget",
  actual: "Actual spend",
  driver: "Spending explanation",
  capacity: "Available hours / week",
  needed: "Needed hours / week",
  hours: "Typical hours / week",
  evidenceDate: "Evidence date",
  archived_at: "Archived at",
};

function fields(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const { data, ...rest } = value as Record<string, unknown>;
  return { ...rest, ...fields(data) };
}

function display(value: unknown): string {
  if (value == null || value === "") return "Not set";
  if (Array.isArray(value)) return value.map(display).join(", ") || "None";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

export default function AuditDetails({ detail }: { detail: unknown }) {
  const entry = fields(detail);
  const before = fields(entry.before);
  const after = fields(entry.after);
  const changes = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .filter(
      (key) =>
        !["id", "owner_id", "team_id", "created_at", "updated_at"].includes(
          key,
        ),
    )
    .filter(
      (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
    );
  return (
    <details>
      <summary>View change</summary>
      {entry.fixture === true && <p>Fictional demonstration history.</p>}
      {changes.length ? (
        <dl>
          {changes.map((key) => (
            <div key={key}>
              <dt>{labels[key] || key.replaceAll("_", " ")}</dt>
              <dd>
                {display(before[key])} → {display(after[key])}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <p>No field-level changes recorded.</p>
      )}
      <details>
        <summary>Original audit details</summary>
        <pre>{JSON.stringify(detail, null, 2)}</pre>
      </details>
    </details>
  );
}
