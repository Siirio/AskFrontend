# Implementation Pipeline

Use this pipeline to keep the Ask foundation useful as the project grows.

## Stage 1 - Orient

Before editing:

1. Check current git status.
2. Read `FIRST_READ_THIS.md`.
3. Read the task route in `CODEX_PLAYBOOK.md`.
4. Read `AGENTS.md` and any closer project-specific instructions.
5. Search for existing local patterns.

## Stage 2 - Classify The Task

Classify the work:

- API/backend contract;
- API contract integration;
- catalog/search UX;
- services/schedules/booking UX;
- frontend/mobile/API contract;
- integration display;
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

- Preserve existing docs and rules.
- Add to files instead of overwriting when the target file may contain human decisions.
- Do not change application business code unless the task requires it.
- Do not widen scope silently.
- Do not copy prototype-only behavior as production logic.
- Do not hardcode one city, provider, file format, frontend, or workflow.

## Stage 5 - Verify

Choose verification by risk:

- docs-only: file inventory, content review, no secret/local-state scan;
- frontend code: build, lint, tests, browser/mobile verification when visible;
- API contract work: adapter tests and mocked backend payloads where useful;
- integration display: no credential leakage and no direct private provider calls;
- architecture changes: docs/changelog updates plus tests where behavior changed.

## Stage 6 - Record

Update `CHANGELOG_FOUNDATION.md` or project docs when work changes:

- product vision;
- architecture;
- API contract;
- catalog strategy;
- services strategy;
- integration display assumptions;
- AI workflow;
