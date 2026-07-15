# Project: ASK Frontend

Web client for the ASK platform — local product/service search with an anti-marketplace intent layer. One Next.js app: marketing landing at `/`, platform at `/app/*`. Consumes the ASK Backend REST API.

## Tech Stack
- Next.js (App Router), TypeScript, React server components by default
- Tailwind v4 on `design-system/` tokens (single visual source)
- zustand (store factories via context providers), GSAP (`useGSAP()` + `ScrollTrigger`, D11)
- `shared/ui` primitives scaffolded via shadcn CLI + Radix, restyled to `design-system/` tokens before use (D12). Import GSAP from `shared/motion.ts`, never `gsap` directly (D14)
- next-intl (ru/kk/en), lucide-react, sonner (Toast, `theme="system"` — NO next-themes), `next/image`, Playwright (e2e)
- Prettier + `prettier-plugin-tailwindcss` the one formatter (D15, `npm run format`); Vercel the deploy host (D16, `vercel.json` pins `buildCommand`)
- Vertical Slice Architecture — slices mirror AskBackend module names, ESLint-enforced boundaries; CI (GitHub Actions) gates format + build + e2e

## Runtime Constraints
- Never commit or push unless the user explicitly asks. When they do → follow **Commit Rules** below, exactly.
- Never run npm/pnpm install, dev, or build unless the user explicitly says "run" or "build."
- AI_Knowledge/ must be committed — it IS the shared truth. Never add to .gitignore.
- The 3 CORE files (`AI_Knowledge/PRODUCT_VISION.md`, `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md`, `AI_Knowledge/DESIGN_PATTERNS_FRONTEND.md`) are normative authorities. Change them by append + date + justification (their own "changing this file" rules), never by silent rewrite, never by compression.

## Session Start — MANDATORY

At EVERY session start. Run commands yourself via Bash. Do NOT tell the developer.

### 1. Machine bootstrap check
Check if `.claude/machine-bootstrap.lock` exists. If NOT → run Machine Bootstrap below FIRST.
(This file is gitignored — tracks per-machine install. Every new developer re-runs this.)

### 2. Workspace discovery
```
ls -d ../*/CLAUDE.md 2>/dev/null
```
For each found: read its first project line. If `ASK Backend` is missing from `../Ask_Backend/CLAUDE.md` → flag it. If present → note its features and locks.

### 3. Knowledge scan
Read the 3 CORE files (`AI_Knowledge/PRODUCT_VISION.md`, `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md`, `AI_Knowledge/DESIGN_PATTERNS_FRONTEND.md`), plus `AI_Knowledge/Locks.md` and `AI_Knowledge/ROADMAP.md`. Scan `AI_Knowledge/features/` directories. Report: "Phase {N}. {N} slices tracked, {M} locks active, {G} gates open."

### 4. Self-maintenance
Run system-maintainer protocol: compress bloated docs, migrate misplaced content, archive dead slices, flag stale docs, deduplicate locks. NEVER compress the CORE files or Locks.md.

## Machine Bootstrap (runs ONCE per machine — NOT committed)

`.claude/machine-bootstrap.lock` must be in `.gitignore`. It tracks whether THIS machine has plugins, MCPs, and related repos installed. Every new developer re-runs this.

If `.claude/machine-bootstrap.lock` does NOT exist, execute every step. Run commands yourself.

### A. Install superpowers plugin
Check: does `Skill` tool list `capability-router`?
If NOT — run:
```
claude plugins install superpowers
```

### B. Install MCP servers
For each, check if available in MCP tool list. If missing → install:
```
claude mcp add context7
claude mcp add playwright
claude mcp add dashboard
claude mcp add notebooklm
claude mcp add figma-console
```
Report each: installed / already present / failed. Continue on failure.

### C. Clone ASK Backend
Check if `../Ask_Backend/CLAUDE.md` exists. If NOT:
```
git clone https://github.com/Siirio/AskBackend.git ../Ask_Backend
```
If clone succeeds: verify it has CLAUDE.md. If not → flag to user.

### D. Add to .gitignore
Ensure `.gitignore` contains this line:
```
.claude/machine-bootstrap.lock
```

### E. Create machine lock
```
echo "machine-bootstrapped: $(date)" > .claude/machine-bootstrap.lock
```
Report: "Machine ready. Installed: {plugins}, {MCPs}. Cloned: {repos}."

## Knowledge Architecture

`AI_Knowledge/` is the repo's ONE knowledge home. The root holds protocol only (this file + AGENTS.md).

```
AI_Knowledge/
  PRODUCT_VISION.md                 ┐
  ARCHITECTURE_PATTERN_FRONTEND.md  ├─ CORE authorities (never compressed)
  DESIGN_PATTERNS_FRONTEND.md       ┘
  ROADMAP.md                        ─  what to build next, and the open gates
  Locks.md                          ─  invariants
  Changelog.md                      ─  dated decisions
  features/{slice}/                 ─  Tier 2, one folder per slice
```

The four authorities in one line: the vision says WHAT, the architecture says WHERE, the design patterns say HOW, the roadmap says WHEN.

### CORE — the authorities (Tier 1, always loaded, NEVER compressed, NEVER auto-edited)
| File | Purpose |
|------|---------|
| `AI_Knowledge/PRODUCT_VISION.md` | **Product authority.** Users, what we are NOT, user flows (UF 1–3.1), filter & sort. Nothing is built that is not here. |
| `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md` | **Structure authority.** Slices, slice anatomy, import rules R1–R6, single-implementation table, decision log D1–D10. |
| `AI_Knowledge/DESIGN_PATTERNS_FRONTEND.md` | **Code authority.** Principles P1–P9. Cite by ID in reviews and prompts. |

The second data authority is **the ASK Backend API** (`../Ask_Backend/AI_Knowledge/`) — contracts, DTOs, module names. Backend wins for DATA, the vision wins for INTENT (P9.4).

### Also always loaded (Tier 1 — session start)
| File | Max | Purpose |
|------|-----|---------|
| `AI_Knowledge/Locks.md` | 40 | Frontend invariants. If violated → STOP and ASK |
| `AI_Knowledge/ROADMAP.md` | 150 | Current phase, the DONE definition for a slice, open gates. A gate blocking the work → STOP and ASK. Completed phases move to Changelog.md and leave this file. |

### Domain touch (Tier 2 — loaded when a slice is touched, cached for session)
| File | Purpose |
|------|---------|
| `AI_Knowledge/features/{slice}/README.md` | Why this slice exists, backend module it mirrors, key decisions |
| `AI_Knowledge/features/{slice}/contracts.md` | Backend endpoints/DTOs THIS slice consumes |
| `AI_Knowledge/features/{slice}/ux-ui-flow.md` | Screens, routes, states — traced to PRODUCT_VISION user flows |
| `AI_Knowledge/features/{slice}/locks.md` | Slice-level invariants |

### On demand (Tier 3)
| Source | Use for |
|--------|---------|
| context7 | Current Next.js / React / Tailwind / zustand library docs |
| playwright | Driving the real UI to verify a screen |
| graphify | Cross-slice concept links |
| NotebookLM | Large reference docs |

## Before ANY Code Change
1. Load `AI_Knowledge/Locks.md` + `AI_Knowledge/features/{slice}/locks.md`
2. If ANY lock would be violated → STOP. ASK the user. Do not proceed until answered.
3. Check `AI_Knowledge/ROADMAP.md`: is an open **gate** blocking this work? → STOP and ASK. Building past a gate means guessing at a contract someone else owns.
4. Confirm the screen/flow/control exists in `AI_Knowledge/PRODUCT_VISION.md` (P9.1). Not there → STOP and ASK. Never invent UI.
5. Writing `api.ts`? Read `AI_Knowledge/features/{slice}/contracts.md` AND the backend's `../Ask_Backend/AI_Knowledge/features/{module}/contracts.md`. Never guess a DTO.
6. Search the codebase for existing patterns that solve the same problem. Reuse via the ownership test (architecture §5, D8).

## After ANY Code Change
1. Slice behavior or a key decision changed? → Update `AI_Knowledge/features/{slice}/README.md`
2. Consumed endpoint, DTO, or error code changed? → Update `AI_Knowledge/features/{slice}/contracts.md`
3. Screen, route, or state changed? → Update `AI_Knowledge/features/{slice}/ux-ui-flow.md`
4. Non-obvious design decision? → Append `AI_Knowledge/Changelog.md`: date, rationale, affected files
5. New invariant discovered? → Add to the appropriate `locks.md`
6. Structural change (new slice, moved domain, new dependency, new mechanism)? → Update `AI_Knowledge/ARCHITECTURE_PATTERN_FRONTEND.md` §2 + decision log §11, and the ESLint boundaries pattern §8 — **in the same commit**
7. Did this change make a doc entry wrong? → Fix it NOW. Stale docs = broken system.

### Cross-project awareness
- Before consuming an endpoint → read `../Ask_Backend/AI_Knowledge/features/{module}/contracts.md`
- If a backend contract changed → update this repo's matching `features/{slice}/contracts.md`
- If a backend lock would be violated by what the UI needs → STOP and ASK
- If our UI needs data the backend does not return → raise it. Never invent the field, never fake it client-side (P9.4)

## Commit Rules

Never commit or push unless the user explicitly asks. When they do, these rules are binding.

### Format — Conventional Commits

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Type** — `feat` (new user-facing capability) · `fix` (bug) · `docs` (documentation only) · `refactor` (no behavior change) · `perf` · `test` · `build` (deps, bundler, config) · `ci` · `chore` (housekeeping) · `style` (formatting only) · `revert`

**Scope** — the slice, or the area:
- slices: `auth` `search` `catalog` `services` `chats` `requests` `profile` `business-cabinet`
- everything else: `app` `marketing` `shared` `design-system` `lib` `e2e` `deps` `ai-knowledge`
- Omit the scope only when the change is genuinely repo-wide.

**Subject** — imperative mood ("add", never "added"/"adds"), lowercase, no trailing period, ≤72 chars.

**Body** (optional, wrap at 72) — WHY, not what; the diff already shows what. Cite rule IDs and decisions where they justify the change (`P1.2`, `R2`, `D7`, a lock).

**Footer** — `BREAKING CHANGE: <what breaks, what to do>` for anything that breaks a contract, a URL, or a public API.

### FORBIDDEN in every commit
- **No AI attribution, in any form.** No `Co-Authored-By: Claude`, no "Generated with Claude Code", no 🤖 emoji, no "with AI assistance" in the body. The history belongs to the team, not the tool.
- No `--no-verify`, no skipped hooks, no bypassed signing.
- No secrets. Review `git status` after staging; if a file could carry a credential, open it before committing.

### Rules
- One logical change per commit.
- **Docs ship WITH the code they describe** — a slice change and its `features/{slice}/*` update are ONE commit (see After ANY Code Change), never a trailing `docs:` commit.
- Never commit on `master` — branch first.
- Amending or force-pushing an already-pushed commit needs explicit user approval.

### Examples
```
feat(search): add distance and cost sorting to the catalog page
fix(auth): stop the profile card flashing the logged-out state on reload
refactor(business-cabinet): split BusinessPage into tab components (P1.1)
build(deps): add eslint-plugin-boundaries to enforce R1-R3
docs(ai-knowledge): record the chats slice contracts
chore(app): scaffold the App Router skeleton
```

## Lock System

Format: `LOCKED | {what} | {why} | {scope: files/rules/routes}`

Project-level: `AI_Knowledge/Locks.md`
Slice-level: `AI_Knowledge/features/{slice}/locks.md`

Breaking a lock requires: (1) explicit user approval, (2) proof that surrounding extension is insufficient.

## Tool Routing

Skills live at `.claude/skills/{name}/SKILL.md` and are **committed** — every developer and agent inherits them on clone, with no install step and nothing to bootstrap. Third-party skills are **vendored and pinned**, never installed per-machine: see `.claude/skills/VENDORED.md` (upstream, commit, license, update procedure). Vendored files stay pristine — ASK's overrides live in the two design skills, which route to them.

| When | Use | Missing? |
|------|-----|----------|
| Code change complete | `code-rules-checker` skill | Manual check against P-rules + `eslint src` |
| Docs need update | `documentation-updater` skill | Direct file edit |
| Knowledge cleanup | `system-maintainer` skill | Manual maintenance |
| Building/styling `app/(marketing)/`, or generating the `design-system/` tokens | `marketing-ui-design` skill | Manual check against D11/D12 + the design locks |
| Building/styling `/app/*` (any slice `ui/`) | `platform-ui-design` skill | Manual check against D8 ownership test + D12 |
| Any animation (GSAP is the one system, D11) | `gsap-core` · `gsap-scrolltrigger` · `gsap-react` (vendored) | Never recall the API from memory — read the vendored SKILL.md |
| Scaffolding a `shared/ui` primitive (D12) | `shadcn` skill (vendored; CLI-driven, needs no MCP) | `npx shadcn@latest` by hand — then restyle to tokens before first use |
| Next.js/React/Tailwind docs needed | context7 MCP | `claude mcp add context7` |
| Need to verify a screen in the browser | playwright MCP, or this repo's own Playwright e2e harness | `claude mcp add playwright` |
| Large reference docs | NotebookLM MCP | `claude mcp add notebooklm` |
| Cross-slice discovery | graphify | Comes with superpowers |
| Task tracking | dashboard MCP | `claude mcp add dashboard` |

If a tool is missing AND install fails: do the work manually. Never skip.

### The UI work loop
Every UI change runs this loop — it is how a design decision survives contact with an agent:

**invoke the design skill** (`marketing-ui-design` or `platform-ui-design`, per surface) → **build** → **verify visually** (drive the real screen: the Playwright harness against `next build && next start`, or the playwright MCP — never "it should render") → **self-review against the skill's Definition of done** (light *and* dark · ru/kk/en with real strings · every value a token · reduced-motion path · nothing from the Never table) → **`code-rules-checker`** → **update `features/{slice}/ux-ui-flow.md` in the same commit**.

## Self-Maintenance

Run at session start:
1. **Compress**: File over max-lines? Remove outdated, merge duplicates, tighten prose. NEVER compress the 3 CORE files or any Locks.md.
2. **Migrate**: Slice-specific info in a project-level file? Move to the slice folder. Pattern across 3+ slices? Promote to `AI_Knowledge/DESIGN_PATTERNS_FRONTEND.md` (a P-rule) or the architecture doc (a structure rule) — with a decision-log row.
3. **Archive**: Slice deleted but docs remain? Move to `AI_Knowledge/features/_archived/`. NEVER delete.
4. **Stale flag**: Doc untouched 30+ days while the slice's code changed? Flag to user. Do NOT auto-delete.
5. **Deduplicate**: Same lock in two files? Keep the most specific, remove the duplicate.

## Related Projects
| Project | Clone URL | Expected at | Relationship |
|---------|-----------|-------------|-------------|
| ASK Backend | https://github.com/Siirio/AskBackend.git | ../Ask_Backend/ | Spring Boot REST API. Data authority for this client. |

## Feature Index

A **feature folder == a slice**, 1:1. Slice names mirror AskBackend module names (architecture D1).

| Slice | Folder | Backend module | Route(s) | Rendering |
|-------|--------|----------------|----------|-----------|
| Auth & Roles | auth/ | identity | /app/auth | client |
| Search & Catalog list | search/ | search | /app, /app/catalog | server |
| Product Card | catalog/ | catalog, import | /app/product/[id] | server |
| Services | services/ | service | business cabinet tab | client |
| Chats | chats/ | chat | /app/chats | client |
| Requests | requests/ | request | business cabinet tab | client |
| Profile | profile/ | identity | /app/profile | client |
| Business Cabinet | business-cabinet/ | business, offers | /app/business | client |

Backend modules with no V1 surface (`autodump`, `contact`, `shipping`) get no slice yet. Marketing (`app/(marketing)`) is app-level wiring, NOT a slice — it never gets a feature folder.
