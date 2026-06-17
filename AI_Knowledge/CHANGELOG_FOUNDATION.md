# Frontend AI Knowledge Changelog

## 2026-06-17 - Goal Actualization

Updated the frontend product architecture idea:

- Android, iOS, and web should use one AskBackend.
- Backend communication should live behind a shared design-independent client/API abstraction where possible.
- Feature-Sliced Design is the required frontend architecture style.
- Platform UI can differ, but heavy request, catalog, service, and availability logic should not be duplicated separately in each UI.
- Product catalog UX should account for Excel and CSV import flows backed by backend contracts.
- Service-provider administration is expected to fit a web cabinet better than mobile-only screens for larger service data, schedules, discounts, conditions, specialists, and branches.

## 2026-06-17 - Frontend Scope Cleanup

Reduced the copied foundation to frontend-relevant AI knowledge.

### Kept

- `ARCHITECTURE_NARRATIVE.md`
- `FIRST_READ_THIS.md`
- `IMPLEMENTATION_PIPELINE.md`
- `AGENTS.md`
- `SELF_AWARE_ORIGIN.md`
- `FOUNDATION_AUDIT.md`
- `DEPRECATED_WEB_STAGING_NOTES.md`
- `CHANGELOG_FOUNDATION.md`
- `skills/README.md`
- `skills/frontend-ask.md`
- `skills/architecture-system-analysis.md`
- `skills/ai-workflow-consistency.md`
- `skills/catalog-integration.md`
- `skills/services-search.md`

### Removed

- Backend Spring skill.
- MCP/dashboard skill.
- MCP and plugin setup docs.
- Archive folder README.
- AI_Knowledge-local `.gitignore`.

### Adjusted

- Reframed backend/catalog/services content as frontend UX and API-contract awareness.
- Removed backend implementation ownership from frontend docs.
- Kept product vision, data truth, Smart Search, supplier inbox, response feed, services UX, and AI workflow consistency.

### Excluded

- Local Codex configs and secrets.
- Generated runtime state.
- Machine-specific setup.
- Backend persistence, migrations, service layering, repositories, provider adapters, and deployment infrastructure as frontend instructions.
