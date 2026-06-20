# Ask Frontend AI Knowledge Changelog

## 2026-06-19 - Documentation Structure Cleanup

Moved first-session guidance into `AI_Knowledge/first_steps`, moved product UX architecture into `AI_Knowledge/product_ux`, copied the full UX/UI flow into `AI_Knowledge/product_ux/UX_UI_FULL_FLOW.md`, and added `AI_Knowledge/client_contracts/FRONTEND_BACKEND_CONTRACT.md` for frontend-facing backend contract expectations.

Added root `AGENTS.md` as the short agent entrypoint and task router. Kept frontend rules intentionally lightweight because this repository does not yet define a real frontend stack or code structure.

Moved Codex plugin and MCP expectations into `codex/CODEX_INFRASTRUCTURE.md` and removed old project-local skill, audit, origin, deprecated web-staging, and playbook docs that were not useful for new frontend programmers.

## 2026-06-18 - Search-First Strategy Actualization

Updated the frontend strategy:

- Ask Frontend now treats customer discovery as local search first.
- The UI should show known products/services before request creation when backend data exists, with businesses shown as providers/context for those results.
- If exact data is missing, stale, or uncertain, the UI can guide the customer into a fallback request.
- Catalog-backed search, result confidence, service discovery, and API-backed Excel/CSV import UX are core product directions.
- Frontend still must not own backend source-of-truth, search indexing, ranking truth, catalog normalization, or availability facts.

## 2026-06-17 - Goal Actualization

Updated the frontend product architecture idea:

- Android, iOS, and web should use one AskBackend.
- Backend communication should live behind a shared design-independent client/API abstraction where possible.
- Feature-Sliced Design is the intended frontend architecture style when real app code exists.
- Platform UI can differ, but heavy request, catalog, service, and availability logic should not be duplicated separately in each UI.
- Product catalog UX should account for Excel and CSV import flows backed by backend contracts.
- Service-provider administration is expected to fit a web cabinet better than mobile-only screens for larger service data, schedules, discounts, conditions, specialists, and branches.
