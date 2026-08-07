/**
 * Catalog — the slice's PUBLIC API (R2). Named re-exports only — no `export *`
 * (architecture §3).
 *
 * `ProductCardModal` is consumed by `@/search`'s `ResultStream` (the only
 * cross-slice edge this slice currently has, and it runs one way — see
 * `model.ts`'s header for why catalog never imports back from `@/search`).
 */
export { ProductCardModal } from "./ui/ProductCardModal";
export type { ProductCardData } from "./model";
