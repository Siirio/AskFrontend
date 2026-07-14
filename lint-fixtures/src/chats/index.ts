// VIOLATES R5 (with requests/index.ts): a cycle between two slices.
// Expected error: import/no-cycle.
import { requestsThing } from "@/requests";

export const chatsThing = `chats needs ${requestsThing}`;
