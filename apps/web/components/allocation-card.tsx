import { Check, Heart, ExternalLink, CircleAlert } from "lucide-react";

export type Opportunity = {
  id: string;
  title: string;
  body: string;
  team_id: string;
  owner_id: string;
  updated_at: string;
  archived_at?: string | null;
  data: Record<string, string | number>;
};
export type Colleague = {
  id: string;
  name: string;
  title: string;
  role: string;
  team_id: string;
  skills: string[];
};
export type InterestState = {
  status: "idle" | "saving" | "error";
  message?: string;
};
export type AllocationCardProps = {
  record: Opportunity;
  user: { id: string; role: string };
  team: (id: string) => string;
  people: Colleague[];
  interests: { record_id: string; id: string; name: string }[];
  joined: boolean;
  state: InterestState;
  disabled?: boolean;
  listState?: "ready" | "loading" | "error";
  onInterest: () => void;
  onWithdraw: () => void;
  onRetry: () => void;
  onReload: () => void;
  onSource: () => void;
};
export default function AllocationCard({
  record: r,
  user,
  team,
  people,
  interests,
  joined,
  state,
  disabled,
  listState = "ready",
  onInterest,
  onWithdraw,
  onRetry,
  onReload,
  onSource,
}: AllocationCardProps) {
  const gap = Math.max(0, Number(r.data.needed) - Number(r.data.capacity));
  const permitted =
    !r.archived_at && (r.owner_id === user.id || user.role === "root");
  const returned = interests
    .filter((i) => i.record_id === r.id)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const asOf = new Date(r.updated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const unavailable = !!r.archived_at || disabled || state.status === "saving";
  const provenance = (
    <span className="allocation-provenance">
      As of {asOf} ·{" "}
      <button className="text-button" onClick={onSource}>
        View source <ExternalLink size={12} aria-hidden="true" />
      </button>
    </span>
  );
  return (
    <article
      className="card allocation-card"
      aria-labelledby={`opportunity-${r.id}`}
    >
      <div className="allocation-meta">
        <span className="chip">{r.archived_at ? "Archived" : "Open"}</span>
        <span>{team(r.team_id)}</span>
      </div>
      <h2 id={`opportunity-${r.id}`}>{r.title}</h2>
      <p className="allocation-description" title={r.body}>
        {r.body}
      </p>
      <section
        className="allocation-planning"
        aria-label="Team planning estimate"
      >
        <p>Team planning estimate</p>
        <dl className="allocation-numbers">
          {[
            { label: "Available per week", value: `${r.data.capacity} h` },
            { label: "Needed per week", value: `${r.data.needed} h` },
            {
              label: "Capacity gap",
              value: gap ? `${gap} h / week` : "Fully covered",
            },
          ].map((metric, i) => (
            <div key={metric.label} className={i === 2 ? "allocation-gap" : ""}>
              <dt>{metric.label}</dt>
              <dd>
                {i === 2 &&
                  (gap ? (
                    <CircleAlert size={16} aria-hidden="true" />
                  ) : (
                    <Check size={16} aria-hidden="true" />
                  ))}
                {metric.value}
              </dd>
              {provenance}
            </div>
          ))}
        </dl>
        <p className="allocation-typical">
          Typical contribution: {r.data.hours} hours / week {provenance}
        </p>
      </section>
      <div
        className="allocation-interest"
        aria-busy={state.status === "saving"}
      >
        {joined && state.status !== "saving" ? (
          <p className="allocation-interested" role="status">
            <Check size={19} aria-hidden="true" /> Interested
          </p>
        ) : (
          <button
            className="primary allocation-primary"
            disabled={unavailable || state.status === "error"}
            onClick={onInterest}
          >
            <Heart size={19} aria-hidden="true" />
            {state.status === "saving" ? "Saving..." : "I'm interested"}
          </button>
        )}
        <p>Interest does not change your manager or commit your time.</p>
        {r.archived_at && (
          <p>This opportunity is archived. Interest cannot be changed.</p>
        )}
        {state.status === "error" && (
          <div className="allocation-error" role="alert">
            <p>{state.message}</p>
            <button
              className="secondary"
              onClick={onRetry}
              disabled={!!disabled}
            >
              Retry
            </button>
          </div>
        )}
        {joined && (
          <button
            className="text-button"
            disabled={unavailable || state.status === "error"}
            onClick={onWithdraw}
          >
            Withdraw interest
          </button>
        )}
      </div>
      <section
        className="allocation-colleagues"
        aria-label="Interested colleagues"
      >
        {listState === "loading" ? (
          <div role="status" aria-label="Loading interested colleagues">
            <div className="allocation-skeleton" />
            <p>Loading colleagues…</p>
          </div>
        ) : listState === "error" ? (
          <div role="alert">
            <p>Colleagues could not be refreshed.</p>
            <button className="text-button" onClick={onReload}>
              Retry colleague list
            </button>
          </div>
        ) : !permitted && !returned.length ? (
          <p>You can't see who else is interested</p>
        ) : (
          <details>
            <summary>Interested colleagues ({returned.length})</summary>
            {!returned.length ? (
              <p>No one has expressed interest yet. Be the first.</p>
            ) : (
              <ul>
                {returned.map((i) => {
                  const p = people.find((person) => person.id === i.id);
                  return (
                    <li key={i.id} tabIndex={0}>
                      <span className="avatar" aria-hidden="true">
                        {i.name
                          .split(" ")
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join("")}
                      </span>
                      <div>
                        <strong>{i.name}</strong>
                        {i.id === user.id && <span className="chip">You</span>}
                        {p && (
                          <>
                            <p>
                              {p.title || p.role} · {team(p.team_id)}
                            </p>
                            <div
                              className="allocation-skills"
                              aria-label="Self-listed skills"
                            >
                              {p.skills.slice(0, 3).map((skill) => (
                                <span className="chip" key={skill}>
                                  {skill}
                                </span>
                              ))}
                              {p.skills.length > 3 && (
                                <span>+{p.skills.length - 3} more</span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </details>
        )}
      </section>
    </article>
  );
}
