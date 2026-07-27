/**
 * Business Cabinet — the slice's PUBLIC API (R2). Named re-exports only; no
 * `export *` (architecture §3).
 *
 * Mirrors the AskBackend `business` + `offers` modules. The cabinet itself
 * (Branches, Unique Offers, Company Dashboard, and the tabs it COMPOSES from
 * `catalog` / `services` / `requests` / `chats`) is roadmap #7–#9. What exists
 * today is the door into it: seller registration.
 */
export { BusinessRegisterPage } from "./ui/BusinessRegisterPage";
