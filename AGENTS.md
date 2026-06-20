# AskFrontend Agent Rules

These are the nearest project instructions for AskFrontend. Read this file before changing documentation, product UX, client contracts, or future frontend code.

## First Session

If this is the first Codex session in this repository, read:

1. `AI_Knowledge/first_steps/FIRST_READ_THIS.md`
2. `AI_Knowledge/product_ux/UX_UI_FULL_FLOW.md`
3. `codex/CODEX_INFRASTRUCTURE.md`

For later sessions, read only the documents relevant to the task, plus any file you are about to edit.

## Agent Workflow

- Search before creating files, routes, components, adapters, docs, or configs.
- Keep this repository focused on frontend product knowledge, UX flow, and client/backend contract alignment.
- Do not turn this repository into a backend architecture manual.
- Do not create deep frontend code rules until the real frontend stack and project structure exist.
- Keep changes scoped to the current task.
- Do not run `git commit` or `git push` unless the user explicitly asks in the current turn.
- Do not copy secrets, local Codex configs, auth files, sqlite state, generated caches, plugin caches, runtime binaries, or machine-specific paths into this repository.

## Task Routing

- Use simple shell and file review for local docs or code inspection.
- Use current documentation lookup only when library, SDK, CLI, framework, cloud, or provider behavior may have changed.
- Use browser or Playwright only for visible frontend behavior.
- Use backend repository docs for backend implementation details instead of duplicating them here.
- Use Render, Supabase, GitHub, OpenAI, and other provider tools only when authenticated and in scope.
- Use Dashboard or lifecycle tooling only for substantial starts, architectural pivots, and completion records.
- If a likely Codex tool is not visible, use `tool_search` before assuming it is unavailable.

## Product UX Guardrails

- Ask is mobile-first and search-first.
- Smart Search is the primary customer discovery path.
- Category selection scopes Smart Search; it must not become the primary product picker.
- Customers must not be forced to manually choose one concrete SKU from a marketplace-style list in the primary flow.
- Known products and services should appear before fallback request creation when backend data supports it; businesses appear as providers/context for those results.
- Fallback requests exist when data is missing, stale, low-confidence, or confirmation-needed.
- Supplier users need an inbox/work queue, not a single request detail as the whole supplier experience.
- Customer response feeds must support many replies through compact rows, filters, and expandable detail.
- Ask chat is scoped to one request and one supplier.
- WhatsApp, Telegram, maps, and Ask chat are separate per-response contact actions.
- Do not invent stock, delivery, logistics, schedules, slots, booking, or availability facts without supplier input or trusted integration data.

## When To Challenge

Flag the risk before editing if a request would:

- turn Ask into only a broadcast app;
- make search secondary to manual request routing;
- hardcode one city, language, supplier type, provider, frontend, or file format;
- make old browser prototype behavior product truth;
- invent unavailable data truth;
- create incompatible frontend/backend contracts;
- bypass AskBackend as the product API boundary.
