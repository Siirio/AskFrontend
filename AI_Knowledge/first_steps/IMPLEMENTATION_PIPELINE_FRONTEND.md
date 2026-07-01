# Implementation Pipeline

Use this pipeline to keep the AskFrontend AI knowledge useful as the product grows.

## Stage 1 - Orient

Before editing:

1. Check current git status.
2. Read `AI_Knowledge/first_steps/FIRST_READ_THIS.md`.
3. Read `AGENTS.md` and any closer project-specific instructions.
4. Read the relevant UX or contract document for the task.
5. Search for existing local patterns.

## Stage 2 - Classify The Task

Classify the work:

- product UX;
- UX/UI full-flow update;
- client/backend contract;
- catalog/search UX;
- services/schedules/booking UX;
- integration display;
- Codex infrastructure guidance;
- documentation/foundation;
- debugging/review.

Use only the tools and docs needed for that route.

## Stage 3 - Analyze Before Code When Needed

For catalog UX, services UX, schedules shown in UI, integration-backed display, city/country scaling, auth UI, API shape, client state ownership, or frontend/backend responsibility split, write a short analysis first:

```text
Problem:
Actors:
Current evidence:
Proposed model:
MVP shortcut:
Deferred decisions:
Risks:
Verification:
```

If a product decision is missing, ask before implementing.

## Stage 4 - Edit Safely

- Preserve current UX locks unless the user explicitly changes product direction.
- Do not change application code unless the task requires it.
- Do not widen scope silently.
- Do not copy prototype-only mechanics as production product truth.
- Do not hardcode one city, provider, file format, frontend, or workflow.
- Do not add backend implementation rules here; link to backend docs when needed.

## Stage 5 - Verify

Choose verification by risk:

- docs-only: file inventory, content review, no secret/local-state scan;
- frontend code: build, lint, tests, browser/mobile verification when visible;
- API contract work: adapter review and mocked backend payloads where useful;
- integration display: no credential leakage and no direct private provider calls;
- architecture changes: docs/changelog updates plus dependency impact review.

## Stage 6 - Record

Update `AI_Knowledge/CHANGELOG_FOUNDATION.md` when work changes:

- product UX direction;
- client/backend contract;
- catalog UX strategy;
- services UX strategy;
- integration display assumptions;
- AI workflow;
- Codex infrastructure guidance.
