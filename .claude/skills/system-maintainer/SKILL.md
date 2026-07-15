---
name: system-maintainer
description: Maintain the AI_Knowledge system — compress bloated docs, retire completed roadmap phases, migrate misplaced content, archive dead slices, flag stale docs, deduplicate locks. Use at session start or when knowledge cleanup is needed.
---

# system-maintainer

Maintain the AI_Knowledge system. Prevent knowledge rot.

## Operations
- Compress: over max-lines → remove oldest, merge duplicates, tighten prose. NEVER the 3 CORE files, NEVER any locks.md.
- Roadmap: a phase that is COMPLETE → move its outcome to `Changelog.md` and delete the phase from `ROADMAP.md`. The roadmap holds only what is ahead; it is never a history. A gate that got resolved → record it as a decision-log row in ARCHITECTURE §11, then remove the gate.
- Migrate: misplaced content → correct level. Pattern in 3+ slices → promote to a P-rule (DESIGN_PATTERNS) or a structure rule (ARCHITECTURE), with a decision-log row.
- Archive: deleted slices → `features/_archived/` (NEVER delete). Add Changelog entry. Remove from the Feature Index and the ESLint boundaries pattern.
- Sync check: every slice in `src/` has a feature folder, and every feature folder has a slice — 1:1 (Locks). Drift → flag.
- Stale: code changed, doc didn't → flag. Don't auto-delete.
- Deduplicate: same lock twice → keep most specific, remove the duplicate.

Report: "System maintainer: compressed {N}, migrated {N}, archived {N}, flagged {N} stale, deduplicated {N}."
