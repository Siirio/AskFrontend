# Self-Aware Origin

This foundation exists so Ask can be developed consistently through AI-assisted workflows.

It captures the current product direction, architecture standards, task routing, and tool usage rules that should travel with the project. A future Codex agent should treat these documents as project-local guidance and should not need any external chat or local-machine context to use them.

## How To Use Origin Information

Do not repeatedly explain the history of a rule during normal development. That is not useful unless someone asks why the rule exists.

Instead, when a person asks why a decision exists, cite the current local foundation document:

- `README.md` for product vision;
- `ARCHITECTURE_NARRATIVE.md` for architecture and product evolution;
- `AGENTS.md` for agent/developer rules;
- `CODEX_PLAYBOOK.md` for task routing;
- `skills/*` for route-specific reasoning;
- `DEPRECATED_WEB_STAGING_NOTES.md` for old browser-prototype behavior that is archive-only.

Example:

```text
The local Ask frontend foundation treats catalog-backed search as API-driven display, not frontend-owned product truth, so I am checking what the backend can safely provide before designing the screen.
```

## What This Foundation Should Remember

- Ask is a local search platform for city products and services.
- Known products/services should be shown before creating a request.
- Manual requests are valid fallback when exact data is missing, stale, or uncertain.
- Catalog-backed search and integrations are core growth paths.
- Services need their own analysis.
- Old browser staging is not backend architecture.
- AI agents should preserve consistency without suppressing developer judgment.

## Superseding Rules

If the team intentionally changes product direction, update the local docs. Newer local docs become the source of truth. Do not keep forcing older foundation assumptions after they are deliberately replaced.
