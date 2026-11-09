import { ReactNode, useEffect, useRef, useState, useReducer } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Search,
  X,
  Home,
  Users,
  Network,
  Flag,
  Layers,
  Wallet,
  ChartNoAxesCombined,
  ShieldCheck,
} from "lucide-react";
import { saveSidebarPreference, drawerReducer } from "./shell-state";
import { activateDrawer } from "./shell-focus";
export default function AppShell({
  screen,
  sidebar,
  header,
  children,
  announcement,
}: {
  screen: string;
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
  announcement?: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false),
    [drawer, dispatchDrawer] = useReducer(drawerReducer, false),
    [small, setSmall] = useState(false);
  const panel = useRef<HTMLElement>(null),
    trigger = useRef<HTMLElement | null>(null);
  useEffect(() => {
    setCollapsed(document.documentElement.dataset.sidebarCollapsed === "true");
    const media = document.defaultView?.matchMedia("(max-width: 1023px)");
    const change = () => {
      setSmall(!!media?.matches);
      dispatchDrawer("close");
    };
    change();
    media?.addEventListener("change", change);
    return () => media?.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    dispatchDrawer("navigate");
  }, [screen]);
  useEffect(() => {
    const view = document.defaultView;
    const close = () => dispatchDrawer("navigate");
    view?.addEventListener("hashchange", close);
    return () => view?.removeEventListener("hashchange", close);
  }, []);
  useEffect(() => {
    if (drawer && panel.current)
      return activateDrawer(panel.current, trigger.current, () =>
        dispatchDrawer("escape"),
      );
  }, [drawer]);
  function toggleDesktop() {
    const next = !collapsed;
    setCollapsed(next);
    document.documentElement.dataset.sidebarCollapsed = String(next);
    saveSidebarPreference(() => document.defaultView!.localStorage, next);
  }
  function open(triggerElement: HTMLElement) {
    trigger.current = triggerElement;
    dispatchDrawer("open");
  }
  return (
    <div className={`shell app-shell${drawer ? " drawer-open" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {drawer && (
        <button
          className="drawer-backdrop"
          aria-label="Close menu backdrop"
          tabIndex={-1}
          onClick={() => dispatchDrawer("backdrop")}
        />
      )}
      <aside
        ref={panel}
        id="primary-sidebar"
        className="sidebar"
        role={drawer ? "dialog" : undefined}
        aria-modal={drawer ? true : undefined}
        aria-label="Workspace navigation"
        tabIndex={-1}
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("nav button"))
            dispatchDrawer("navigate");
        }}
      >
        <button
          className="sidebar-toggle"
          aria-label={
            small
              ? drawer
                ? "Close menu"
                : "Open menu"
              : collapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
          }
          aria-expanded={small ? drawer : !collapsed}
          aria-controls="primary-sidebar"
          onClick={(event) => {
            if (small) {
              if (drawer) dispatchDrawer("close");
              else open(event.currentTarget);
            } else toggleDesktop();
          }}
        >
          {drawer ? (
            <X size={20} />
          ) : (
            <>
              <ChevronLeft className="collapse-icon" size={20} />
              <ChevronRight className="expand-icon" size={20} />
            </>
          )}
        </button>
        {sidebar}
      </aside>
      <div className="main" inert={drawer}>
        <div className="shell-header">
          <header className="topbar">
            <button
              className="menu-burger"
              aria-label={drawer ? "Close menu" : "Open menu"}
              aria-expanded={drawer}
              aria-controls="primary-sidebar"
              onClick={(event) =>
                drawer ? dispatchDrawer("close") : open(event.currentTarget)
              }
            >
              <Menu size={22} />
            </button>
            {header}
          </header>
          {announcement && (
            <div className="shell-announcement">{announcement}</div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function ShellSearch({
  screen,
  query,
  onChange,
}: {
  screen: string;
  query: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    button = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
  }, [screen]);
  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);
  return (
    <div className={`shell-search${open ? " search-open" : ""}`}>
      <button
        ref={button}
        className="header-search-toggle"
        aria-label={open ? "Close search" : `Search ${screen.toLowerCase()}`}
        aria-expanded={open}
        aria-controls="shell-module-search"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={20} /> : <Search size={20} />}
      </button>
      <label id="shell-module-search" className="search">
        <Search size={16} aria-hidden="true" />
        <input
          ref={input}
          aria-label="Search current module"
          placeholder={`Search ${screen.toLowerCase()}…`}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setOpen(false);
              button.current?.focus();
            }
          }}
        />
      </label>
    </div>
  );
}

export function ShellNavigation({
  screen,
  onNavigate,
}: {
  screen: string;
  onNavigate: (name: string) => void;
}) {
  const items = [
    { name: "Home", icon: Home },
    { name: "People", icon: Users },
    { name: "Organization", icon: Network },
    { name: "Goals", icon: Flag },
    { name: "Allocation", icon: Layers },
    { name: "Budget", icon: Wallet },
    { name: "Insights", icon: ChartNoAxesCombined },
    { name: "Compliance", icon: ShieldCheck },
  ];
  return (
    <nav aria-label="Primary">
      {items.map(({ name, icon: Icon }) => (
        <button
          key={name}
          aria-label={name}
          aria-current={screen === name ? "page" : undefined}
          className={screen === name ? "active" : ""}
          onClick={() => onNavigate(name)}
        >
          <Icon size={19} aria-hidden="true" />
          <span className="shell-nav-label">{name}</span>
          <span className="shell-tooltip" role="tooltip">
            {name}
          </span>
          {name === "Home" && <span className="nav-dot" />}
        </button>
      ))}
    </nav>
  );
}
