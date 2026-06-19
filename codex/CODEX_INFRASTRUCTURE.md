# Codex Infrastructure

This file lists the Codex-level tools expected for AskFrontend work. It is not an MCP config and must not contain secrets, auth state, sqlite files, plugin caches, generated runtimes, or machine-specific install paths.

## Required Project Behavior

- Use global Codex plugin and MCP installation, not project-local MCP folders.
- Let the Codex-level MCP router choose tools by task.
- Use the smallest relevant tool set.
- If a needed tool is not visible in a session, use `tool_search` before assuming it is unavailable.

## Expected MCP Servers

- `context7`: current library and framework documentation lookup.
- `playwright`: browser checks for visible frontend behavior.
- `node_repl`: JavaScript execution and lightweight local analysis.
- `render`: Render services, logs, metrics, Postgres, Key Value, and deploy inspection when frontend deployment is in scope.
- `openai_api_key_local_confirmation`: local OpenAI API key setup confirmation when OpenAI developer workflows require it.

## Expected Plugin Families

- OpenAI Developers: OpenAI API, Agents SDK, ChatGPT app, and key setup workflows.
- Build Web Apps: frontend app construction, React guidance, shadcn, and browser verification.
- Vercel: Next.js, deployment, runtime, storage, auth, observability, and workflow guidance.
- Render: deploy, monitor, debug, web services, env vars, domains, and workflows when deployment is in scope.
- Supabase: Supabase and Postgres workflows when in scope.
- GitHub: repository, PR, comments, CI, and publish workflows.
- CircleCI: CI config and build diagnosis when in scope.
- CodeRabbit: review-style PR/code feedback when requested.
- Figma: design, FigJam, slides, diagrams, libraries, and Code Connect when design work is in scope.
- HyperFrames and Remotion: motion/video work when explicitly requested.
- Documents, Spreadsheets, Presentations, PDF: formal file artifacts.
- Browser, Chrome, and Computer Use: browser or Windows app control when needed.
- Project skills: `mcp-tool-router`, `ask-project-knowledge`, `protect-approved-logic`, `evidence-first-debugging`, frontend/build-web-app skills, and domain-specific skills only when their task trigger applies.

## AskFrontend Tool Notes

- Docs-only work usually needs local file search and project rules, not browser tools.
- Visible UI changes should be verified in a mobile viewport when an app exists.
- Deep backend implementation belongs in AskBackend docs.
- Render, Supabase, GitHub, OpenAI, and provider tools are used only when authenticated and in scope.
- Do not add project-local MCP connection folders. Codex infrastructure belongs above the repository.
