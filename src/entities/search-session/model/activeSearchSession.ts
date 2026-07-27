const ACTIVE_SEARCH_ROUTE_KEY = "ask.activeSearchRoute";
export const ACTIVE_SEARCH_ROUTE_CHANGED_EVENT = "ask:active-search-route-changed";
const SEARCH_ROUTE = "/search";

type SearchRouteStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function isSearchRoute(route: string): boolean {
  return route === SEARCH_ROUTE || route.startsWith(`${SEARCH_ROUTE}?`);
}

export function saveActiveSearchRoute(route: string, storage: SearchRouteStorage): void {
  if (!isSearchRoute(route)) {
    storage.removeItem(ACTIVE_SEARCH_ROUTE_KEY);
    return;
  }
  storage.setItem(ACTIVE_SEARCH_ROUTE_KEY, route);
}

export function readActiveSearchRoute(storage: SearchRouteStorage): string | null {
  const route = storage.getItem(ACTIVE_SEARCH_ROUTE_KEY);
  return route && isSearchRoute(route) ? route : null;
}

export function clearActiveSearchRoute(storage: SearchRouteStorage): void {
  storage.removeItem(ACTIVE_SEARCH_ROUTE_KEY);
}
