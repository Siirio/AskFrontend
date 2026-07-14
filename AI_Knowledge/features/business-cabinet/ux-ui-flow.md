# Business Cabinet — Screens & Flow

Traces PRODUCT_VISION **UF 3.1** (the seller is redirected to the business registration page, then works in the cabinet).

## Entry
Business registration (`@/auth`) → the cabinet. `startRoute` (OWNER_BRANCHES / BRANCH_WORKSPACE) decides the landing tab — the client never hardcodes it.

## Tabs (UF 3.1, in the vision's order)
| # | Tab | Owner slice | Notes |
|---|-----|-------------|-------|
| 1 | Overview — **should be "Requests"** | `@/requests` + `@/chats` | Filters: All · Active · New Requests. These are all chats. |
| 2 | Products | `@/catalog` | List, add, **import**. Needs a friendlier branch picker (the vision calls this out). |
| 3 | Services | `@/services` | Same as Products, **no import**. |
| 4 | Branches | business-cabinet | Same as products/services, **no import**. |
| 5 | Unique Offers | business-cabinet | Sales, collabs. |
| 6 | Company Profile | business-cabinet | **Coming in a future update** — placeholder only. |
| 7 | Company Dashboard | business-cabinet | Customization; staff and invites. |

Route: `/app/business` (client). Tabs 1–3 are embedded from their owning slices via `index.ts` — the cabinet composes, it does not own their data.

## States (P8.4/P9.3)
- Loading: per-tab skeletons — the shell renders immediately
- Empty: each list tab has its own empty state pointing at its primary action (Add / Import)
- Error: save failures keep the form filled; a Toast reports the failure
- Roles: OWNER / MANAGER / STAFF see different actions — the backend's role is the authority, never a client guess

## Hard rules
- **The branch picker is the known pain point** — the vision explicitly asks for a friendlier design for selecting branches in product forms.
- **No branch import.** Branches are "the same as goods and services, but without imports".
- **Company Profile stays a placeholder** until the vision describes it. Inventing the screen is forbidden (P9.1).
- Unique Offers are brand signals — the editor must not present them as standalone listings.
