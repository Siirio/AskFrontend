# ASK Frontend — Features

**A feature IS a slice.** One folder per `src/{slice}/`, 1:1, no exceptions (Locks). Slice names mirror AskBackend module names (architecture D1).

Each feature gets a folder with 4 files:

```
features/{slice}/
├── README.md        # Why it exists, backend module it mirrors, key decisions
├── contracts.md     # Backend endpoints/DTOs THIS slice consumes
├── ux-ui-flow.md    # Screens, routes, states — traced to PRODUCT_VISION user flows
└── locks.md         # Slice invariants
```

`contracts.md` is the frontend's copy of the consumed API surface. Its source of truth is the backend's own `../Ask_Backend/AI_Knowledge/features/{module}/contracts.md` — when the backend changes a contract, both files move together. Backend wins for DATA (P9.4).

## Add a feature (= add a slice)
1. Confirm the product surface exists in `../PRODUCT_VISION.md`. Not there → STOP and ASK.
2. Confirm a backend module owns the data (`../../../Ask_Backend/AI_Knowledge/features/`).
3. Create the folder with all 4 files.
4. Fill README.md first (purpose, backend module, decisions), then contracts.md (from the backend's contracts), then ux-ui-flow.md (screens + UF trace), then locks.md.
5. **Same commit:** add the slice to `../ARCHITECTURE_PATTERN_FRONTEND.md` §2, the ESLint boundaries pattern §8, the decision log §11, and the Feature Index in `../../CLAUDE.md` + `../../AGENTS.md`.

## Remove a feature
1. Move to `features/_archived/{slice}/` — NEVER delete.
2. Add a `../Changelog.md` entry.
3. Remove from §2, the ESLint pattern §8, and the Feature Index.

## Not a feature
- **Marketing** (`app/(marketing)/`) — app-level wiring, content only, imports no slice (D6).
- **App chrome** (`app/_components/`) — navigation menu, profile card shell, footer.
- **Toolbox** (`shared/`, `design-system/`, `lib/`) — domain-free by definition.

## Tracked slices
auth · search · catalog · services · chats · requests · profile · business-cabinet
