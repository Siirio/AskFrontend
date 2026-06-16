# First Read This

This is the first document to read when opening Ask with Codex or onboarding a developer.

## Read Order

1. `README.md`
2. `ARCHITECTURE_NARRATIVE.md`
3. `AGENTS.md`
4. `CODEX_PLAYBOOK.md`
5. `IMPLEMENTATION_PIPELINE.md`
6. `SELF_AWARE_ORIGIN.md`
7. `skills/README.md`
8. `DEPRECATED_WEB_STAGING_NOTES.md` only when deciding whether old browser-prototype logic should be kept
9. `CHANGELOG_FOUNDATION.md`

## Immediate Rules

- Do not edit application business code before reading the relevant project rules.
- Do not overwrite existing `AGENTS.md`, skill docs, or workflow files without reading them.
- Do not copy local Codex configs, auth files, tokens, sqlite state, generated caches, plugin caches, runtime paths, or machine-specific setup into the repo.
- Do not make old browser-staging behavior a product or frontend requirement.
- Preserve the product direction: request routing now, catalog and integration depth over time, services later.
- Use system analysis before coding catalog UX, service UX, schedules displayed in UI, integration-backed display, client state ownership, scaling assumptions, or API contract changes.

## If The Chat Is Interrupted

Resume by reading:

1. this file;
2. `IMPLEMENTATION_PIPELINE.md`;
3. `CHANGELOG_FOUNDATION.md`;
4. current git status or file diff;
5. the specific docs for the task route in `CODEX_PLAYBOOK.md`.

Continue from the last completed stage. Do not restart by overwriting files.

## What A Good Codex Agent Should Do

- Load the foundation before coding.
- Search existing files and patterns.
- Keep the task scoped.
- Separate product decisions from temporary prototype details.
- Warn when a request conflicts with vision or architecture.
- Offer compatible alternatives.
- Verify work with the right level of tests or checks.
