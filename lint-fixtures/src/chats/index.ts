// VIOLATES R5 (with profile/index.ts): a cycle between two slices.
// Expected error: import/no-cycle.
// Functions, not consts: the rule needs only the import edge, and mutually
// recursive const initializers overflow TypeScript's constant evaluator.
// Paired with `profile/` since 2026-07-28 (was `requests/`, a removed slice).
import { profileThing } from "@/profile";

export function chatsThing(): string {
  return "chats needs " + profileThing();
}
