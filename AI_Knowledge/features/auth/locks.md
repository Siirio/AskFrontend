# Auth — Slice Locks

LOCKED | auth/ imports no other slice | Foundation slice (R6) — every slice may import it, so it must stay cycle-free | src/auth/*
LOCKED | The auth context + useAuth hook are defined HERE, mounted by app/providers | Context ownership rule (P5.3, R3) — slices consume the hook, never import app/ | src/auth/index.ts, app/providers
LOCKED | Roles are a discriminated union — never one User with optional fields | A field that can never exist for a role must not be on that role's type (P4.2) | src/auth/model.ts
LOCKED | Token access only via shared/api storage helpers; the key is ask.accessToken | Cross-app contract with the marketing landing (D6); swappable TokenStorage for mobile (P5.2) | src/auth/*, src/shared/api
LOCKED | startRoute from the backend decides the post-login route | The backend owns where a role lands — the client never hardcodes it | src/auth/hooks.ts
LOCKED | Email-only auth for MVP | SMS is disabled backend-side until a real provider is connected | src/auth/ui/*
LOCKED | Sign-up verifies the email with a 6-digit code (customer/register → verify); log-in is email + password (POST /auth/login, a 2FA challenge runs the shared verify step) | Owner-approved refinement 2026-07-15 (was: OTP for both — see Changelog "Auth refined"; lock amended 2026-07-16 audit); the passwordless OTP login (customer/login/start) and select-role stay deferred with the seller/staff paths | src/auth/api.ts, src/auth/ui/*
LOCKED | The role-choosing modal is triggered by suggestRoleExpansion, never invented client-side | Product decision 2026-07-15: the modal maps to a real backend signal, not a fabricated intent fork (P9.4) | src/auth/ui/RoleSelectionModal.tsx, src/auth/hooks.ts
LOCKED | Session state is a zustand store FACTORY consumed via a context provider, never a module-scope singleton | A module-scope store leaks state across SSR requests; the factory+provider is the sanctioned pattern (D7). store.ts stays pure/DOM-free (D5) — side effects live in hooks.ts | src/auth/store.ts, src/auth/hooks.ts, src/auth/ui/AuthProvider.tsx
