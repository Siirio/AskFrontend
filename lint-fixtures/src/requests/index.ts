// VIOLATES R5 (with chats/index.ts): the other half of the slice cycle.
// Expected error: import/no-cycle.
import { chatsThing } from "@/chats";

export const requestsThing = `requests needs ${chatsThing}`;
