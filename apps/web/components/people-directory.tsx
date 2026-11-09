import { useEffect, useRef, useState } from "react";
import { Heart, MoreHorizontal, Search, ArrowLeft } from "lucide-react";
export type DirectoryPerson = {
  id: string;
  name: string;
  title: string;
  role: string;
  team_id: string;
  skills: string[];
  archived_at?: string | null;
};
type Team = { id: string; name: string; archived_at?: string | null };
export type DirectoryFilters = {
  query: string;
  team: string;
  skill: string;
  archived: boolean;
};
export function filterPeople(
  people: DirectoryPerson[],
  teams: Team[],
  filters: DirectoryFilters,
) {
  const words = filters.query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return people
    .filter((p) => p.role !== "root" && (filters.archived || !p.archived_at))
    .filter((p) => !filters.team || p.team_id === filters.team)
    .filter((p) => !filters.skill || p.skills.includes(filters.skill))
    .filter((p) => {
      const content = [
        p.name,
        p.title,
        p.role,
        teams.find((t) => t.id === p.team_id)?.name || "",
        ...p.skills,
      ]
        .join(" ")
        .toLocaleLowerCase();
      return words.every((word) => content.includes(word));
    })
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}
export function PersonCard({
  person: p,
  team,
  self,
  canAdmin,
  canRestore = true,
  busy,
  onSkill,
  onRecognize,
  onEdit,
  onArchive,
}: {
  person: DirectoryPerson;
  team: string;
  self: boolean;
  canAdmin: boolean;
  canRestore?: boolean;
  busy: boolean;
  onSkill: (skill: string) => void;
  onRecognize: () => void;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const reason = self
    ? "You can't recognize yourself"
    : p.archived_at
      ? "This colleague is archived"
      : "";
  return (
    <article className="card colleague-card" aria-label={p.name}>
      <div className="colleague-identity">
        <a
          className="colleague-profile-link"
          href={`#people/${encodeURIComponent(p.id)}`}
          aria-label={`View ${p.name}'s profile`}
        >
          <span className="avatar large" aria-hidden="true">
            {p.name
              .split(" ")
              .map((s) => s[0])
              .slice(0, 2)
              .join("")}
          </span>
          <span>
            <strong>{p.name}</strong>
            <span className="colleague-role">
              {p.title || p.role} · {team}
            </span>
          </span>
        </a>
        {canAdmin && (
          <details className="colleague-menu">
            <summary aria-label={`Actions for ${p.name}`}>
              <MoreHorizontal size={20} aria-hidden="true" />
            </summary>
            <div>
              {!p.archived_at && (
                <button onClick={onEdit} disabled={busy}>
                  Edit person
                </button>
              )}
              <button
                onClick={onArchive}
                disabled={busy || self || (!!p.archived_at && !canRestore)}
              >
                {p.archived_at ? "Restore" : "Archive"}
              </button>
              {p.archived_at && !canRestore && (
                <p>Restore the colleague’s team first.</p>
              )}
            </div>
          </details>
        )}
      </div>
      {p.archived_at && <span className="chip">Archived</span>}
      <div
        className="colleague-skills"
        aria-label={`${p.name}'s self-listed skills`}
      >
        {(expanded ? p.skills : p.skills.slice(0, 4)).map((skill) => (
          <button
            key={skill}
            className="chip"
            onClick={() => onSkill(skill)}
            aria-label={`See colleagues who list ${skill}`}
          >
            {skill}
          </button>
        ))}
        {!p.skills.length && <p>No expertise listed yet.</p>}
        {p.skills.length > 4 && (
          <button
            className="text-button"
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show fewer" : `+${p.skills.length - 4} more`}
          </button>
        )}
      </div>
      <div
        className="colleague-recognize"
        title={reason || undefined}
        tabIndex={reason ? 0 : undefined}
        aria-label={reason || undefined}
      >
        <button
          className="primary"
          disabled={busy || !!reason}
          onClick={onRecognize}
          aria-describedby={reason ? `recognize-reason-${p.id}` : undefined}
        >
          <Heart size={17} aria-hidden="true" />
          Recognize
        </button>
        {reason && <small id={`recognize-reason-${p.id}`}>{reason}</small>}
      </div>
    </article>
  );
}
export type PeopleState = "loading" | "ready" | "error" | "denied";
export function DirectoryState({
  state,
  empty,
  noResults,
  onRetry,
  onClear,
}: {
  state: PeopleState;
  empty: boolean;
  noResults: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  if (state === "loading")
    return (
      <div
        role="status"
        aria-label="Loading colleagues"
        className="people-grid"
      >
        {[0, 1, 2].map((i) => (
          <div className="card colleague-skeleton" key={i} aria-hidden="true">
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
        <h2>Directory access is unavailable</h2>
        <p>
          Your current session cannot view colleagues. Sign in with an
          authorized persona or retry if your access has changed.
        </p>
        <button className="secondary" onClick={onRetry}>
          Retry access
        </button>
      </div>
    );
  if (state === "error")
    return (
      <div className="empty" role="alert">
        <h2>Colleagues could not be loaded</h2>
        <p>
          The directory request failed. Check your connection and try again.
        </p>
        <button className="secondary" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  if (empty)
    return (
      <div className="empty">
        <h2>No colleagues to show</h2>
        <p>
          No active colleague entries are available in this response. Check with
          your workspace administrator or try again later.
        </p>
        <button className="secondary" onClick={onRetry}>
          Refresh directory
        </button>
      </div>
    );
  if (noResults)
    return (
      <div className="empty">
        <p>
          No one lists that expertise yet. Try another skill or clear the
          filters.
        </p>
        <button className="secondary" onClick={onClear}>
          Clear filters
        </button>
      </div>
    );
  return null;
}
export default function PeopleDirectory({
  people,
  teams,
  user,
  state,
  busy,
  onRetry,
  onExpertise,
  onCreate,
  onEdit,
  onArchive,
  onRecognize,
  renderProfileWork,
  opportunities,
}: {
  people: DirectoryPerson[];
  teams: Team[];
  user: DirectoryPerson;
  state: PeopleState;
  busy: boolean;
  onRetry: () => void;
  onExpertise: () => void;
  onCreate: () => void;
  onEdit: (p: DirectoryPerson) => void;
  onArchive: (p: DirectoryPerson) => void;
  onRecognize: (p: DirectoryPerson) => void;
  renderProfileWork?: (p: DirectoryPerson) => React.ReactNode;
  opportunities?: React.ReactNode;
}) {
  const [filters, setFilters] = useState<DirectoryFilters>({
    query: "",
    team: "",
    skill: "",
    archived: false,
  });
  const [profileId, setProfileId] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const canAdmin = user.role === "root";
  useEffect(() => {
    const browser = document.defaultView;
    const sync = () => {
      try {
        setProfileId(
          decodeURIComponent(
            browser?.location.hash.match(/^#people\/(.+)$/)?.[1] || "",
          ),
        );
      } catch {
        setProfileId("");
      }
    };
    sync();
    browser?.addEventListener("hashchange", sync);
    return () => browser?.removeEventListener("hashchange", sync);
  }, []);
  useEffect(() => {
    if (profileId) heading.current?.focus();
  }, [profileId]);
  const eligible = people.filter(
    (p) => p.role !== "root" && (canAdmin || !p.archived_at),
  );
  const visible = filterPeople(eligible, teams, {
    ...filters,
    archived: canAdmin && filters.archived,
  });
  const profile = eligible.find((p) => p.id === profileId);
  const clear = () =>
    setFilters({ query: "", team: "", skill: "", archived: false });
  const skillOptions = [
    ...new Set(
      eligible
        .filter((p) => filters.archived || !p.archived_at)
        .flatMap((p) => p.skills),
    ),
  ].sort((a, b) => a.localeCompare(b));
  if (state !== "ready")
    return (
      <section className="people-directory">
        <DirectoryState
          state={state}
          empty={false}
          noResults={false}
          onRetry={onRetry}
          onClear={clear}
        />
      </section>
    );
  if (profileId)
    return (
      <section className="people-directory colleague-profile">
        <a href="#people" className="text-button">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to colleagues
        </a>
        {profile ? (
          <>
            <h2 ref={heading} tabIndex={-1}>
              {profile.name}
            </h2>
            <p>
              {profile.title || profile.role} ·{" "}
              {teams.find((t) => t.id === profile.team_id)?.name ||
                "Team unavailable"}
            </p>
            <p>Expertise is self-listed.</p>
            <div className="colleague-skills">
              {profile.skills.map((skill) => (
                <a
                  className="chip"
                  href="#people"
                  key={skill}
                  onClick={() => setFilters({ ...filters, skill })}
                >
                  {skill}
                </a>
              ))}
            </div>
            <div className="profile-actions">
              {profile.id === user.id ? (
                <button className="secondary" onClick={onExpertise}>
                  Edit my expertise
                </button>
              ) : (
                <button
                  className="primary"
                  disabled={busy || !!profile.archived_at}
                  onClick={() => onRecognize(profile)}
                >
                  <Heart size={17} aria-hidden="true" />
                  Recognize
                </button>
              )}
            </div>
            {renderProfileWork?.(profile)}
          </>
        ) : (
          <div className="empty">
            <h2 ref={heading} tabIndex={-1}>
              Profile unavailable
            </h2>
            <p>This profile is not available in your current directory.</p>
          </div>
        )}
      </section>
    );
  return (
    <section className="people-directory">
      <p>Expertise is self-listed.</p>
      <div className="people-toolbar">
        <label className="people-search">
          <span>Search colleagues</span>
          <div>
            <Search size={17} aria-hidden="true" />
            <input
              placeholder="Search by name, role or expertise"
              value={filters.query}
              onChange={(e) =>
                setFilters({ ...filters, query: e.target.value })
              }
            />
          </div>
        </label>
        <label>
          Team
          <select
            value={filters.team}
            onChange={(e) => setFilters({ ...filters, team: e.target.value })}
          >
            <option value="">All teams</option>
            {teams.map((t) => (
              <option value={t.id} key={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Skill
          <select
            value={filters.skill}
            onChange={(e) => setFilters({ ...filters, skill: e.target.value })}
          >
            <option value="">All skills</option>
            {skillOptions.map((skill) => (
              <option key={skill}>{skill}</option>
            ))}
          </select>
        </label>
        <div className="people-toolbar-actions">
          <button className="secondary" onClick={onExpertise}>
            Edit my expertise
          </button>
          {canAdmin && (
            <button className="primary" disabled={busy} onClick={onCreate}>
              Create person
            </button>
          )}
        </div>
      </div>
      <div className="people-results">
        <p role="status">
          {visible.length} {visible.length === 1 ? "colleague" : "colleagues"}
        </p>
        {canAdmin && (
          <details>
            <summary>More filters</summary>
            <label>
              <input
                type="checkbox"
                checked={filters.archived}
                onChange={(e) =>
                  setFilters({ ...filters, archived: e.target.checked })
                }
              />
              Include archived entries
            </label>
          </details>
        )}
        {(filters.query ||
          filters.team ||
          filters.skill ||
          filters.archived) && (
          <button className="text-button" onClick={clear}>
            Clear filters
          </button>
        )}
      </div>
      <DirectoryState
        state={state}
        empty={!eligible.some((p) => filters.archived || !p.archived_at)}
        noResults={!visible.length}
        onRetry={onRetry}
        onClear={clear}
      />
      <div className="people-grid">
        {visible.map((p) => (
          <PersonCard
            key={p.id}
            person={p}
            team={
              teams.find((t) => t.id === p.team_id)?.name || "Team unavailable"
            }
            self={p.id === user.id}
            canAdmin={canAdmin}
            canRestore={teams.some((t) => t.id === p.team_id && !t.archived_at)}
            busy={busy}
            onSkill={(skill) => setFilters({ ...filters, skill })}
            onRecognize={() => onRecognize(p)}
            onEdit={() => onEdit(p)}
            onArchive={() => onArchive(p)}
          />
        ))}
      </div>
      {opportunities}
    </section>
  );
}
