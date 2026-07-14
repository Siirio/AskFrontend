# Profile

Mirrors backend module: **identity** (`../Ask_Backend/AI_Knowledge/features/identity/`).

The customer's profile card in the navigation menu — logo, name, settings, learn more, sign out (UF 2.3) — and the settings surface behind it.

## Key decisions
- **Shares a backend module with `auth/`, but is a separate slice.** `auth/` owns the session and identity; `profile/` owns the customer's *self-management* surface. Two slices may mirror one backend module when they serve genuinely different surfaces — the rule is that a slice never spans two modules, not that a module never has two slices.
- The **profile card** is the entry point from the navigation menu (UF 2.3). The card lives in app chrome (`app/_components/`) as a shell; its *content* is this slice, exported via `index.ts`.
- **Sign out is an `@/auth` action rendered on a `@/profile` surface** — the profile card imports it via `@/auth`'s public API (R6, D8).
- "Learn more" links to the marketing pages (`/`, D6) — it never re-implements marketing content inside a slice.
- Customer preferences (sizes, style, budget, city, favorite brands) exist backend-side. They are only built when the vision adds a surface for them (P9.1).
- Client-rendered (D7).
