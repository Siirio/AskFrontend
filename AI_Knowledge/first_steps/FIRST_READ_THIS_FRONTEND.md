# First Read This

Read this first when opening AskFrontend in a fresh Codex session or onboarding a programmer.

## Required Read Order

1. `README.md`
2. `AGENTS.md`
3. `AI_Knowledge/product_ux/UX_UI_FULL_FLOW.md`
4. `AI_Knowledge/product_ux/ARCHITECTURE_NARRATIVE.md`
5. `AI_Knowledge/client_contracts/FRONTEND_BACKEND_CONTRACT.md`
6. `codex/CODEX_INFRASTRUCTURE.md`
7. `AI_Knowledge/first_steps/IMPLEMENTATION_PIPELINE.md`
8. `AI_Knowledge/CHANGELOG_FOUNDATION.md`

## What Belongs Here

This repository should give a new programmer enough context to understand the Ask frontend product flow without importing old project history or backend implementation rules.

Keep:

- current UX/UI flow;
- frontend product direction;
- client/backend contract expectations;
- data-truth rules for UI display;
- Codex infrastructure requirements.

Do not keep:

- old prototype migration notes;
- deprecated browser-staging behavior as product truth;
- backend persistence, migration, repository, or service-layer instructions;
- local MCP folders or local plugin state;
- local Codex configs, tokens, auth files, sqlite state, generated caches, runtime binaries, or machine-specific paths.

## First Codex Setup

Codex infrastructure is not configured from project-local MCP folders. The project lists the expected plugins, MCP servers, and skills in `codex/CODEX_INFRASTRUCTURE.md`; Codex-level tooling installs and routes them.

Expected MCP servers:

- `context7`
- `playwright`
- `node_repl`
- `render`
- `openai_api_key_local_confirmation`

Expected plugin families:

- OpenAI Developers
- Build Web Apps
- Vercel
- Render
- Supabase
- GitHub
- CircleCI
- CodeRabbit
- Figma
- HyperFrames
- Remotion
- Documents
- Spreadsheets
- Presentations
- PDF
- Browser
- Chrome
- Computer Use

## If The Chat Is Interrupted

Resume by reading:

1. this file;
2. `AGENTS.md`;
3. `AI_Knowledge/first_steps/IMPLEMENTATION_PIPELINE.md`;
4. `AI_Knowledge/CHANGELOG_FOUNDATION.md`;
5. current git status or file diff.

Continue from the last completed stage. Do not restart by overwriting files.
