# Auth & Roles

Mirrors backend module: **identity** (`../Ask_Backend/AI_Knowledge/features/identity/`).

The Authorization Page (sign up / log in) and the session foundation for the whole app. Owns the current user, the role, and the role-choosing modal that follows first entry (PRODUCT_VISION UF 1).

## Key decisions
- **Foundation slice (R6):** any slice may import `@/auth`; `auth/` imports no other slice. The one sanctioned hub — it stays cycle-free.
- The auth context object and `useAuth` hook are DEFINED here and exported via `index.ts`; `app/providers` only mounts the provider (P5.3, R3).
- Roles are a **discriminated union** (customer / business / staff), never one `User` with optional fields (P4.2). `startRoute` from the backend decides where a session lands.
- Email-only auth for MVP — SMS is disabled backend-side. Verification is a 6-digit code.
- Token storage key is `ask.accessToken`, accessed only through `shared/api` storage helpers (P5.2). It is a cross-app contract: the marketing landing reads it to redirect logged-in visitors to `/app/` (D6).
- Client-rendered page behind a thin server route file (D7).
