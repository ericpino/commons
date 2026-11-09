"use client";
import { useEffect, useState, FormEvent } from "react";
import {
  Home,
  Users,
  Network,
  Flag,
  Layers,
  Wallet,
  ChartNoAxesCombined,
  ShieldCheck,
  Search,
  ArrowUpRight,
  Plus,
  Check,
  LogOut,
  MessageSquare,
  Heart,
  ArrowRight,
  X,
  Compass,
  ExternalLink,
} from "lucide-react";
type Person = {
  id: string;
  name: string;
  role: string;
  team_id: string;
  title: string;
  skills: string[];
};
type Work = {
  id: string;
  kind: string;
  title: string;
  body: string;
  team_id: string;
  visibility: string;
  owner_id: string;
  data: Record<string, string | number>;
  updated_at: string;
  created_at: string;
};
type Team = { id: string; name: string; mission: string };
type Workspace = {
  user: Person;
  people: Person[];
  teams: Team[];
  records: Work[];
  joined: string[];
  following: string[];
  asOf: string;
};
type Insight = {
  title: string;
  value: string;
  explanation: string;
  sources: Work[];
};
type Audit = {
  id: string;
  actor: string;
  action: string;
  record_id: string;
  created_at: string;
  detail: unknown;
};
const navigation = [
  { name: "Home", icon: Home },
  { name: "People", icon: Users },
  { name: "Organization", icon: Network },
  { name: "Goals", icon: Flag },
  { name: "Allocation", icon: Layers },
  { name: "Budget", icon: Wallet },
  { name: "Insights", icon: ChartNoAxesCombined },
  { name: "Compliance", icon: ShieldCheck },
];
const intro: Record<string, [string, string]> = {
  Home: [
    "Good work deserves to be seen.",
    "Share progress, celebrate contributions, and connect the dots.",
  ],
  People: [
    "Find your people.",
    "Discover colleagues and the expertise they choose to share.",
  ],
  Organization: [
    "A shared sense of direction.",
    "Explore our teams, their purpose, and the work that connects us.",
  ],
  Goals: [
    "Progress with a purpose.",
    "A clear view of what we’re working toward, backed by evidence.",
  ],
  Allocation: [
    "Make room for meaningful work.",
    "Find opportunities to contribute. Every invitation is opt-in.",
  ],
  Budget: [
    "Understand what drives the numbers.",
    "Plan and actuals, with traceable source records. All amounts in USD.",
  ],
  Insights: [
    "From shared work to shared understanding.",
    "Explore answers grounded in records you have permission to see.",
  ],
  Compliance: [
    "Trust is part of the work.",
    "Trace sensitive changes and understand who can see what.",
  ],
};
async function api<T = unknown>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Something went wrong");
  return data;
}
const initials = (name: string) =>
  name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
export default function Page() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null),
    [demo, setDemo] = useState<Person[]>([]),
    [screen, setScreen] = useState("Home"),
    [query, setQuery] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [modal, setModal] = useState<string | null>(null),
    [selected, setSelected] = useState<Work | null>(null),
    [insights, setInsights] = useState<{
      answers: Insight[];
      asOf: string;
      coverage: string;
      mode: string;
    } | null>(null),
    [audit, setAudit] = useState<Audit[]>([]),
    [feed, setFeed] = useState("All updates"),
    [recipient, setRecipient] = useState("");
  useEffect(() => {
    if (!modal) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]');
    const items = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input, select, textarea, [tabindex="0"]',
        ) || [],
      );
    const firstInput = dialog?.querySelector<HTMLElement>(
      "input, select, textarea",
    );
    (firstInput || items()[0])?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        setModal(null);
        setSelected(null);
      }
      if (event.key !== "Tab") return;
      const nodes = items();
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal, busy]);
  async function refresh() {
    const w = await api<Workspace>("workspace");
    setWorkspace(w);
    return w;
  }
  useEffect(() => {
    Promise.all([
      api<Person[]>("demo-users").then(setDemo),
      refresh().catch(() => null),
    ])
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!workspace) return;
    if (screen === "Insights")
      api<typeof insights>("insights")
        .then(setInsights)
        .catch((e) => setError(e.message));
    if (screen === "Compliance")
      api<Audit[]>("audit")
        .then(setAudit)
        .catch((e) => setError(e.message));
  }, [screen, workspace]);
  async function mutate(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, method, body);
      await refresh();
      setModal(null);
      setSelected(null);
      setNotice("Saved. Your workspace is up to date.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await api("login", "POST", {
        userId: f.get("user"),
        password: f.get("password"),
      });
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (modal === "skills")
      return mutate("profile", "PATCH", {
        skills: String(f.skills)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      });
    if (modal === "edit" && selected)
      return mutate(`records/${selected.id}`, "PATCH", f);
    return mutate("records", "POST", {
      ...f,
      kind: modal,
      teamId: workspace?.user.team_id,
    });
  }
  if (loading)
    return (
      <main className="login">
        <div className="brand">
          <span className="brand-mark">c</span>commons
        </div>
        <p>Opening your workspace…</p>
      </main>
    );
  if (!workspace)
    return (
      <main className="login">
        <div className="login-story">
          <div className="brand">
            <span className="brand-mark">c</span>commons
            <span className="beta">PILOT</span>
          </div>
          <span className="eyebrow">A LITTLE MORE CONNECTED</span>
          <h1>
            Great work starts
            <br />
            with common ground.
          </h1>
          <p>
            A place to share progress, discover expertise,
            <br />
            and see the bigger picture. Welcome to Northstar.
          </p>
          <div className="login-art">
            <div>People</div>
            <span>↗</span>
            <div>Purpose</div>
            <span>↗</span>
            <div>Progress</div>
          </div>
          <small>Fictional company. Real, connected workflows.</small>
        </div>
        <form className="login-card" onSubmit={login}>
          <span className="eyebrow">NORTHSTAR WORKSPACE</span>
          <h2>Make yourself at home.</h2>
          <p>Choose a seeded persona to explore its permissions.</p>
          <label>
            Demo persona
            <select name="user">
              {demo.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Demo password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Provided by the workspace host"
            />
          </label>
          {error && (
            <div role="alert" className="error">
              {error}
            </div>
          )}
          <button className="primary" disabled={busy || !demo.length}>
            {busy ? "Signing in…" : "Enter workspace"}
            <ArrowRight size={17} />
          </button>
          <small>
            Use Maya for employee access, Alex for team planning, or Jordan for
            finance and audit access.
          </small>
        </form>
      </main>
    );
  const { user, records, people, teams } = workspace;
  const person = (id: string) => people.find((p) => p.id === id);
  const team = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const matches = (s: string) => s.toLowerCase().includes(query.toLowerCase());
  const filtered = (kind: string) =>
    records.filter((r) => r.kind === kind && matches(`${r.title} ${r.body}`));
  const manage = (r: Work) =>
    r.kind === "budget"
      ? user.role === "finance"
      : user.role === "finance" ||
        (user.role === "lead" && user.team_id === r.team_id);
  const canCreate = ["Goals", "Allocation"].includes(screen)
    ? user.role !== "employee"
    : screen === "Budget"
      ? user.role === "finance"
      : false;
  const source = (r: Work) => (
    <button
      className="text-button"
      onClick={() => {
        setSelected(r);
        setModal("source");
      }}
    >
      View source <ArrowUpRight size={14} />
    </button>
  );
  const empty = (message: string) => (
    <div className="empty">
      <Compass size={28} />
      <h3>Nothing here yet</h3>
      <p>{message}</p>
    </div>
  );
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">c</span>commons
        </div>
        <div className="workspace-brand">
          <span className="northstar">✳</span>
          <div>
            Northstar<small>Our shared workspace</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {navigation.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={screen === name ? "active" : ""}
              onClick={() => {
                setScreen(name);
                setQuery("");
                setError("");
                setNotice("");
              }}
            >
              <Icon size={19} />
              {name}
              {name === "Home" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="pilot-note">
            <span>Built on trust.</span>
            <p>
              Contributions, not scores.
              <br />
              Invitations, not assignments.
            </p>
          </div>
          <button
            className="account"
            onClick={async () => {
              await api("logout", "POST");
              setWorkspace(null);
              setInsights(null);
              setAudit([]);
              setScreen("Home");
            }}
          >
            <span className="avatar small">{initials(user.name)}</span>
            <span>
              {user.name}
              <small>
                {user.role === "lead"
                  ? "Team lead"
                  : user.role === "finance"
                    ? "Finance admin"
                    : "Employee"}
              </small>
            </span>
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <div>
            <span className="muted">Workspace</span>
            <span className="slash">/</span>
            {screen}
          </div>
          <label className="search">
            <Search size={16} />
            <input
              aria-label="Search current module"
              placeholder={`Search ${screen.toLowerCase()}…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <span className="demo-tag">DEMO WORKSPACE</span>
          <span className="avatar small">{initials(user.name)}</span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {screen === "Home"
                  ? `WELCOME BACK, ${user.name.split(" ")[0].toUpperCase()}`
                  : `NORTHSTAR / ${screen.toUpperCase()}`}
              </div>
              <h1>{intro[screen][0]}</h1>
              <p>{intro[screen][1]}</p>
            </div>
            {screen === "Home" ? (
              <button className="primary" onClick={() => setModal("post")}>
                <Plus size={17} />
                Share an update
              </button>
            ) : canCreate ? (
              <button
                className="primary"
                onClick={() =>
                  setModal(
                    screen === "Goals"
                      ? "goal"
                      : screen === "Budget"
                        ? "budget"
                        : "allocation",
                  )
                }
              >
                <Plus size={17} />
                Create{" "}
                {screen === "Goals"
                  ? "goal"
                  : screen === "Budget"
                    ? "budget"
                    : "opportunity"}
              </button>
            ) : null}
          </div>
          {error && (
            <div className="error" role="alert">
              {error}
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              <Check size={16} />
              {notice}
              <button
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          {screen === "Home" && (
            <>
              <section className="welcome-banner">
                <div>
                  <span className="eyebrow">BETTER, TOGETHER</span>
                  <h2>
                    Small updates.
                    <br />A bigger picture.
                  </h2>
                  <p>
                    Your work is part of something shared.
                    <br />
                    Let the rest of the team in.
                  </p>
                  <button onClick={() => setScreen("Goals")}>
                    Explore our shared goals <ArrowUpRight size={16} />
                  </button>
                </div>
                <div className="banner-art" aria-hidden="true">
                  <div className="orbit orbit-one" />
                  <div className="orbit orbit-two" />
                  <div className="art-tile tile-one">
                    <Flag />
                    Shared purpose
                  </div>
                  <div className="art-tile tile-two">
                    <Users />
                    Connected people
                  </div>
                  <div className="art-center">✳</div>
                  <div className="art-tile tile-three">
                    <Check />
                    Meaningful progress
                  </div>
                </div>
              </section>
              <div className="home-grid">
                <section>
                  <div className="section-title">
                    <h2>Your workspace, in motion</h2>
                    <span className="muted">
                      {
                        records.filter((r) =>
                          ["post", "recognition"].includes(r.kind),
                        ).length
                      }{" "}
                      updates
                    </span>
                  </div>
                  <div className="tabs">
                    {["All updates", "Following", "Recognition"].map((t) => (
                      <button
                        className={feed === t ? "selected" : ""}
                        key={t}
                        onClick={() => setFeed(t)}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <button className="composer" onClick={() => setModal("post")}>
                    <span className="avatar">{initials(user.name)}</span>
                    <span>
                      What’s moving forward, {user.name.split(" ")[0]}?
                    </span>
                    <Plus size={18} />
                  </button>
                  {records
                    .filter(
                      (r) =>
                        ["post", "recognition"].includes(r.kind) &&
                        matches(`${r.title} ${r.body}`) &&
                        (feed !== "Recognition" || r.kind === "recognition") &&
                        (feed !== "Following" ||
                          workspace.following.includes(r.team_id)),
                    )
                    .map((r) => (
                      <article className="card feed-card" key={r.id}>
                        <div className="post-meta">
                          <span
                            className={`avatar ${r.owner_id === "alex" ? "blue" : ""}`}
                          >
                            {initials(person(r.owner_id)?.name || "?")}
                          </span>
                          <div>
                            <strong>{person(r.owner_id)?.name}</strong>
                            <span>
                              {team(r.team_id)} <span>·</span>{" "}
                              {date(r.created_at)}
                            </span>
                          </div>
                          <span className="chip">
                            {r.visibility === "team"
                              ? "Team only"
                              : r.kind === "recognition"
                                ? "Recognition"
                                : "Update"}
                          </span>
                        </div>
                        {r.kind === "recognition" && (
                          <div className="recognition-label">
                            <Heart size={16} /> Celebrating{" "}
                            {person(String(r.data.recipient))?.name} ·
                            Collaboration
                          </div>
                        )}
                        <h3>{r.title}</h3>
                        <p>{r.body}</p>
                        <div className="post-footer">
                          <span>
                            <MessageSquare size={15} /> Shared with{" "}
                            {r.visibility === "team"
                              ? "your team"
                              : "Northstar"}
                          </span>
                          {source(r)}
                        </div>
                      </article>
                    ))}
                  {!records.some(
                    (r) =>
                      ["post", "recognition"].includes(r.kind) &&
                      matches(`${r.title} ${r.body}`) &&
                      (feed !== "Recognition" || r.kind === "recognition") &&
                      (feed !== "Following" ||
                        workspace.following.includes(r.team_id)),
                  ) &&
                    empty(
                      "Follow a team in Organization or share your first update.",
                    )}
                </section>
                <aside className="right-rail">
                  <div className="card">
                    <span className="eyebrow">
                      A LITTLE RECOGNITION GOES FAR
                    </span>
                    <div className="recognition-icon">✺</div>
                    <h3>Who made a difference?</h3>
                    <p>
                      Celebrate a contribution that helped move things forward.
                    </p>
                    <button
                      className="secondary full"
                      onClick={() => setModal("recognition")}
                    >
                      <Heart size={16} />
                      Recognize a colleague
                    </button>
                  </div>
                  <div className="card">
                    <div className="section-title">
                      <h3>Connected work</h3>
                      <Flag size={18} />
                    </div>
                    {records
                      .filter((r) => r.kind === "goal")
                      .slice(0, 3)
                      .map((r) => (
                        <button
                          className="goal-link"
                          key={r.id}
                          onClick={() => setScreen("Goals")}
                        >
                          <span>{r.title}</span>
                          <div className="progress">
                            <i style={{ width: `${r.data.progress}%` }} />
                          </div>
                          <small>
                            {r.data.progress}% · {team(r.team_id)}
                          </small>
                        </button>
                      ))}
                  </div>
                  <div className="quiet-note">
                    <ShieldCheck size={18} />
                    <p>
                      What you see respects your role and team. Recognition is
                      never a performance score.
                    </p>
                  </div>
                </aside>
              </div>
            </>
          )}
          {screen === "People" && (
            <>
              <div className="section-title">
                <span>
                  {people.length} colleagues · Expertise is self-listed
                </span>
                <button
                  className="secondary"
                  onClick={() => setModal("skills")}
                >
                  Edit my expertise
                </button>
              </div>
              <div className="cards-grid">
                {people
                  .filter((p) =>
                    matches(`${p.name} ${p.skills.join(" ")} ${p.title}`),
                  )
                  .map((p) => (
                    <article className="card person-card" key={p.id}>
                      <span className="avatar large">{initials(p.name)}</span>
                      <h3>{p.name}</h3>
                      <p>
                        {p.title}
                        <br />
                        {team(p.team_id)}
                      </p>
                      <div className="skills">
                        {p.skills.map((s) => (
                          <span className="chip" key={s}>
                            {s}
                          </span>
                        ))}
                      </div>
                      <small>Self-listed expertise · No ratings</small>
                      <button
                        className="text-button"
                        disabled={p.id === user.id}
                        onClick={() => {
                          setModal("recognition");
                          setRecipient(p.id);
                        }}
                      >
                        <Heart size={15} />
                        Recognize a contribution
                      </button>
                    </article>
                  ))}
              </div>
            </>
          )}
          {screen === "Organization" && (
            <div className="cards-grid two">
              {teams
                .filter((t) => matches(`${t.name} ${t.mission}`))
                .map((t) => (
                  <article className="card team-card" key={t.id}>
                    <span className="team-symbol">
                      <Network size={25} />
                    </span>
                    <h2>{t.name}</h2>
                    <p>{t.mission}</p>
                    <div className="team-people">
                      {people
                        .filter((p) => p.team_id === t.id)
                        .map((p) => (
                          <div key={p.id}>
                            <span className="avatar small">
                              {initials(p.name)}
                            </span>
                            <span>
                              {p.name}
                              <small>
                                {p.title}
                                {p.role === "lead" ? " · Team lead" : ""}
                              </small>
                            </span>
                          </div>
                        ))}
                    </div>
                    <div className="team-stats">
                      <span>
                        {
                          records.filter(
                            (r) => r.team_id === t.id && r.kind === "goal",
                          ).length
                        }{" "}
                        shared goals
                      </span>
                      <span>
                        {
                          records.filter(
                            (r) => r.team_id === t.id && r.kind === "post",
                          ).length
                        }{" "}
                        visible updates
                      </span>
                    </div>
                    <button
                      className="secondary full"
                      disabled={busy}
                      onClick={() => mutate(`teams/${t.id}/follow`, "POST")}
                    >
                      {workspace.following.includes(t.id) ? (
                        <Check size={16} />
                      ) : (
                        <Plus size={16} />
                      )}{" "}
                      {workspace.following.includes(t.id)
                        ? "Following · click to unfollow"
                        : "Follow team"}
                    </button>
                    <small>
                      Following curates your feed; it does not grant private
                      access.
                    </small>
                  </article>
                ))}
            </div>
          )}
          {screen === "Goals" && (
            <div className="cards-grid two">
              {filtered("goal").map((r) => (
                <article className="card" key={r.id}>
                  <div className="section-title">
                    <span className="chip">{team(r.team_id)}</span>
                    <Flag size={19} />
                  </div>
                  <h2>{r.title}</h2>
                  <p>{r.body}</p>
                  <div className="goal-progress">
                    <strong>
                      {r.data.progress}
                      <small>%</small>
                    </strong>
                    <span>owner-reported progress</span>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${r.data.progress}%` }} />
                  </div>
                  <div className="evidence">
                    <span className="eyebrow">LATEST EVIDENCE</span>
                    <p>{r.data.evidence}</p>
                    <small>
                      Updated {date(r.updated_at)} · {person(r.owner_id)?.name}
                    </small>
                  </div>
                  <div className="card-actions">
                    {source(r)}
                    {manage(r) && (
                      <button
                        className="secondary"
                        onClick={() => {
                          setSelected(r);
                          setModal("edit");
                        }}
                      >
                        Update progress
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {!filtered("goal").length && empty("No goals match your search.")}
            </div>
          )}
          {screen === "Allocation" && (
            <>
              <div className="info-strip">
                <Compass size={20} />
                <span>
                  Opt in to work that interests you. Joining expresses interest;
                  it never changes your manager or automatically commits
                  capacity.
                </span>
              </div>
              <div className="cards-grid two">
                {filtered("allocation").map((r) => (
                  <article className="card" key={r.id}>
                    <span className="chip">
                      OPEN INVITATION · {team(r.team_id)}
                    </span>
                    <h2>{r.title}</h2>
                    <p>{r.body}</p>
                    <div className="metrics">
                      <div>
                        <strong>{r.data.capacity}h</strong>
                        <span>available / week</span>
                      </div>
                      <div>
                        <strong>{r.data.needed}h</strong>
                        <span>needed / week</span>
                      </div>
                      <div>
                        <strong>
                          {Math.max(
                            0,
                            Number(r.data.needed) - Number(r.data.capacity),
                          )}
                          h
                        </strong>
                        <span>capacity gap</span>
                      </div>
                    </div>
                    <p className="muted">
                      Suggested contribution: {r.data.hours} hours / week
                    </p>
                    <div className="card-actions">
                      <button
                        className={
                          workspace.joined.includes(r.id)
                            ? "secondary"
                            : "primary"
                        }
                        disabled={busy}
                        onClick={() => mutate(`records/${r.id}/join`, "POST")}
                      >
                        {workspace.joined.includes(r.id)
                          ? "Withdraw interest"
                          : "I’m interested"}
                        <ArrowUpRight size={15} />
                      </button>
                      {manage(r) ? (
                        <button
                          className="text-button"
                          onClick={() => {
                            setSelected(r);
                            setModal("edit");
                          }}
                        >
                          Edit capacity
                        </button>
                      ) : (
                        source(r)
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {screen === "Budget" &&
            (user.role !== "finance" ? (
              <div className="empty">
                <ShieldCheck size={35} />
                <h2>Finance access required</h2>
                <p>
                  Budget records are restricted to the finance admin. Sign in as
                  Jordan to review plans, actuals, and source details.
                </p>
                <small>
                  This restriction is enforced by the API, including search and
                  Insights.
                </small>
              </div>
            ) : (
              <>
                <div className="summary-row">
                  {[
                    [
                      "Planned",
                      filtered("budget").reduce(
                        (s, r) => s + Number(r.data.planned),
                        0,
                      ),
                    ],
                    [
                      "Actual spend",
                      filtered("budget").reduce(
                        (s, r) => s + Number(r.data.actual),
                        0,
                      ),
                    ],
                    [
                      "Remaining",
                      filtered("budget").reduce(
                        (s, r) =>
                          s + Number(r.data.planned) - Number(r.data.actual),
                        0,
                      ),
                    ],
                  ].map(([label, value]) => (
                    <div className="card" key={label}>
                      <span>{label}</span>
                      <strong>${Number(value).toLocaleString()}</strong>
                      <small>
                        USD · visible records · as of {date(workspace.asOf)}
                      </small>
                    </div>
                  ))}
                </div>
                <div className="cards-grid two">
                  {filtered("budget").map((r) => (
                    <article className="card" key={r.id}>
                      <span className="chip">
                        {team(r.team_id)} · FINANCE ONLY
                      </span>
                      <h2>{r.title}</h2>
                      <p>{r.body}</p>
                      <div className="metrics">
                        <div>
                          <strong>
                            ${Number(r.data.planned).toLocaleString()}
                          </strong>
                          <span>planned</span>
                        </div>
                        <div>
                          <strong>
                            ${Number(r.data.actual).toLocaleString()}
                          </strong>
                          <span>actual</span>
                        </div>
                      </div>
                      <div className="evidence">
                        <span className="eyebrow">WHAT DRIVES THE SPEND</span>
                        <p>{r.data.driver}</p>
                        <small>Updated {date(r.updated_at)}</small>
                      </div>
                      <div className="card-actions">
                        {source(r)}
                        <button
                          className="secondary"
                          onClick={() => {
                            setSelected(r);
                            setModal("edit");
                          }}
                        >
                          Update budget
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            ))}
          {screen === "Insights" && (
            <>
              {!insights ? (
                <p>Loading source-backed answers…</p>
              ) : (
                <>
                  <div className="info-strip">
                    <ShieldCheck size={20} />
                    <span>
                      {insights.mode}
                      <br />
                      {insights.coverage}
                    </span>
                  </div>
                  <div className="cards-grid">
                    {insights.answers
                      .filter((a) => matches(`${a.title} ${a.explanation}`))
                      .map((a) => (
                        <article className="card insight-card" key={a.title}>
                          <span className="eyebrow">
                            CONNECTED INTELLIGENCE
                          </span>
                          <h2>{a.title}</h2>
                          <strong className="insight-number">{a.value}</strong>
                          <p>{a.explanation}</p>
                          <small>As of {date(insights.asOf)}</small>
                          <div className="sources">
                            <span className="eyebrow">
                              EVIDENCE · {a.sources.length} RECORDS
                            </span>
                            {a.sources.map((r) => (
                              <button
                                key={r.id}
                                onClick={() => {
                                  setSelected(r);
                                  setModal("source");
                                }}
                              >
                                {r.title}
                                <ExternalLink size={14} />
                              </button>
                            ))}
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
            </>
          )}
          {screen === "Compliance" && (
            <>
              <div className="info-strip">
                <ShieldCheck size={20} />
                <span>
                  {user.role === "finance"
                    ? "Finance admins can review all audit entries."
                    : user.role === "lead"
                      ? "Team leads can review their team’s non-financial changes and their own actions."
                      : "Employees can review their own actions."}{" "}
                  Audit entries are created transactionally with sensitive
                  changes.
                </span>
              </div>
              <div className="card audit-card">
                <h2>Activity trail</h2>
                <p>
                  Latest 500 audit entries, filtered to your permissions. UTC
                  timestamps are shown in your browser’s timezone.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Who</th>
                        <th>Action</th>
                        <th>When</th>
                        <th>Record / change</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit
                        .filter((a) => matches(`${a.actor} ${a.action}`))
                        .map((a) => (
                          <tr key={a.id}>
                            <td>{a.actor}</td>
                            <td>
                              <span className="chip">{a.action}</span>
                            </td>
                            <td>{new Date(a.created_at).toLocaleString()}</td>
                            <td>
                              <code>{a.record_id}</code>
                              {Object.keys(a.detail as object).length > 0 && (
                                <details>
                                  <summary>Before / after</summary>
                                  <pre>{JSON.stringify(a.detail, null, 2)}</pre>
                                </details>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {!audit.length &&
                  empty(
                    "Make a change in another module to see its audit record here.",
                  )}
              </div>
            </>
          )}
          <footer className="page-footer">
            <span>✳ Northstar · A Commons pilot</span>
            <span>Fictional data. Thoughtfully connected.</span>
          </footer>
        </main>
      </div>
      {modal && (
        <div
          className="modal-backdrop"
          onClick={() => {
            if (!busy) {
              setModal(null);
              setSelected(null);
            }
          }}
        >
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "source"
                ? "Source record"
                : modal === "edit"
                  ? "Update record"
                  : "Create or edit"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="close"
              aria-label="Close dialog"
              onClick={() => {
                setModal(null);
                setSelected(null);
              }}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">
              COMMONS / {modal === "source" ? "TRUSTED RECORD" : "SHARED WORK"}
            </span>
            <h2>
              {modal === "source"
                ? selected?.title
                : modal === "skills"
                  ? "Your expertise, in your words."
                  : modal === "edit"
                    ? `Update ${selected?.kind}`
                    : modal === "recognition"
                      ? "Recognize a contribution."
                      : modal === "post"
                        ? "What’s moving forward?"
                        : `Create ${modal}`}
            </h2>
            {error && (
              <div className="error" role="alert">
                {error}
              </div>
            )}
            {modal === "source" && selected ? (
              <div>
                <p>{selected.body}</p>
                <dl>
                  <dt>Source ID</dt>
                  <dd>
                    <code>{selected.id}</code>
                  </dd>
                  <dt>Owner</dt>
                  <dd>{person(selected.owner_id)?.name}</dd>
                  <dt>Visibility</dt>
                  <dd>{selected.visibility}</dd>
                  <dt>As of</dt>
                  <dd>{new Date(selected.updated_at).toLocaleString()}</dd>
                  {Object.entries(selected.data).map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : (
              <form onSubmit={save}>
                {modal === "skills" ? (
                  <>
                    <p>
                      List expertise you’re happy to share. Only you can edit
                      it; there are no ratings.
                    </p>
                    <label>
                      Skills, separated by commas
                      <input
                        autoFocus
                        name="skills"
                        defaultValue={user.skills.join(", ")}
                        maxLength={480}
                      />
                    </label>
                  </>
                ) : modal === "edit" && selected ? (
                  <>
                    {selected.kind === "goal" ? (
                      <>
                        <label>
                          Progress (%)
                          <input
                            autoFocus
                            name="progress"
                            type="number"
                            min="0"
                            max="100"
                            required
                            defaultValue={selected.data.progress}
                          />
                        </label>
                        <label>
                          Dated progress evidence
                          <textarea
                            name="evidence"
                            required
                            maxLength={1000}
                            defaultValue={selected.data.evidence}
                          />
                        </label>
                      </>
                    ) : selected.kind === "budget" ? (
                      <>
                        <label>
                          Planned (USD)
                          <input
                            autoFocus
                            name="planned"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            defaultValue={selected.data.planned}
                          />
                        </label>
                        <label>
                          Actual (USD)
                          <input
                            name="actual"
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            defaultValue={selected.data.actual}
                          />
                        </label>
                        <label>
                          Spend drivers / source notes
                          <textarea
                            name="driver"
                            required
                            maxLength={1000}
                            defaultValue={selected.data.driver}
                          />
                        </label>
                      </>
                    ) : (
                      <>
                        <label>
                          Available capacity (hours/week)
                          <input
                            autoFocus
                            name="capacity"
                            type="number"
                            min="0"
                            required
                            defaultValue={selected.data.capacity}
                          />
                        </label>
                        <label>
                          Needed (hours/week)
                          <input
                            name="needed"
                            type="number"
                            min="0"
                            required
                            defaultValue={selected.data.needed}
                          />
                        </label>
                      </>
                    )}
                  </>
                ) : (
                  <>
                    {modal === "recognition" && (
                      <label>
                        Colleague
                        <select name="recipient" defaultValue={recipient}>
                          {people
                            .filter((p) => p.id !== user.id)
                            .map((p) => (
                              <option value={p.id} key={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label>
                      {modal === "recognition"
                        ? "Contribution headline"
                        : "Title"}
                      <input
                        autoFocus
                        name="title"
                        required
                        maxLength={140}
                        placeholder={
                          modal === "post"
                            ? "A milestone, a learning, a decision…"
                            : "Give this work a clear name"
                        }
                      />
                    </label>
                    <label>
                      {modal === "recognition"
                        ? "How did their contribution help?"
                        : "Details"}
                      <textarea
                        name="body"
                        required
                        maxLength={2000}
                        placeholder="Share enough context to help someone connect the dots."
                      />
                    </label>
                    {modal === "goal" && (
                      <label>
                        Target / success measure
                        <input name="target" maxLength={200} required />
                      </label>
                    )}
                    {modal !== "budget" && (
                      <label>
                        Share with
                        <select name="visibility">
                          <option value="company">Everyone at Northstar</option>
                          <option value="team">My team only</option>
                        </select>
                      </label>
                    )}
                    {modal === "recognition" && (
                      <p className="muted">
                        Recognition celebrates a contribution. It never becomes
                        a score or a skills assessment.
                      </p>
                    )}
                  </>
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : modal === "edit" || modal === "skills"
                      ? "Save changes"
                      : modal === "recognition"
                        ? "Send recognition"
                        : "Publish"}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
