// VIOLATES R5 (with requests/index.ts): a cycle between two slices.
// Expected error: import/no-cycle.
// Functions, not consts: the rule needs only the import edge, and mutually
// recursive const initializers overflow TypeScript's constant evaluator.
import { requestsThing } from "@/requests";

export function chatsThing(): string {
  return "chats needs " + requestsThing();
}
