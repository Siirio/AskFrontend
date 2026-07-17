// VIOLATES R4: crossing from a slice into shared/ must use the '@/' alias, not a
// relative path. shared IS a legal dependency of a slice, so boundaries/
// dependencies stays silent — only the custom rule catches the relative escape.
// Expected error: local/no-cross-element-relative-import.
import { util } from "../shared/util";

export const bad = util;
