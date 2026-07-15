# Vendored skills — provenance

Third-party skills are **copied into this repo, pinned, and committed** — never installed per-machine. Two reasons: every developer and agent inherits them with a plain `git clone` (no CLI, no MCP, no bootstrap step that can fail), and the version we build against is a reviewable file in the diff, not whatever upstream shipped today.

## The rule

**Vendored files stay pristine.** Never edit them to express an ASK rule — a local edit is lost on the next update and hides our decisions inside someone else's file. ASK's overrides live in `platform-ui-design` and `marketing-ui-design`, which route *to* these skills. Where a vendored rule conflicts with ours, **our tokens and locks win** (stated in `platform-ui-design` §4).

## What is vendored

| Skill | Upstream | Pinned commit | License |
|---|---|---|---|
| `shadcn/` | [shadcn-ui/ui](https://github.com/shadcn-ui/ui) · `skills/shadcn/` | `02e398ab73f69a5fc84787332fb854bbaa91f481` | MIT |
| `gsap-core/` | [greensock/gsap-skills](https://github.com/greensock/gsap-skills) · `skills/gsap-core/` | `aed9cfd3277740755f6bfc1155c7aa645403b760` | MIT |
| `gsap-scrolltrigger/` | same | same | MIT |
| `gsap-react/` | same | same | MIT |

`shadcn/` includes the sibling docs its `SKILL.md` references (`cli.md`, `customization.md`, `registry.md`, `rules/*.md`). Deliberately NOT vendored: `mcp.md` (the skill is CLI-driven; we run no MCP), `evals/`, `agents/`, `assets/`.

Deliberately NOT vendored from GSAP: `gsap-timeline`, `gsap-plugins`, `gsap-utils`, `gsap-performance`, `gsap-frameworks`. We use three (P8.2 — add the fourth when a real need appears; `gsap-performance`'s core rule is already a project lock: transform/opacity only).

## Updating one

Re-download the same paths at a newer commit, update the SHA above, review the diff like any other dependency bump, and re-check that our overrides still hold. Because nothing local was edited, this is a clean overwrite.

```sh
SHA=<new-commit>
curl -sfL "https://raw.githubusercontent.com/greensock/gsap-skills/$SHA/skills/gsap-core/SKILL.md" \
  -o .claude/skills/gsap-core/SKILL.md
```
