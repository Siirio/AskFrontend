// VIOLATES R5 (with chats/index.ts): the other half of the slice cycle.
// Expected error: import/no-cycle.
//
// Was `requests/` until 2026-07-28, when that slice was removed from the
// product. Rebuilt on `profile` — a LIVE slice — deliberately: an unknown
// folder ALSO makes ESLint error, so leaving it as `requests/` would have kept
// the harness green while proving `boundaries/no-unknown-files` instead of
// `import/no-cycle`. A fixture that fails for the wrong reason tests nothing.
import { chatsThing } from "@/chats";

export function profileThing(): string {
  return "profile needs " + chatsThing();
}
