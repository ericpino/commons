import { Component, ReactNode, useEffect, useRef, useState } from "react";
import { Check, MoreHorizontal, Search, X } from "lucide-react";
export type OrganizationTeam = {
  id: string;
  name: string;
  mission: string;
  archived_at?: string | null;
};
export type OrganizationPerson = {
  id: string;
  name: string;
  title: string;
  role: string;
  team_id: string;
  archived_at?: string | null;
};
export type OrganizationRecord = {
  id: string;
  kind: string;
  title: string;
  body: string;
  team_id: string;
  updated_at: string;
  archived_at?: string | null;
};
export type OrganizationState = "loading" | "ready" | "error" | "denied";
export const plural = (
  count: number,
  singular: string,
  multiple = `${singular}s`,
) => `${count} ${count === 1 ? singular : multiple}`;
const stamp = (value: string) => new Date(value).toLocaleString();
const link = (id: string, section = "purpose") =>
  `#organization/${encodeURIComponent(id)}/${section}`;
const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter((word) => /[a-z]/i.test(word))
    .map((word) => word[0])
    .slice(0, 2)
    .join("");
export function teamFacts(records: OrganizationRecord[], teamId: string) {
  const visible = records.filter((r) => r.team_id === teamId && !r.archived_at);
  return {
    goals: visible.filter((r) => r.kind === "goal"),
    updates: visible.filter((r) => r.kind === "post"),
    invitations: visible.filter((r) => r.kind === "allocation"),
  };
}
export function searchTeams(
  teams: OrganizationTeam[],
  people: OrganizationPerson[],
  query: string,
  archived: boolean,
) {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return teams
    .filter((t) => archived || !t.archived_at)
    .filter((t) => {
      const roles = people
        .filter(
          (p) => p.team_id === t.id && !p.archived_at && p.role !== "root",
        )
        .map((p) => `${p.title} ${p.role === "lead" ? "Team lead" : p.role}`)
        .join(" ");
      const text = `${t.name} ${t.mission} ${roles}`.toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
function Members({
  people,
  hideRole = false,
}: {
  people: OrganizationPerson[];
  hideRole?: boolean;
}) {
  return (
    <ul className="organization-members">
      {people.map((p) => (
        <li key={p.id}>
          <span className="avatar small" aria-hidden="true">
            {initials(p.name)}
          </span>
          <div>
            <strong>{p.name}</strong>
            {!hideRole && (
              <span>
                {p.title && p.title.toLowerCase() !== "team lead"
                  ? p.title
                  : p.role !== "lead"
                    ? p.role
                    : ""}
              </span>
            )}
            {p.role === "lead" && <span className="chip">Team lead</span>}
          </div>
        </li>
      ))}
    </ul>
  );
}
export function RoleGroups({ people }: { people: OrganizationPerson[] }) {
  const roles = [...new Set(people.map((p) => p.title || p.role))].sort(
    (a, b) => a.localeCompare(b),
  );
  return (
    <div className="organization-role-groups">
      {roles.map((role) => (
        <div key={role}>
          <h4>{role}</h4>
          <Members
            hideRole
            people={people.filter((p) => (p.title || p.role) === role)}
          />
        </div>
      ))}
    </div>
  );
}
export function FollowButton({
  following,
  disabled,
  onClick,
}: {
  following: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="secondary organization-follow"
      aria-pressed={following}
      disabled={disabled}
      onClick={onClick}
    >
      {following && <Check size={16} aria-hidden="true" />}
      {following ? "Following" : "Follow"}
    </button>
  );
}
export function FollowContent({
  name,
  following,
  state,
  error,
  onSave,
  onUnfollow,
  onRetry,
  onClose,
}: {
  name: string;
  following: boolean;
  state: "ready" | "saving" | "error";
  error: string;
  onSave: () => void;
  onUnfollow: () => void;
  onRetry: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <button
        className="organization-close"
        aria-label="Close follow settings"
        onClick={onClose}
      >
        <X size={20} />
      </button>
      <h2 id="organization-follow-title">Follow {name}</h2>
      <p id="organization-follow-description">
        Following adds this team&apos;s updates to your feed. It doesn&apos;t
        give you access to private records.
      </p>
      <p>
        {following
          ? "You follow this team."
          : "You don't follow this team yet."}
      </p>
      {state === "error" && (
        <div role="alert">
          <p>{error}</p>
          <button className="secondary" onClick={onRetry}>
            Retry
          </button>
        </div>
      )}
      <div className="organization-dialog-actions">
        <button
          className="primary"
          disabled={state === "saving"}
          onClick={onSave}
        >
          {state === "saving" ? "Saving..." : "Save"}
        </button>
        {following && (
          <button
            className="secondary"
            disabled={state === "saving"}
            onClick={onUnfollow}
          >
            Unfollow
          </button>
        )}
      </div>
    </>
  );
}
function FollowPopup({
  team,
  following,
  onChange,
  onClose,
}: {
  team: OrganizationTeam;
  following: boolean;
  onChange: (id: string, desired: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"ready" | "saving" | "error">("ready");
  const [error, setError] = useState("");
  const desired = useRef(true),
    pending = useRef(false),
    active = useRef(true);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = ref.current;
    active.current = true;
    dialog?.showModal();
    return () => {
      active.current = false;
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  async function save(value: boolean) {
    if (pending.current) return;
    pending.current = true;
    desired.current = value;
    setState("saving");
    setError("");
    try {
      await onChange(team.id, value);
      if (active.current) onClose();
    } catch (e) {
      if (active.current) {
        setError((e as Error).message);
        setState("error");
      }
    } finally {
      pending.current = false;
    }
  }
  return (
    <dialog
      className="organization-dialog"
      ref={ref}
      aria-labelledby="organization-follow-title"
      aria-describedby="organization-follow-description"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <FollowContent
        name={team.name}
        following={following}
        state={state}
        error={error}
        onSave={() => save(true)}
        onUnfollow={() => save(false)}
        onRetry={() => save(desired.current)}
        onClose={onClose}
      />
    </dialog>
  );
}
export function TeamCard({
  team,
  members,
  records,
  allPeople,
  canAdmin,
  following,
  busy,
  asOf,
  onFollow,
  onEdit,
  onArchive,
}: {
  team: OrganizationTeam;
  members: OrganizationPerson[];
  records: OrganizationRecord[];
  allPeople: OrganizationPerson[];
  canAdmin: boolean;
  following: boolean;
  busy: boolean;
  asOf: string;
  onFollow: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const facts = teamFacts(records, team.id);
  const used =
    allPeople.some((p) => p.team_id === team.id && !p.archived_at) ||
    records.some((r) => r.team_id === team.id && !r.archived_at);
  return (
    <article className="card organization-card" aria-label={team.name}>
      <div className="organization-card-heading">
        <span className="organization-monogram" aria-hidden="true">
          {initials(team.name)}
        </span>
        <h2>
          <a href={link(team.id)}>{team.name}</a>
        </h2>
        {canAdmin && (
          <details className="organization-menu">
            <summary aria-label={`Actions for ${team.name}`}>
              <MoreHorizontal size={20} />
            </summary>
            <div>
              {!team.archived_at && (
                <button disabled={busy} onClick={onEdit}>
                  Edit team
                </button>
              )}
              <button
                disabled={busy || (!team.archived_at && used)}
                onClick={onArchive}
              >
                {team.archived_at ? "Restore" : "Archive"}
              </button>
              {!team.archived_at && used && (
                <p>
                  Active members or records must be archived or moved before
                  this team can be archived.
                </p>
              )}
            </div>
          </details>
        )}
      </div>
      <p className="organization-purpose" title={team.mission}>
        {team.mission}
      </p>
      {team.archived_at && <span className="chip">Archived</span>}
      <a className="organization-members-link" href={link(team.id, "members")}>
        {plural(members.length, "member")}
      </a>
      <Members people={members.slice(0, 4)} />
      {!members.length && <p>No members listed yet.</p>}
      {members.length > 4 && (
        <a href={link(team.id, "members")}>+{members.length - 4} more</a>
      )}
      <div className="organization-facts">
        <a href={link(team.id, "goals")}>
          {plural(facts.goals.length, "shared goal")}
        </a>
        <a href={link(team.id, "updates")}>
          {plural(facts.updates.length, "visible update")}
        </a>
      </div>
      <small>As of {stamp(asOf)}</small>
      <div className="organization-card-actions">
        <FollowButton
          following={following}
          disabled={busy || !!team.archived_at}
          onClick={onFollow}
        />
        {team.archived_at && <small>Archived teams cannot be followed.</small>}
      </div>
    </article>
  );
}
export function OrganizationStatus({
  state,
  empty,
  noResults,
  canCreate,
  onRetry,
  onClear,
  onCreate,
}: {
  state: OrganizationState;
  empty: boolean;
  noResults: boolean;
  canCreate: boolean;
  onRetry: () => void;
  onClear: () => void;
  onCreate: () => void;
}) {
  if (state === "loading")
    return (
      <div
        className="organization-grid"
        role="status"
        aria-label="Loading teams"
      >
        {[0, 1].map((i) => (
          <div
            className="card organization-skeleton"
            key={i}
            aria-hidden="true"
          >
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  if (state === "denied")
    return (
      <div className="empty" role="alert">
        <h2>Organization access is unavailable</h2>
        <p>Your current session cannot view this directory.</p>
        <button className="secondary" onClick={onRetry}>
          Retry access
        </button>
      </div>
    );
  if (state === "error")
    return (
      <div className="empty" role="alert">
        <h2>Teams could not be loaded</h2>
        <p>
          The workspace request failed. Check your connection and try again.
        </p>
        <button className="secondary" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        <h2>No teams yet</h2>
        <p>
          {canCreate
            ? "Create a team to describe its purpose and structure."
            : "Ask your workspace administrator about adding a team."}
        </p>
        {canCreate && (
          <button className="primary" onClick={onCreate}>
            Create team
          </button>
        )}
      </div>
    );
  if (noResults)
    return (
      <div className="empty">
        <h2>No matching teams</h2>
        <p>Try another team or role, or clear your search.</p>
        <button className="secondary" onClick={onClear}>
          Clear filters
        </button>
      </div>
    );
  return null;
}
class SectionBoundary extends Component<
  { children: ReactNode; name: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div role="alert">
        <p>{this.props.name} could not be displayed.</p>
        <button
          className="secondary"
          onClick={() => this.setState({ failed: false })}
        >
          Retry section
        </button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export default function OrganizationDirectory({
  teams,
  people,
  records,
  userRole,
  following,
  asOf,
  state,
  busy,
  onRetry,
  onCreate,
  onEdit,
  onArchive,
  onFollow,
  onSource,
  onGoal,
}: {
  teams: OrganizationTeam[];
  people: OrganizationPerson[];
  records: OrganizationRecord[];
  userRole: string;
  following: string[];
  asOf: string;
  state: OrganizationState;
  busy: boolean;
  onRetry: () => void;
  onCreate: () => void;
  onEdit: (t: OrganizationTeam) => void;
  onArchive: (t: OrganizationTeam) => void;
  onFollow: (id: string, desired: boolean) => Promise<void>;
  onSource: (id: string) => void;
  onGoal: (id: string) => void;
}) {
  const [query, setQuery] = useState(""),
    [archived, setArchived] = useState(false),
    [path, setPath] = useState<string[]>([]),
    [popup, setPopup] = useState<OrganizationTeam | null>(null);
  const canAdmin = userRole === "root";
  useEffect(() => {
    const view = document.defaultView;
    const sync = () => {
      try {
        const parts = view?.location.hash.split("/") || [];
        setPath(
          parts[0] === "#organization"
            ? parts.slice(1).map(decodeURIComponent)
            : [],
        );
      } catch {
        setPath([]);
      }
    };
    sync();
    view?.addEventListener("hashchange", sync);
    return () => view?.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (path[0] && state === "ready") {
      const heading = document.getElementById(
        `organization-${path[1] || "purpose"}`,
      );
      heading?.focus();
      heading?.scrollIntoView({ block: "nearest" });
    }
  }, [path, state]);
  const members = (id: string) =>
    people
      .filter((p) => p.team_id === id && !p.archived_at && p.role !== "root")
      .sort((a, b) => a.name.localeCompare(b.name));
  const allowed = teams.filter((t) => canAdmin || !t.archived_at);
  const shown = searchTeams(allowed, people, query, canAdmin && archived);
  const team = allowed.find((t) => t.id === path[0]);
  const section = (id: string, title: string, content: ReactNode) => (
    <section className="organization-section">
      <h3 id={`organization-${id}`} tabIndex={-1}>
        {title}
      </h3>
      <SectionBoundary key={`${team?.id}-${id}-${asOf}`} name={title}>
        {content}
      </SectionBoundary>
    </section>
  );
  const work = (items: OrganizationRecord[], empty: string, goals = false) =>
    items.length ? (
      <ul className="organization-work">
        {items.map((r) => (
          <li key={r.id}>
            <h4>{r.title}</h4>
            <p>{r.body}</p>
            <small>As of {stamp(r.updated_at)}</small>
            <button
              className="text-button"
              onClick={() => (goals ? onGoal(r.id) : onSource(r.id))}
            >
              {goals ? "View in Goals" : "View source"}
            </button>
          </li>
        ))}
      </ul>
    ) : (
      <p>{empty}</p>
    );
  return (
    <div className="organization-directory">
      {state !== "ready" ? (
        <OrganizationStatus
          state={state}
          empty={false}
          noResults={false}
          canCreate={canAdmin}
          onRetry={onRetry}
          onClear={() => setQuery("")}
          onCreate={onCreate}
        />
      ) : path[0] ? (
        team ? (
          <>
            <a href="#organization">← All teams</a>
            <header className="organization-team-header">
              <div>
                <h2>{team.name}</h2>
                <small>
                  As of {stamp(asOf)} · Facts include only records visible to
                  you.
                </small>
              </div>
              <FollowButton
                following={following.includes(team.id)}
                disabled={busy || !!team.archived_at}
                onClick={() => setPopup(team)}
              />
            </header>
            {team.archived_at && (
              <p>Archived team. Following is unavailable.</p>
            )}
            {section(
              "purpose",
              "Purpose",
              <p>{team.mission || "No purpose has been listed yet."}</p>,
            )}
            {section(
              "members",
              "Members and roles",
              members(team.id).length ? (
                <RoleGroups people={members(team.id)} />
              ) : (
                <p>No members listed yet.</p>
              ),
            )}
            {section(
              "goals",
              "Shared goals",
              work(
                teamFacts(records, team.id).goals,
                "No shared goals are visible to you yet.",
                true,
              ),
            )}
            {section(
              "updates",
              "Recent updates",
              work(
                teamFacts(records, team.id).updates,
                "No updates are visible to you yet.",
              ),
            )}
            {section(
              "invitations",
              "Open invitations",
              work(
                teamFacts(records, team.id).invitations,
                "No open invitations are visible to you yet.",
              ),
            )}
            {section(
              "engagement",
              "Engagement",
              <>
                <p>
                  Activity in the records visible to you, as of {stamp(asOf)}.
                </p>
                <div className="organization-facts">
                  <a href={link(team.id, "updates")}>
                    {plural(
                      teamFacts(records, team.id).updates.length,
                      "visible update",
                    )}
                  </a>
                  <a href={link(team.id, "goals")}>
                    {plural(
                      teamFacts(records, team.id).goals.length,
                      "shared goal",
                    )}
                  </a>
                  <a href={link(team.id, "invitations")}>
                    {plural(
                      teamFacts(records, team.id).invitations.length,
                      "open invitation",
                    )}
                  </a>
                </div>
                {!records.some(
                  (r) =>
                    r.team_id === team.id &&
                    !r.archived_at &&
                    ["post", "goal", "allocation"].includes(r.kind),
                ) && <p>No activity records are visible to you yet.</p>}
              </>,
            )}
          </>
        ) : (
          <div className="empty">
            <h2>Team unavailable</h2>
            <p>
              This team is not in the directory returned for your current
              persona.
            </p>
            <a href="#organization">Back to teams</a>
          </div>
        )
      ) : (
        <>
          <div className="organization-toolbar">
            <label>
              <span>Search teams or roles</span>
              <div>
                <Search size={18} aria-hidden="true" />
                <input
                  placeholder="Search teams or roles"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </label>
            {canAdmin && (
              <button className="primary" disabled={busy} onClick={onCreate}>
                Create team
              </button>
            )}
          </div>
          <div className="organization-results">
            <p role="status">{plural(shown.length, "team")}</p>
            <small>As of {stamp(asOf)}</small>
            {canAdmin && (
              <details>
                <summary>More filters</summary>
                <label>
                  <input
                    type="checkbox"
                    checked={archived}
                    onChange={(e) => setArchived(e.target.checked)}
                  />{" "}
                  Include archived entries
                </label>
              </details>
            )}
            {query && (
              <button className="text-button" onClick={() => setQuery("")}>
                Clear filters
              </button>
            )}
          </div>
          <OrganizationStatus
            state={state}
            empty={!allowed.filter((t) => archived || !t.archived_at).length}
            noResults={!shown.length}
            canCreate={canAdmin}
            onRetry={onRetry}
            onClear={() => setQuery("")}
            onCreate={onCreate}
          />
          <div className="organization-grid">
            {shown.map((t) => (
              <TeamCard
                key={t.id}
                team={t}
                members={members(t.id)}
                records={records}
                allPeople={people}
                canAdmin={canAdmin}
                following={following.includes(t.id)}
                busy={busy}
                asOf={asOf}
                onFollow={() => setPopup(t)}
                onEdit={() => onEdit(t)}
                onArchive={() => onArchive(t)}
              />
            ))}
          </div>
        </>
      )}
      {popup && (
        <FollowPopup
          team={popup}
          following={following.includes(popup.id)}
          onChange={onFollow}
          onClose={() => setPopup(null)}
        />
      )}
    </div>
  );
}
