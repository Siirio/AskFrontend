# Auth — Slice Locks

LOCKED | auth/ imports no other slice | Foundation slice (R6) — every slice may import it, so it must stay cycle-free | src/auth/*
LOCKED | The auth context + useAuth hook are defined HERE, mounted by app/providers | Context ownership rule (P5.3, R3) — slices consume the hook, never import app/ | src/auth/index.ts, app/providers
LOCKED | Roles are a discriminated union — never one User with optional fields | A field that can never exist for a role must not be on that role's type (P4.2) | src/auth/model.ts
LOCKED | Token access only via shared/api storage helpers; the key is ask.accessToken | Cross-app contract with the marketing landing (D6); swappable TokenStorage for mobile (P5.2) | src/auth/*, src/shared/api
LOCKED | startRoute from the backend decides the post-login route | The backend owns where a role lands — the client never hardcodes it | src/auth/hooks.ts
LOCKED | Email-only auth for MVP | SMS is disabled backend-side until a real provider is connected | src/auth/ui/*
