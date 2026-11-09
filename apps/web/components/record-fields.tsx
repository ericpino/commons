type RecordValue = {
  title: string;
  body: string;
  team_id: string;
  visibility: string;
  owner_id: string;
  data: Record<string, string | number>;
};
type Props = {
  kind: string;
  record?: RecordValue | null;
  teamId: string;
  chooseTeam: boolean;
  teams: { id: string; name: string; archived_at?: string | null }[];
  people: { id: string; name: string; archived_at?: string | null }[];
  authorId: string;
  recipient?: string;
};
export default function RecordFields({
  kind,
  record,
  teamId,
  chooseTeam,
  teams,
  people,
  authorId,
  recipient,
}: Props) {
  const data = record?.data || {};
  return (
    <>
      <label>
        Title
        <input
          name="title"
          autoFocus
          required
          maxLength={140}
          defaultValue={record?.title}
        />
      </label>
      <label>
        Details
        <textarea
          name="body"
          required
          maxLength={2000}
          defaultValue={record?.body}
        />
      </label>
      {chooseTeam ? (
        <label>
          Team
          <select name="teamId" defaultValue={record?.team_id || teamId}>
            {teams
              .filter((t) => !t.archived_at)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="teamId" value={record?.team_id || teamId} />
      )}
      {kind !== "budget" && (
        <label>
          Share with
          <select
            name="visibility"
            defaultValue={record?.visibility || "company"}
          >
            <option value="company">Everyone at Northstar</option>
            <option value="team">Selected team only</option>
          </select>
        </label>
      )}
      {kind === "recognition" && (
        <>
          <label>
            Colleague
            <select
              name="recipient"
              required
              defaultValue={data.recipient || recipient}
            >
              {people
                .filter((p) => !p.archived_at && p.id !== authorId)
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
          </label>
          <p>
            Recognition celebrates contribution, never proficiency or a
            performance score.
          </p>
        </>
      )}
      {kind === "goal" && (
        <>
          <label>
            Target / success measure
            <input
              name="target"
              required
              maxLength={200}
              defaultValue={data.target}
            />
          </label>
          <label>
            Completed units
            <input
              name="completed"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={data.completed ?? data.progress ?? 0}
            />
          </label>
          <label>
            Total units
            <input
              name="total"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={data.total ?? 100}
            />
          </label>
          <label>
            Measurement unit
            <input
              name="unit"
              required
              maxLength={100}
              defaultValue={data.unit || "acceptance checks"}
            />
          </label>
          <p>
            Progress is calculated as completed ÷ total × 100. Evidence should
            explain which units are complete.
          </p>
          <label>
            Evidence date
            <input
              name="evidenceDate"
              type="date"
              required
              defaultValue={
                data.evidenceDate || new Date().toISOString().slice(0, 10)
              }
            />
          </label>
          <label>
            Progress evidence
            <textarea
              name="evidence"
              required
              maxLength={1000}
              defaultValue={data.evidence || "No evidence recorded yet"}
            />
          </label>
        </>
      )}
      {kind === "allocation" && (
        <>
          {[
            ["capacity", "Available capacity (hours/week)", 0],
            ["needed", "Needed (hours/week)", 8],
            ["hours", "Typical contribution (hours/week)", 4],
          ].map(([key, label, fallback]) => (
            <label key={String(key)}>
              {label}
              <input
                name={String(key)}
                type="number"
                min="0"
                max="100000000"
                step="0.01"
                required
                defaultValue={data[key] ?? fallback}
              />
            </label>
          ))}
        </>
      )}
      {kind === "budget" && (
        <>
          <label>
            Planned (USD)
            <input
              name="planned"
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              required
              defaultValue={data.planned ?? 0}
            />
          </label>
          <label>
            Actual (USD)
            <input
              name="actual"
              type="number"
              min="0"
              max="100000000"
              step="0.01"
              required
              defaultValue={data.actual ?? 0}
            />
          </label>
          <label>
            Spend drivers / source notes
            <textarea
              name="driver"
              required
              maxLength={1000}
              defaultValue={data.driver}
              placeholder="Explain the spending, including any overspend."
            />
          </label>
        </>
      )}
    </>
  );
}
