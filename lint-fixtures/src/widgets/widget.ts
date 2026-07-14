// VIOLATES the folder law: widgets/ is not a sanctioned top-level folder
// (architecture §10 — no entities/, features/, widgets/).
// Expected error: boundaries/no-unknown-files.
export const widget = "unknown top-level folder";
