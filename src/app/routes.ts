export const ROUTES = {
  home: "/",
  auth: "/auth",
  results: "/search",
  product: "/product/:id",
  storefront: "/storefront/:businessId",
  profile: "/profile",
  business: "/business/:businessId",
  platform: "/platform",
  chats: "/chats",
  oauthCallback: "/oauth/callback",
  legal: "/legal/:document",
  support: "/support",
  accountDeletion: "/account-deletion",
  sellerOnboarding: "/seller/onboarding",
} as const;

export function buildRoute(route: string, params: Record<string, string> = {}, query?: Record<string, string>): string {
  let path = route;
  for (const [key, value] of Object.entries(params)) {
    path = path.replace(`:${key}`, encodeURIComponent(value));
  }
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams(query).toString();
    path = `${path}?${qs}`;
  }
  return path;
}
