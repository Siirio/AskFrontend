/**
 * Wire-case boundary (D20). The backend serializes JSON in snake_case —
 * `spring.jackson.property-naming-strategy: SNAKE_CASE` in its base
 * application.yml (on every deploy branch since 2026-06-25) — while every
 * frontend type and slice speaks camelCase. These pure functions (P5.1)
 * convert object KEYS, deeply, at the transport boundary and nowhere else:
 * httpClient snakifies request bodies and camelizes response bodies (success
 * AND error), so no slice ever sees a snake_case key.
 *
 * Only plain objects and arrays are walked; primitive values and non-plain
 * objects (Blob, FormData, Date…) pass through untouched. Query-string keys
 * are NOT transformed — Spring binds @RequestParam by Java parameter name,
 * which Jackson's naming strategy does not affect.
 */

const camelize = (key: string): string =>
  key.replace(/_([a-z0-9])/g, (_, ch: string) => ch.toUpperCase());

/** Matches Jackson's SnakeCaseStrategy on acronym runs: a run of capitals is
 *  ONE segment (`userID` → `user_id`, never `user_i_d`) — Jackson underscores
 *  only at a lower→upper boundary. Frontend fields therefore use strict
 *  camelCase (`userId`), which round-trips exactly. */
const snakify = (key: string): string =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto: unknown = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function mapKeysDeep(value: unknown, mapKey: (key: string) => string): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => mapKeysDeep(item, mapKey));
  }
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value)) {
    out[mapKey(key)] = mapKeysDeep(inner, mapKey);
  }
  return out;
}

/** camelCase keys → snake_case, for request bodies. */
export function snakifyKeys(value: unknown): unknown {
  return mapKeysDeep(value, snakify);
}

/** snake_case keys → camelCase, for response bodies. */
export function camelizeKeys(value: unknown): unknown {
  return mapKeysDeep(value, camelize);
}
