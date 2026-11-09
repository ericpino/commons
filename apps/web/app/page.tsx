"use client";
import { useEffect, useState, useRef, FormEvent } from "react";
import SkillPicker from "../components/skill-picker";
import RecordFields from "../components/record-fields";
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
  archived_at?: string | null;
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
  archived_at?: string | null;
};
type Team = {
  id: string;
  name: string;
  mission: string;
  archived_at?: string | null;
};
type Workspace = {
  user: Person;
  demoMode: boolean;
  interests: { record_id: string; id: string; name: string }[];
  engagement: { id: string; followers: number }[];
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
  arithmetic: string;
  coverage: string;
  sources: Work[];
};
type Audit = {
  id: string;
  actor: string;
  action: string;
  record_id: string;
  record_label: string;
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
    [teamPage, setTeamPage] = useState<string | null>(null),
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
    [recipient, setRecipient] = useState(""),
    [showArchived, setShowArchived] = useState(false),
    [entity, setEntity] = useState<Person | Team | null>(null),
    [confirmation, setConfirmation] = useState<{
      path: string;
      title: string;
      restore: boolean;
    } | null>(null);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const dataRequest = useRef(0);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!modal) return;
    setError("");
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
      if (event.key === "Escape" && !busyRef.current) {
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
  }, [modal]);
  async function refresh() {
    const w = await api<Workspace>("workspace?archived=true");
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
    const request = ++dataRequest.current;
    if (screen === "Insights") {
      setInsights(null);
      api<typeof insights>("insights")
        .then((value) => {
          if (request === dataRequest.current) setInsights(value);
        })
        .catch((e) => {
          if (request === dataRequest.current) setError(e.message);
        });
    }
    if (screen === "Compliance") {
      setAudit([]);
      api<Audit[]>("audit")
        .then((value) => {
          if (request === dataRequest.current) setAudit(value);
        })
        .catch((e) => {
          if (request === dataRequest.current) setError(e.message);
        });
    }
    return () => {
      if (request === dataRequest.current) dataRequest.current++;
    };
  }, [screen, workspace]);
  async function mutate(
    path: string,
    method: string,
    body?: unknown,
    success?: string,
  ) {
    setBusy(true);
    setError("");
    try {
      await api(path, method, body);
      await refresh();
      setModal(null);
      setSelected(null);
      setEntity(null);
      setConfirmation(null);
      const verb = path.endsWith("/archive")
        ? "archived"
        : path.endsWith("/restore")
          ? "restored"
          : method === "PATCH"
            ? "updated"
            : "created";
      setNotice(success || `Successfully ${verb}. Your changes are saved.`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function viewAs(userId: string) {
    dataRequest.current++;
    setBusy(true);
    setError("");
    setModal(null);
    setSelected(null);
    setInsights(null);
    setAudit([]);
    setShowArchived(false);
    setTeamPage(null);
    try {
      await api("demo/view-as", "POST", { userId });
      await refresh();
      setNotice(
        "Now viewing as " +
          (demo.find((p) => p.id === userId)?.name || "selected persona"),
      );
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
      setNotice("Signed in successfully.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (modal === "confirm" && confirmation)
      return mutate(
        confirmation.path,
        "POST",
        undefined,
        `${confirmation.title} ${confirmation.restore ? "restored" : "archived"} successfully.`,
      );
    if (modal === "person")
      return mutate(
        entity ? `people/${entity.id}` : "people",
        entity ? "PATCH" : "POST",
        {
          ...f,
          skills: JSON.parse(String(f.skills || "[]")),
        },
        `Person ${entity ? "updated" : "created"} successfully.`,
      );
    if (modal === "team")
      return mutate(
        entity ? `teams/${entity.id}` : "teams",
        entity ? "PATCH" : "POST",
        f,
        `Team ${entity ? "updated" : "created"} successfully.`,
      );
    if (modal === "skills")
      return mutate("profile", "PATCH", {
        skills: JSON.parse(String(f.skills || "[]")),
      });
    if (modal === "edit" && selected)
      return mutate(`records/${selected.id}`, "PATCH", f);
    return mutate("records", "POST", {
      ...f,
      kind: modal,
      teamId: f.teamId || workspace?.user.team_id,
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
          {notice && (
            <div role="status" className="notice">
              {notice}
            </div>
          )}
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
            finance and audit access. Choose Root Admin for unrestricted
            workspace administration.
          </small>
        </form>
      </main>
    );
  const { user, people, teams } = workspace;
  const records = workspace.records.filter(
    (r) => showArchived || !r.archived_at,
  );
  const isRoot = user.role === "root";
  const isFinance = isRoot || user.role === "finance";
  const requestArchive = (
    path: string,
    title: string,
    archived?: string | null,
  ) => {
    setConfirmation({
      path: `${path}/${archived ? "restore" : "archive"}`,
      title,
      restore: !!archived,
    });
    setModal("confirm");
  };
  const person = (id: string) => people.find((p) => p.id === id);
  const team = (id: string) => teams.find((t) => t.id === id)?.name || id;
  const matches = (s: string) => s.toLowerCase().includes(query.toLowerCase());
  const filtered = (kind: string) =>
    records.filter((r) => r.kind === kind && matches(`${r.title} ${r.body}`));
  const manage = (r: Work) =>
    isRoot ||
    (["post", "recognition"].includes(r.kind)
      ? r.owner_id === user.id
      : r.kind === "budget"
        ? isFinance
        : user.role === "finance" ||
          (user.role === "lead" && user.team_id === r.team_id));
  const canCreate = ["Goals", "Allocation"].includes(screen)
    ? user.role !== "employee"
    : screen === "Budget"
      ? isFinance
      : false;
  const source = (r: Work) => (
    <div className="record-controls">
      {r.archived_at && <span className="chip">Archived</span>}
      <button
        className="text-button"
        onClick={() => {
          setSelected(r);
          setModal("source");
        }}
      >
        View source <ArrowUpRight size={14} />
      </button>
      {manage(r) && (
        <>
          {!r.archived_at && (
            <button
              className="text-button"
              onClick={() => {
                setSelected(r);
                setModal("edit");
              }}
            >
              Edit
            </button>
          )}
          <button
            className="text-button"
            disabled={busy}
            onClick={() =>
              requestArchive(`records/${r.id}`, r.title, r.archived_at)
            }
          >
            {r.archived_at ? "Restore" : "Archive"}
          </button>
        </>
      )}
    </div>
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
                setShowArchived(false);
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
              try {
                await api("logout", "POST");
                setWorkspace(null);
                setInsights(null);
                setAudit([]);
                setScreen("Home");
                setShowArchived(false);
                setModal(null);
                setSelected(null);
                setEntity(null);
                setError("");
                setNotice("Signed out successfully.");
                setDemo(await api<Person[]>("demo-users"));
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <span className="avatar small">{initials(user.name)}</span>
            <span>
              {user.name}
              <small>
                {user.role === "root"
                  ? "Root administrator"
                  : user.role === "lead"
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
          {workspace.demoMode && (
            <label className="persona-control">
              View as
              <select
                aria-label="View as"
                value={user.id}
                disabled={busy}
                onChange={(e) => viewAs(e.target.value)}
              >
                {demo
                  .filter((p) =>
                    [
                      "maya",
                      "alex",
                      "jordan",
                      "sam",
                      "priya",
                      "leo",
                      "nina",
                      "owen",
                      "imani",
                      "ella",
                      "root",
                    ].includes(p.id),
                  )
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ·{" "}
                      {p.role === "root" ? "Demo administrator" : p.role}
                    </option>
                  ))}
              </select>
            </label>
          )}
          <span className="avatar small">{initials(user.name)}</span>
        </header>
        <main className="content">
          <div className="page-heading">
            <div>
              {screen === "Home" && (
                <div className="eyebrow">
                  WELCOME BACK, {user.name.split(" ")[0].toUpperCase()}
                </div>
              )}
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
          <div className="module-tools">
            {((isRoot && !["Insights", "Compliance"].includes(screen)) ||
              (screen === "Budget" && isFinance) ||
              (["Goals", "Allocation"].includes(screen) &&
                user.role !== "employee") ||
              (screen === "Home" &&
                records.some((r) => r.owner_id === user.id))) && (
              <label>
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                />{" "}
                Include archived{" "}
                {["People", "Organization"].includes(screen)
                  ? "entries"
                  : "records"}
              </label>
            )}
            {isRoot && ["People", "Organization"].includes(screen) && (
              <button
                className="primary"
                onClick={() => {
                  setEntity(null);
                  setModal(screen === "People" ? "person" : "team");
                }}
              >
                <Plus size={16} />
                Create {screen === "People" ? "person" : "team"}
              </button>
            )}
            {isRoot && <span className="chip">ROOT · ALL TEAMS</span>}
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
                  {
                    people.filter(
                      (p) =>
                        p.role !== "root" && (showArchived || !p.archived_at),
                    ).length
                  }{" "}
                  colleagues · Expertise is self-listed
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
                  .filter(
                    (p) =>
                      p.role !== "root" &&
                      (showArchived || !p.archived_at) &&
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
                      <small>
                        {p.archived_at
                          ? "Archived person"
                          : "Self-listed expertise · No ratings"}
                      </small>
                      {isRoot && (
                        <div className="record-controls directory-controls">
                          {!p.archived_at && (
                            <button
                              className="text-button"
                              onClick={() => {
                                setEntity(p);
                                setModal("person");
                              }}
                            >
                              Edit person
                            </button>
                          )}
                          <button
                            className="text-button"
                            disabled={p.id === user.id || busy}
                            onClick={() =>
                              requestArchive(
                                `people/${p.id}`,
                                p.name,
                                p.archived_at,
                              )
                            }
                          >
                            {p.archived_at ? "Restore" : "Archive"}
                          </button>
                        </div>
                      )}
                      <button
                        className="text-button"
                        disabled={p.id === user.id || !!p.archived_at}
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
          {screen === "Organization" && !teamPage && (
            <div className="cards-grid two">
              {teams
                .filter(
                  (t) =>
                    (showArchived || !t.archived_at) &&
                    matches(`${t.name} ${t.mission}`),
                )
                .map((t) => (
                  <article className="card team-card" key={t.id}>
                    <span className="team-symbol">
                      <Network size={25} />
                    </span>
                    <h2>
                      <button
                        className="text-button"
                        onClick={() => setTeamPage(t.id)}
                      >
                        {t.name} <ArrowRight size={18} />
                      </button>
                    </h2>
                    {t.archived_at && (
                      <span className="chip">Archived team</span>
                    )}
                    {isRoot && (
                      <div className="record-controls directory-controls">
                        {!t.archived_at && (
                          <button
                            className="text-button"
                            onClick={() => {
                              setEntity(t);
                              setModal("team");
                            }}
                          >
                            Edit team
                          </button>
                        )}
                        <button
                          className="text-button"
                          disabled={busy}
                          onClick={() =>
                            requestArchive(
                              `teams/${t.id}`,
                              t.name,
                              t.archived_at,
                            )
                          }
                        >
                          {t.archived_at ? "Restore" : "Archive"}
                        </button>
                      </div>
                    )}
                    <p>{t.mission}</p>
                    <div className="team-people">
                      {people
                        .filter(
                          (p) =>
                            p.team_id === t.id &&
                            !p.archived_at &&
                            p.role !== "root",
                        )
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
                      disabled={busy || !!t.archived_at}
                      onClick={() =>
                        mutate(
                          `teams/${t.id}/follow`,
                          "POST",
                          undefined,
                          workspace.following.includes(t.id)
                            ? "Team unfollowed successfully."
                            : "Team followed successfully.",
                        )
                      }
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
          {screen === "Organization" &&
            teamPage &&
            (() => {
              const t = teams.find((t) => t.id === teamPage);
              if (!t) return null;
              const members = people.filter(
                (p) =>
                  p.team_id === t.id && !p.archived_at && p.role !== "root",
              );
              const visible = records.filter(
                (r) => r.team_id === t.id && !r.archived_at,
              );
              return (
                <section className="team-page">
                  <button
                    className="secondary"
                    onClick={() => setTeamPage(null)}
                  >
                    ← All teams
                  </button>
                  <h2>{t.name}</h2>
                  <p>{t.mission}</p>
                  <div className="summary-row">
                    <div className="card">
                      <strong>{members.length}</strong>
                      <p>Team members</p>
                    </div>
                    <div className="card">
                      <strong>
                        {workspace.engagement.find((e) => e.id === t.id)
                          ?.followers || 0}
                      </strong>
                      <p>Voluntary followers</p>
                    </div>
                    <div className="card">
                      <strong>
                        {visible.filter((r) => r.kind === "post").length}
                      </strong>
                      <p>Updates visible to you</p>
                    </div>
                  </div>
                  <h3>Team structure</h3>
                  <div className="card">
                    {members.map((p) => (
                      <p key={p.id}>
                        <strong>{p.name}</strong> · {p.title}
                        {p.role === "lead" ? " · Team lead" : ""}
                      </p>
                    ))}
                  </div>
                  <h3>Posts & recognition</h3>
                  <div className="cards-grid two">
                    {visible
                      .filter((r) => ["post", "recognition"].includes(r.kind))
                      .map((r) => (
                        <article className="card" key={r.id}>
                          <h3>{r.title}</h3>
                          <p>{r.body}</p>
                          <small>
                            {person(r.owner_id)?.name} · {date(r.updated_at)}
                          </small>
                          {source(r)}
                        </article>
                      ))}
                  </div>
                  <h3>Shared work</h3>
                  <div className="cards-grid two">
                    {visible
                      .filter((r) => ["goal", "allocation"].includes(r.kind))
                      .map((r) => (
                        <article className="card" key={r.id}>
                          <span className="chip">
                            {r.kind === "goal" ? "Goal" : "Opportunity"}
                          </span>
                          <h3>{r.title}</h3>
                          <p>{r.body}</p>
                          {r.kind === "goal" ? (
                            <p>
                              {r.data.progress}% · {r.data.completed} of{" "}
                              {r.data.total} {r.data.unit}
                            </p>
                          ) : (
                            <p>
                              Typical contribution: {r.data.hours} hours/week ·
                              opt in from Allocation
                            </p>
                          )}
                          {source(r)}
                        </article>
                      ))}
                  </div>
                  <h3>Engagement</h3>
                  <p>
                    Following is voluntary and curates your feed. Interest in
                    opportunities is visible to their owner, never a performance
                    ranking. Private posts remain limited to your role and team.
                  </p>
                  <button
                    className="secondary"
                    disabled={busy || !!t.archived_at}
                    onClick={() =>
                      mutate(
                        `teams/${t.id}/follow`,
                        "POST",
                        undefined,
                        workspace.following.includes(t.id)
                          ? "Team unfollowed successfully."
                          : "Team followed successfully.",
                      )
                    }
                  >
                    {workspace.following.includes(t.id)
                      ? "Following · click to unfollow"
                      : "Follow team"}
                  </button>
                </section>
              );
            })()}
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
                    <span>
                      {r.data.total
                        ? `${r.data.completed} of ${r.data.total} ${r.data.unit} complete`
                        : "Owner estimate · measurement not recorded"}
                    </span>
                  </div>
                  <div className="progress">
                    <i style={{ width: `${r.data.progress}%` }} />
                  </div>
                  <div className="evidence">
                    <span className="eyebrow">LATEST EVIDENCE</span>
                    <p>{r.data.evidence}</p>
                    <p>
                      {r.data.total
                        ? `${r.data.completed} ÷ ${r.data.total} × 100 = ${r.data.progress}%`
                        : "No numerator or denominator supplied."}{" "}
                      · Evidence dated{" "}
                      {r.data.evidenceDate
                        ? date(String(r.data.evidenceDate) + "T12:00:00Z")
                        : "not recorded"}
                    </p>
                    <small>
                      Updated {date(r.updated_at)} · {person(r.owner_id)?.name}
                    </small>
                  </div>
                  <div className="card-actions">{source(r)}</div>
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
                      Typical contribution: {r.data.hours} hours / week
                    </p>
                    {(r.owner_id === user.id || isRoot) && (
                      <details>
                        <summary>
                          Interested colleagues (
                          {
                            workspace.interests.filter(
                              (i) => i.record_id === r.id,
                            ).length
                          }
                          )
                        </summary>
                        {workspace.interests
                          .filter((i) => i.record_id === r.id)
                          .map((i) => (
                            <p key={i.id}>{i.name}</p>
                          ))}
                        {!workspace.interests.some(
                          (i) => i.record_id === r.id,
                        ) && <p>No expressions of interest yet.</p>}
                      </details>
                    )}
                    <div className="card-actions">
                      <button
                        className={
                          workspace.joined.includes(r.id)
                            ? "secondary"
                            : "primary"
                        }
                        disabled={busy || !!r.archived_at}
                        onClick={() =>
                          mutate(
                            `records/${r.id}/join`,
                            "POST",
                            undefined,
                            workspace.joined.includes(r.id)
                              ? "Interest withdrawn successfully."
                              : "Interest registered successfully.",
                          )
                        }
                      >
                        {workspace.joined.includes(r.id)
                          ? "Withdraw interest"
                          : "I’m interested"}
                        <Plus size={15} />
                      </button>
                      {source(r)}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {screen === "Budget" &&
            (!isFinance ? (
              <div className="empty">
                <ShieldCheck size={35} />
                <h2>Finance access required</h2>
                <p>
                  Budget records are restricted to finance and root
                  administrators. Use “View as” in this demo to explore Jordan’s
                  finance view.
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
                      <div className="card-actions">{source(r)}</div>
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
                          <p className="muted">{a.coverage}</p>
                          <small>As of {date(insights.asOf)}</small>
                          <details className="sources">
                            <summary>Evidence behind this answer</summary>
                            <p>{a.arithmetic}</p>
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
                          </details>
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
                  {isFinance
                    ? "Finance and root admins can review all audit entries."
                    : user.role === "lead"
                      ? "Team leads can review their team’s non-financial changes and their own actions."
                      : "Employees can review their own actions."}{" "}
                  Audit entries are created transactionally with sensitive
                  changes.
                </span>
              </div>
              <div className="card audit-card">
                <h2>Access review</h2>
                <p>
                  Current policy by role. Team-private records remain
                  team-scoped, including for Finance; Root can review all teams.
                </p>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Role</th>
                        <th>Visible records</th>
                        <th>Can change</th>
                        <th>Audit access</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        [
                          "Employee",
                          "Company + own team",
                          "Own posts, recognition and expertise; voluntary interest/follows",
                          "Own actions",
                        ],
                        [
                          "Team lead",
                          "Company + own team",
                          "Employee actions + own team goals/opportunities",
                          "Own actions + team non-financial actions",
                        ],
                        [
                          "Finance",
                          "Company + own team + budgets",
                          "Visible goals/opportunities and budgets; own posts/expertise",
                          "All activity",
                        ],
                        [
                          "Root administrator",
                          "All teams and budgets",
                          "All records, people and teams",
                          "All activity; immutable",
                        ],
                      ].map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell) => (
                            <td key={cell}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="card audit-card">
                <h2>Activity trail</h2>
                <p>
                  Latest 500 audit entries, filtered to your permissions. Seeded
                  demonstration history is marked in the change details. UTC
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
                              <span>{a.record_label}</span>
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
              {modal === "confirm"
                ? `${confirmation?.restore ? "Restore" : "Archive"} entry`
                : ["person", "team"].includes(modal!)
                  ? `${entity ? "Edit" : "Create"} ${modal}`
                  : modal === "source"
                    ? selected?.title
                    : modal === "skills"
                      ? "Your expertise, shared consistently."
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
                {selected.archived_at && (
                  <p>
                    Archived {date(selected.archived_at)}. Excluded from active
                    Insights.
                  </p>
                )}
                {source(selected)}
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
                {modal === "confirm" && confirmation ? (
                  <>
                    <p>
                      {confirmation.restore ? "Restore" : "Archive"}{" "}
                      <strong>{confirmation.title}</strong>?
                    </p>
                    <p>
                      {confirmation.restore
                        ? "The entry will be active again."
                        : "The entry will be hidden from active views. Its history will be preserved and it can be restored."}
                    </p>
                  </>
                ) : modal === "skills" ? (
                  <>
                    <p>
                      List expertise you’re happy to share. There are no
                      ratings.
                    </p>
                    <SkillPicker initialSkills={user.skills} />
                  </>
                ) : modal === "person" ? (
                  <>
                    <label>
                      Name
                      <input
                        autoFocus
                        name="name"
                        required
                        maxLength={100}
                        defaultValue={entity?.name}
                      />
                    </label>
                    <label>
                      Job title
                      <input
                        name="title"
                        required
                        maxLength={100}
                        defaultValue={(entity as Person)?.title}
                      />
                    </label>
                    <label>
                      Role
                      <select
                        name="role"
                        defaultValue={(entity as Person)?.role || "employee"}
                      >
                        <option value="employee">Employee</option>
                        <option value="lead">Team lead</option>
                        <option value="finance">Finance admin</option>
                        <option value="root">Root administrator</option>
                      </select>
                    </label>
                    <label>
                      Team
                      <select
                        name="teamId"
                        defaultValue={
                          (entity as Person)?.team_id || user.team_id
                        }
                      >
                        {teams
                          .filter((t) => !t.archived_at)
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <SkillPicker
                      initialSkills={(entity as Person)?.skills || []}
                    />
                    <p>
                      Root can administer all profiles. Skills are descriptions,
                      never proficiency ratings. Role or team changes revoke the
                      affected person’s existing sessions.
                    </p>
                  </>
                ) : modal === "team" ? (
                  <>
                    <label>
                      Team name
                      <input
                        autoFocus
                        name="name"
                        required
                        maxLength={100}
                        defaultValue={entity?.name}
                      />
                    </label>
                    <label>
                      Mission
                      <textarea
                        name="mission"
                        required
                        maxLength={1000}
                        defaultValue={(entity as Team)?.mission}
                      />
                    </label>
                  </>
                ) : (
                  <RecordFields
                    kind={modal === "edit" && selected ? selected.kind : modal!}
                    record={modal === "edit" ? selected : null}
                    teamId={user.team_id}
                    chooseTeam={
                      isRoot ||
                      (user.role === "finance" &&
                        ["goal", "allocation", "budget"].includes(
                          selected?.kind || modal!,
                        ))
                    }
                    teams={teams}
                    people={people}
                    authorId={
                      modal === "edit" && selected ? selected.owner_id : user.id
                    }
                    recipient={recipient}
                  />
                )}
                <button className="primary full" disabled={busy}>
                  {busy
                    ? "Saving…"
                    : modal === "confirm"
                      ? confirmation?.restore
                        ? "Restore"
                        : "Archive"
                      : ["person", "team"].includes(modal!)
                        ? entity
                          ? "Save changes"
                          : "Create"
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
