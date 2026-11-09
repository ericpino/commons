export const SIDEBAR_STORAGE_KEY = "commons.sidebarCollapsed";
type SidebarStorage = Pick<Storage, "getItem" | "setItem">;
export function readSidebarPreference(storage: () => SidebarStorage): boolean {
  try {
    return storage().getItem(SIDEBAR_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}
export function saveSidebarPreference(
  storage: () => SidebarStorage,
  collapsed: boolean,
): boolean {
  try {
    storage().setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    return true;
  } catch {
    return false;
  }
}
// Static application code only: runs before paint, never interpolates user data.
export const sidebarBootstrap = `try{document.documentElement.dataset.sidebarCollapsed=String(localStorage.getItem(${JSON.stringify(SIDEBAR_STORAGE_KEY)})==="true")}catch{document.documentElement.dataset.sidebarCollapsed="false"}`;

export type DrawerAction =
  "open" | "toggle" | "close" | "escape" | "backdrop" | "navigate";
export function drawerReducer(open: boolean, action: DrawerAction): boolean {
  return action === "open" ? true : action === "toggle" ? !open : false;
}
