// LEGAL under R4: a relative import that stays WITHIN the slice (auth/ui → auth).
// This is how the slice anatomy works (a ui/ component reaching its model.ts),
// so it must produce ZERO errors — proving the R4 rule forbids escapes without
// strangling the legal within-element '../'.
import { authModel } from "../model";

export const ok = authModel;
