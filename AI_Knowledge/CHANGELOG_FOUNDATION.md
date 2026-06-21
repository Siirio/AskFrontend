# Ask Frontend AI Knowledge Changelog

## 2026-06-21 - Auth and Staff Management Model Update

Updated `EXPECTED_UX_UI_FLOW.md` and `FRONTEND_BACKEND_CONTRACT.md` to align with the refined backend auth and staff management model:

- Replaced mock-based auth flow with three distinct entry points: customer self-registration, business owner self-registration, and staff activation (via unified login).
- Added unified login (`/auth/login`) for all roles with `activationRequired` flag and password change flow.
- Added staff management section (Business Cabinet section 24): staff creation by owner, staff card views before/after activation, temporary password visibility rules, password reset, staff status lifecycle.
- Added invite code management as secondary path.
- Updated supplier response statuses: product (HAS_ITEM, NO_ITEM, NEED_CLARIFICATION, HAS_ANALOG) and service (CAN_PROVIDE, CANNOT_PROVIDE, NEED_CLARIFICATION, SUGGEST_OTHER_TIME).
- Added authority strings, error response format, and staff status/role tables to frontend-backend contract.
- Updated non-negotiable rules (42 total): staff never self-register, activation session TTL 5 min, temp password hidden after activation.

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
