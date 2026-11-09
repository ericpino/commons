import { test } from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { renderToStaticMarkup } from "react-dom/server";
import AppShell, { ShellNavigation, ShellSearch } from "./app-shell";
import {
  drawerReducer,
  readSidebarPreference,
  saveSidebarPreference,
  sidebarBootstrap,
  SIDEBAR_STORAGE_KEY,
} from "./shell-state";
import { activateDrawer, handleDrawerKey } from "./shell-focus";
const noop = () => {};
test("sidebar preference handles reload, missing/corrupt values and blocked storage", () => {
  let value: string | null = null;
  const storage = {
    getItem: (key: string) => {
      assert.equal(key, SIDEBAR_STORAGE_KEY);
      return value;
    },
    setItem: (key: string, next: string) => {
      assert.equal(key, SIDEBAR_STORAGE_KEY);
      value = next;
    },
  };
  assert.equal(
    readSidebarPreference(() => storage),
    false,
  );
  assert.equal(
    saveSidebarPreference(() => storage, true),
    true,
  );
  assert.equal(
    readSidebarPreference(() => storage),
    true,
  );
  saveSidebarPreference(() => storage, false);
  assert.equal(
    readSidebarPreference(() => storage),
    false,
  );
  value = "invalid";
  assert.equal(
    readSidebarPreference(() => storage),
    false,
  );
  const blocked = () => {
    throw new Error("Storage blocked");
  };
  assert.equal(readSidebarPreference(blocked), false);
  assert.equal(saveSidebarPreference(blocked, true), false);
  assert.equal(
    saveSidebarPreference(
      () => ({
        ...storage,
        setItem: () => {
          throw new Error("Quota");
        },
      }),
      true,
    ),
    false,
  );
});
test("pre-paint bootstrap agrees with stored preference and safely handles blocked getter", () => {
  for (const value of [null, "true", "false", "invalid"]) {
    const document = {
      documentElement: { dataset: {} as Record<string, string> },
    };
    runInNewContext(sidebarBootstrap, {
      document,
      localStorage: { getItem: () => value },
    });
    assert.equal(
      document.documentElement.dataset.sidebarCollapsed,
      String(value === "true"),
    );
  }
  const document = {
    documentElement: { dataset: {} as Record<string, string> },
  };
  runInNewContext(sidebarBootstrap, {
    document,
    get localStorage() {
      throw new Error("Blocked");
    },
  });
  assert.equal(document.documentElement.dataset.sidebarCollapsed, "false");
});
test("drawer opens and toggles, and closes on explicit close, Escape, backdrop and navigation", () => {
  assert.equal(drawerReducer(false, "open"), true);
  assert.equal(drawerReducer(false, "toggle"), true);
  assert.equal(drawerReducer(true, "toggle"), false);
  for (const action of ["close", "escape", "backdrop", "navigate"] as const)
    assert.equal(drawerReducer(true, action), false);
});
function focusFixture() {
  const listeners = new Map<string, (e: KeyboardEvent) => void>();
  const doc: any = {
    activeElement: null,
    body: { style: { overflow: "auto" } },
    addEventListener: (type: string, handler: (e: KeyboardEvent) => void) =>
      listeners.set(type, handler),
    removeEventListener: (type: string) => listeners.delete(type),
  };
  const element = () => ({
    hidden: false,
    isConnected: true,
    getClientRects: () => [{}],
    focus() {
      doc.activeElement = this;
    },
  });
  const first = element(),
    last = element(),
    burger = element();
  const panel: any = {
    ...element(),
    querySelectorAll: () => [first, last],
    contains: (item: unknown) =>
      item === first || item === last || item === panel,
  };
  const key = (value: string, shiftKey = false) => {
    const event: any = {
      key: value,
      shiftKey,
      defaultPrevented: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
    };
    return event as KeyboardEvent;
  };
  return {
    doc: doc as Document,
    panel: panel as HTMLElement,
    first,
    last,
    burger,
    listeners,
    key,
  };
}
test("drawer focus starts inside, traps Tab both ways, locks scroll and returns to burger", () => {
  const f = focusFixture();
  let closed = false;
  const cleanup = activateDrawer(
    f.panel,
    f.burger as unknown as HTMLElement,
    () => {
      closed = true;
    },
    f.doc,
  );
  assert.equal(f.doc.activeElement, f.first);
  assert.equal(f.doc.body.style.overflow, "hidden");
  f.last.focus();
  const tab = f.key("Tab");
  f.listeners.get("keydown")!(tab);
  assert.equal(tab.defaultPrevented, true);
  assert.equal(f.doc.activeElement, f.first);
  const back = f.key("Tab", true);
  f.listeners.get("keydown")!(back);
  assert.equal(f.doc.activeElement, f.last);
  f.listeners.get("keydown")!(f.key("Escape"));
  assert.equal(closed, true);
  cleanup();
  assert.equal(f.doc.activeElement, f.burger);
  assert.equal(f.doc.body.style.overflow, "auto");
  assert.equal(f.listeners.size, 0);
});
test("drawer recovers escaped focus and handles an empty focusable list", () => {
  const f = focusFixture();
  f.burger.focus();
  handleDrawerKey(f.key("Tab"), f.panel, noop, f.doc);
  assert.equal(f.doc.activeElement, f.first);
  const empty = {
    ...f.panel,
    querySelectorAll: () => [],
    contains: () => false,
    focus: () => f.last.focus(),
  } as unknown as HTMLElement;
  handleDrawerKey(f.key("Tab"), empty, noop, f.doc);
  assert.equal(f.doc.activeElement, f.last);
});
test("all eight navigation items retain accessible names and a non-color active indicator", () => {
  const html = renderToStaticMarkup(
    <ShellNavigation screen="Budget" onNavigate={noop} />,
  );
  assert.match(html, /nav aria-label="Primary"/);
  for (const name of [
    "Home",
    "People",
    "Organization",
    "Goals",
    "Allocation",
    "Budget",
    "Insights",
    "Compliance",
  ]) {
    assert.match(html, new RegExp(`aria-label="${name}"`));
    assert.match(html, new RegExp(`role="tooltip">${name}<`));
  }
  assert.match(html, /aria-label="Budget" aria-current="page" class="active"/);
});
test("shell keeps View as outside the drawer, with skip link, burger controls and header feedback", () => {
  const html = renderToStaticMarkup(
    <AppShell
      screen="Home"
      sidebar={<ShellNavigation screen="Home" onNavigate={noop} />}
      header={
        <label className="persona-control">
          View as
          <select aria-label="View as">
            <option>Maya · Employee</option>
          </select>
        </label>
      }
      announcement={<div role="status">Saved</div>}
    >
      <main id="main-content" tabIndex={-1}>
        Page
      </main>
    </AppShell>,
  );
  assert.ok(
    html.indexOf('class="skip-link"') < html.indexOf('class="sidebar-toggle"'),
  );
  assert.match(
    html,
    /class="menu-burger" aria-label="Open menu" aria-expanded="false" aria-controls="primary-sidebar"/,
  );
  assert.ok(html.indexOf('aria-label="View as"') > html.indexOf("</aside>"));
  assert.match(html, /class="shell-announcement"/);
  assert.match(html, /id="main-content"/);
});
test("module search preserves the query and exposes an accessible mobile expansion control", () => {
  const html = renderToStaticMarkup(
    <ShellSearch screen="Goals" query="onboarding" onChange={noop} />,
  );
  assert.match(
    html,
    /aria-label="Search goals" aria-expanded="false" aria-controls="shell-module-search"/,
  );
  assert.match(html, /aria-label="Search current module"/);
  assert.match(html, /value="onboarding"/);
});
