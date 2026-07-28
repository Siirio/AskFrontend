/**
 * Search — the slice's PUBLIC API (R2). Named re-exports only — no `export *`
 * (architecture §3).
 *
 * `search`, `parseCatalogSearchParams` and `toSearchRequest` are exported for
 * ONE consumer: the Catalog Page's own route file, which does the server-side
 * fetch directly per D7/P1.2 ("in server route files, calling the slice's
 * api.ts directly and passing data down is the sanctioned path for public
 * surfaces"). The entry-point rule (R2, ESLint `boundaries/entry-point`)
 * still applies to `app/` the same as to another slice — the route imports
 * these from HERE, never from `./api` or `./model` directly.
 */
export { HomePage } from "./ui/HomePage";
export { CatalogPage } from "./ui/CatalogPage";
export { search } from "./api";
export {
  parseCatalogSearchParams,
  toSearchRequest,
  type CatalogSearchParams,
  type SearchResponse,
} from "./model";
