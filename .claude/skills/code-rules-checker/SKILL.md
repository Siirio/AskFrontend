---
name: code-rules-checker
description: Validate completed code changes against the DESIGN_PATTERNS_FRONTEND P-rules and ARCHITECTURE R-rules (boundaries, single-implementation, rendering policy). Use after any code change is complete, before reporting it done.
---

# code-rules-checker

Validate recent code changes against `AI_Knowledge/DESIGN_PATTERNS_FRONTEND.md` (P-rules) and `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md` (R-rules, §7 single-implementation).

## Execution
1. git diff to get changed files
2. Run `eslint src` — the boundary rules (R1–R3, R5) are machine-checked; a violation is a build failure, not a comment
3. For each .ts/.tsx file: check the rules ESLint cannot see —
   - P1.1 file over ~400 lines · P1.2 fetch/endpoint URL inside a component · P1.3 hook doing two jobs
   - P4.2 role modeled with optional fields instead of a discriminated union
   - P6.1 second implementation of a §7 concern · P6.3 shared helper taking a caller-type param
   - P7.2 new dependency with no decision-log row · P8.1 speculative props
   - P9.1 screen/control not in `AI_Knowledge/PRODUCT_VISION.md` · P9.2 raw hex/px literal instead of a design-system token
   - D7 module-scope zustand store · `'use client'` added to a route file or a public surface
4. Report: VIOLATION | {file}:{line} | {rule ID} | {fix}
5. Zero violations → "CodeRules: passed."
6. Write violations to Changelog.md. Critical → alert user. Minor → offer auto-fix.
