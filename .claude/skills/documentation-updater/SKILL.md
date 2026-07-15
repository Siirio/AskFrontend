---
name: documentation-updater
description: Sync AI_Knowledge docs with a code change — contracts, README, ux-ui-flow, locks, changelog, architecture. Use after any code change that alters slice behavior, consumed endpoints, screens, or structure; docs ship in the same commit as the code.
---

# documentation-updater

Sync AI_Knowledge with code changes. Docs are part of the change.

## Execution
1. Review diff → map changes to doc impact:
   - Consumed endpoint/DTO → `features/{slice}/contracts.md`
   - Slice behavior/decision → `features/{slice}/README.md`
   - Screen, route, state → `features/{slice}/ux-ui-flow.md`
   - New invariant → `locks.md`
   - Decision → `Changelog.md`
   - New slice, moved domain, new dependency, new mechanism → `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md` §2 + §11 + ESLint pattern §8, same commit
2. Read current doc, merge changes, compress if over max-lines
3. Cross-project: if the change consumes a backend endpoint, reconcile with `../Ask_Backend/AI_Knowledge/features/{module}/contracts.md`. Backend wins for DATA (P9.4) — a drift is raised, never silently patched.
4. NEVER delete entries unless the slice is removed. NEVER modify locks. NEVER rewrite the 3 CORE files — they change by append + date + justification only.
