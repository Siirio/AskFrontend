# Ask Frontend AI Knowledge Changelog

## 2026-08-02 — Catalog galleries and responsive result details

- Added managed Item and Service image selection from real files, clipboard pasting, drag-and-drop ingestion, and drag reordering with a three-image limit.
- Made search filters collapsible, switched desktop result details to hover preview, and added a mobile detail modal that excludes business-avatar and chat actions.
- Replaced oversized business artwork in result details with a compact profile avatar, hid match-reason explanations, and rendered catalog image galleries.
- Consolidated the public storefront into one continuous surface and omitted empty optional fields.

## 2026-07-30 — Existing-email registration rejection

- Kept the registration form open when the backend returns `EMAIL_ALREADY_REGISTERED`.
- Replaced the generic backend text with the localized instruction that the account already exists and the user must sign in.
- Synchronized the frontend auth contract and UX with the backend `409` behavior.

## 2026-07-30 — Durable OAuth legal registration

- Persisted the first Google registration signal through the callback and page reload until role-specific legal acceptance succeeds.
- Removed frontend dependence on the permanently false `requiresRoleSelection` session field.
- Kept customer and seller document sets aligned with the authenticated legal registration endpoint.

## 2026-07-29 — Account security and chat cleanup

- Replaced direct password and 2FA mutations with separate email-verified request/confirm dialogs using exact 6-digit codes and resend.
- Simplified the personal account screen to profile data, security, conditional company onboarding, logout, and a distinct deletion danger zone.
- Removed duplicated preferences, notification, and legal sections; removed the dedicated chat status-filter bar while retaining text search.
- Confirmed search surfaces remain free of notification-bell controls.

## 2026-07-29 — Platform cabinet redesign

- Replaced the seven-section admin shell with `Сводка`, `Бизнесы`, `Чаты`, `Аккаунты`, and `Команда Ask`.
- Embedded catalog, chat, and account moderation in their owning sections.
- Added backend-authored yellow review and red critical event counters that exclude ordinary unread messages.
- Kept all normal active Items and Services immediately searchable; only suspicious autocheck results enter moderation.
- Unified platform chats into support, managed-import help, and ordinary conversation tabs while preserving the assigned seven-day managed-import grant.

## 2026-07-27 — Seller delivery onboarding and editable profile

- Added the penultimate seller-onboarding screen for business-wide delivery coverage, selected city names, and pickup availability.
- Added delivery fields to the onboarding and Business profile API contracts.
- Added delivery editing to the Business profile editor and preserved the values across onboarding drafts.

## 2026-07-26 — Durable catalog creation

- Product creation now reloads the committed first page instead of depending on a temporary optimistic row.
- Product and Service cabinet lists rely on Backend `createdAt DESC` ordering so new entries remain visible after hard reload.
- Normal active Items and Services publish immediately; only a matched Item autoban keeps an Item out of public search.

## 2026-07-26 — Native entity creation

- Replaced inline Item and Service creation cards with responsive right-side editors.
- Made the Item deep link a required primary field and kept optional catalog metadata under progressive disclosure.
- Added an address-first, two-step Branch creation workspace with internal map coordinates.
- Rebuilt UniqueOffer creation as a three-step details, publication, and review composer.
- Preserved existing AskBackend contracts and default active behavior.

## 2026-07-24 — Phase 2 domain model alignment: branches, schedules, online business

Aligned frontend with backend Phase 1 domain model changes. Backend renamed `Business.isOnline` → `onlineOnly`, replaced `workingHourStart/End` with `timeZoneId` + `weeklyHours`/`specialHours` ElementCollections, and created `BranchOpeningHoursPolicy` for computed opening state.

### Domain type definitions

- Created `src/shared/api/domainTypes.ts` — centralized domain types replacing inline interfaces across API clients and components: `BusinessScope`, `BranchDto`, `BusinessDto`, `WeeklyOpeningIntervalDto`, `SpecialOpeningIntervalDto`, `BranchOpeningSummaryDto`, `CreateBranchData`, `UpdateBranchData`.
- Updated `askClient.ts` branch functions to use domain types; added `getBusiness()` and `openNow` search filter.

### Branch schedule editors

- Added `weeklyHours` and `specialHours` editors to branch create/edit forms in BusinessPage with full CRUD UI (add row, remove row, dayOfWeek dropdown, time inputs, date picker, closed checkbox).
- `emptyBranchForm()` helper initializes form state with empty `weeklyHours: []` and `specialHours: []`.
- Branch form state uses `timeZoneId` (IANA string) instead of removed `workingHourStart/End`.

### Customer-facing opening state

- ResultsPage renders `openingSummary` from search results — formatted via `Intl.DateTimeFormat` with branch timezone.
- `formatOpeningTime()` and `formatOpeningLabel()` helpers in BusinessPage for branch management display.

### Search openNow filter

- ResultsPage sort rail includes `openNow` toggle (Clock icon) that sends `filters.openNow: true` to search API.

### Seller onboarding onlineOnly flow

- Added `onlineOnly: boolean` to `SellerOnboardingData` type and onboarding API body.
- Added onlineOnly checkbox to step 1 of SellerOnboardingPage with description in all three locales.
- `onlineOnly` flows through to `POST /api/v1/business/onboarding` via `...base` spread.

### OnlineOnly gating in business cabinet

- BusinessPage fetches `getBusiness()` to read `onlineOnly` status; hides Organization sidebar tab for onlineOnly businesses.
- "Add Branch" button shows mode-change confirmation dialog when business is onlineOnly, warning the owner that adding a physical branch is irreversible.
- `handleCreateBranch` catches `BRANCH_NOT_ALLOWED_ONLINE_ONLY` error code and flips local `businessOnlineOnly` state.

### Contract drift cleanup

- Removed stale `business.branch.onlineOnly` i18n keys from en.json and kk.json.
- Added ~25 new i18n keys across ru/en/kk for schedule editors, onlineOnly toggle, confirmation dialog, and opening state labels.

### Docs updated

- `FRONTEND_BACKEND_CONTRACT.md`: added 2026-07-24 section covering business onlineOnly, branch schedule model, search openNow filter, and domain types.
- `CHANGELOG_FOUNDATION_FRONTEND.md`: this entry.

## 2026-07-23 — Catalog persistence, import, branch location, and platform access

- Restored Bearer-authenticated `.xlsx` upload and canonical `ITEM`/`SERVICE` import mapping, preview, and approval.
- Product and Service edit forms now reload and persist categories, attributes, active state, schedule fields, tags, and Item deep links.
- Category inputs load SYSTEM and USER suggestions dynamically and provide an explicit USER-category creation action.
- Branch OWNER and MANAGER forms persist working hours; coordinates remain hidden and are derived from map selection or supported map links.
- Managed-import activation is the seven-day per-Business catalog entitlement. Platform support staff can inspect customer-business support conversations.

## 2026-07-22 — Entity terminology and managed-import contact flow

- Seller onboarding and managed import use entity-backed `BusinessScope` values `ITEM`, `SERVICE`, and `BOTH` across frontend and backend contracts.
- Legal form `NONE` requires at least one valid HTTP(S) verification source before onboarding can continue.
- The managed-import dialog displays only the contact channel and channel-validated contact value; collected sources remain in the request without being shown again.
- Managed-import requests use optional `selectedSourceTypes` and no longer send endpoint-only legal, country, or locale fields.

## 2026-07-18 — Identity and managed-import review fixes

- Protected deep links wait for cookie-session bootstrap before applying route guards.
- Profile forms hydrate from the restored session without overwriting active edits.
- Desktop account navigation opens the shared profile instead of a business-only modal.
- Platform managed-import workspace is limited to catalog products.
- Seller onboarding opens the created managed-import conversation when the backend returns it.
- Legal pages display the active backend document version.
- Test-only files and dependencies added by the previous implementation were removed as requested.

## 2026-07-16 — Organization Page Redesign: Branches + Team, Emil Kowalsky Design

Merged dead `branches`/`employees` sections (not in BusinessSection type, unreachable) into single `organization` section on BusinessPage. Applied Emil Kowalsky editorial-minimalist design: thin-border cards, dot-status indicators, outlined tags, generous whitespace, editorial typography.

- `BusinessPage.tsx`: replaced ~570 lines of unreachable branches + employees JSX with combined organization section
- Branches section: refined card layout with expandable staff panels, dot-status on staff rows
- Team section: clean employee list with outlined role tags, dot-status indicators
- Role gating preserved: Worker sees no organization tab, Manager sees staff + employees without branch CRUD
- Updated FRONTEND_REDESIGN_REFERENCE_STACK.md with Organization Page Design section

## 2026-07-04 — Freshness Audit: Generative UI, Contact Actions, Storefront Builder, Visual Direction

Deep audit of all MD files against the current Ask product direction. Frontend AGENTS.md and ARCHITECTURE_NARRATIVE_FRONTEND.md updated with Generative UI Renderer, Contact Actions, Storefront Builder. Visual style direction corrected from old light/teal to dark graphite/ivory/orange.

### Generative UI Renderer

- Backend returns UI recipe JSON, not arbitrary HTML. Frontend renders only whitelisted components.
- Whitelist: ProductCard, ServiceCard, DropCard, BusinessCandidateCard, SearchSection, SearchResponse.
- Search result sections: exact_products, similar_products, fresh_drops, suitable_storefronts, over_budget, needs_confirmation.
- MatchReasons (max 4 per card) and badges rendered from backend data, never invented by frontend.

### Contact Actions

- Frontend never receives raw phone/username unless backend marks it as PUBLIC visibility.
- contactActionId pattern: frontend receives short-lived token, calls POST /api/v1/contacts/{contactActionId}/resolve.
- Resolve response: actionType (REDIRECT/DISPLAY/DEEP_LINK/CHAT), provider, deepLink/redirectUrl/displayValue.
- Contact actions in search cards: WhatsApp, Telegram, Instagram, 2GIS, phone, website — rendered as distinct per-card actions.
- contactActionId is generated per-search-response, lives 30 minutes, one-time or rate-limited.

### Storefront Builder

- Constrained Canva-like builder, NOT free-form Webflow. Puck (MIT) recommended.
- Block types: Hero, Products, Drops, About, Lookbook, Branches, Contacts, FAQ, Promo, "Why this matches".
- Draft/published flow: owner edits draft, publish copies to published. Customers see only published.
- Storefront rendered from GET /api/v1/businesses/{businessId}/storefront → blocks array with blockType, displayOrder, config.
- Brand color from BrandProfile used as accent in search result cards.

### Visual Direction Fix

- Old: Clean white, teal accent (#0d9b7c). New: Dark graphite (#070807), warm ivory text (#f4eee6), orange accent (#ff5a1f).
- Design tokens added to AGENTS.md: --bg, --panel, --text, --orange.
- Old DESIGN_AND_VISUALS_FRONTEND.md (light/teal) was already deleted; confirmed stale.

### Drops In Search Results

- DropCard component in fresh_drops search section.
- hasActiveDrop badge on product cards when brand has an active drop.
- Drops are type=DROP in Meilisearch, hydrated into DropCard by Search Orchestrator.

### Docs Updated

- Frontend AGENTS.md: added Generative UI Renderer, Contact Actions, Storefront Builder sections.
- ARCHITECTURE_NARRATIVE_FRONTEND.md: added Generative UI Renderer (UI recipe JSON example, whitelist), Contact Actions (contactActionId pattern, BusinessExternalLink), Storefront Builder (Puck, block types, publish flow).

## 2026-07-04 — Session: Full frontend redesign source stack and product register

- Added `C:\MyProjects\Team\Ask\PRODUCT.md` as the root product register expected by the Impeccable design workflow.
- Added `AI_Knowledge/product_ux/FRONTEND_REDESIGN_REFERENCE_STACK.md` as the durable source for the full frontend remake.
- Marked `ASK_FRONTEND_REDESIGN_REWORK_PROMPT.md` as the latest visual/structure brief while preserving `EXPECTED_UX_UI_FLOW_FRONTEND.md`, frontend/backend contracts, and backend task specs as behavioral/API boundaries.
- Recorded current implementation gates: frontend must remain PWA, current Vite config has no PWA plugin, and premium motion/component tooling should be added only when used.
- Marked old `DESIGN_AND_VISUALS_FRONTEND.md` light/teal direction as stale for this remake because the file is deleted in the current working tree and conflicts with the new graphite/ivory/orange redesign prompt.

## 2026-06-25 — Session: Token storage fix, camelCase→snake_case request body fix, City/Category dropdowns, Profile editing, Branch management, Sidebar restructure

### CRITICAL: Snake-case → camelCase conversion fix (was 403 on all authenticated endpoints)

**Root cause:** Backend sends JSON with snake_case keys (`access_token`, `display_name`, `business_id`). Frontend TypeScript types and code use camelCase (`accessToken`, `displayName`, `businessId`). When `persistSession()` called `setStoredToken(session.accessToken)`, the value was `undefined` because the JSON property is `access_token`. `setStoredToken(undefined)` triggered `localStorage.removeItem()` — the JWT token was NEVER stored. All authenticated API requests had no `Authorization` header → Spring Security returned 403.

**Fix:**
- Added `transformKeys()` in `httpClient.ts` — recursively converts snake_case → camelCase on every `apiRequest()` response.
- All direct `fetch()` calls in App.tsx now also apply `transformKeys()` on parsed JSON.
- Import `transformKeys` from httpClient.ts for any new direct fetch calls.
- API_BASE_URL default changed from `http://localhost:8080` to `http://localhost:9090` (matches backend local profile port).

### CRITICAL: camelCase → snake_case request body conversion (was 400 on ALL POST/PATCH/PUT)

**Root cause:** Jackson SNAKE_CASE naming strategy is **bidirectional** — it affects BOTH serialization (Java→JSON) AND deserialization (JSON→Java). Frontend was sending camelCase keys in request bodies (`businessName`, `cityId`, `displayName`, `onlineOnly`, `passwordConfirmation`). Jackson rejected these because it expects snake_case (`business_name`, `city_id`, `display_name`, `online_only`, `password_confirmation`). All POST/PATCH/PUT endpoints with request bodies returned 400 Bad Request.

This silently broke:
- Business registration (including the 400 the user reported when trying to register with city selected)
- Profile update
- Branch create/update
- Product create/update
- Service create/update
- Staff create/update
- Excel import column mapping

Note: authClient.ts functions like `registerCustomer()`/`registerBusiness()` already used snake_case keys manually — these continued working (snake_case keys pass through `camelToSnakeKeys()` unchanged since they contain no uppercase).

**Fix:**
- Added `camelToSnakeKeys()` in `httpClient.ts` — recursively converts camelCase → snake_case on all outgoing request bodies.
- Applied in `apiRequest()` before `JSON.stringify()` — covers all askClient and authClient calls automatically.
- Exported `camelToSnakeKeys` for direct `fetch()` calls in App.tsx.
- Applied to the Excel import mapping endpoint's direct `fetch()` call.

**How to verify:** Register a business via frontend, then go to Profile → Add Branch → fill form with city selected → Create. Should succeed with 201 (or 200) instead of 400.

**How to verify:** After login/verify, check localStorage `"ask.accessToken"` — should contain the hex token string, not `null`/missing.

### Sidebar Restructure (user feedback: "excel import must not be left side bar option")

- **Removed from sidebar:** "Сотрудники" (Staff) and "Импорт" (Excel import) tabs.
- **Excel import → button on Products page header** (right side of manage-header).
- **Staff → accessed through Profile → Branches → click branch row** (not a sidebar tab).
- Sidebar now has exactly 4 items: Активность / Товары / Услуги / Профиль.
- BusinessTab type changed from `"activity" | "products" | "services" | "profile" | "staff" | "import"` to `"activity" | "products" | "services" | "profile"`.

### City as dropdown (user feedback: city must be dropdown not free text)

- City input replaced with API-fetched `<select>` dropdown everywhere:
  - Auth screen (registration — branch city selection)
  - Search page (city filter)
  - Branch add form (BizProfilePage)
- Uses `listCities()` from askClient → `GET /api/v1/cities`.
- Removed `resolveCity()` free-text lookup function.

### Categories as subcategory dropdowns (user feedback: no category pills on search)

- Category pill buttons REMOVED from search page.
- Categories now appear as dropdowns on:
  - Products form — category `<select>` fetched from API (flattened tree).
  - Services form — same pattern.
- Uses `listCategories()` from askClient → `GET /api/v1/categories`.

### Profile editing

- **Client profile (ProfilePage):** Edit button → inline editing mode for displayName and email → Save calls `updateProfile()` → `POST /api/v1/auth/profile`.
- **Business profile (BizProfilePage):** Same pattern — editable business name and email.
- Roles display removed from regular user ProfilePage.

### Branch management

- **BizProfilePage:** Branch list fetched from API via `listBranches()` → `GET /api/v1/businesses/{businessId}/branches`.
- Add branch modal with city dropdown, name, address, onlineOnly toggle.
- Clickable branch rows → navigates to StaffPage for that branch (via `branchIdOverride` prop).
- `createBranch()` and `updateBranch()` in askClient.

### Bug discovered by testing: Verify response shows user as PENDING

- `AuthProcessor.verifyCode()` fetches user DTO BEFORE calling `activateUser()`. The DTO has stale `PENDING` status in the verify response even though the user IS activated in DB. Cosmetic issue only — user is actually active, subsequent `currentSession()` reads fresh ACTIVE status from DB.

### Error handling

- Replaced ~10 hardcoded `showToast()` messages with `showToast(extractError(e))` throughout App.tsx.

### Pending Frontend Work
- Country dropdown + city cascade (country filters city list)
- Excel import button visible when products table is empty (currently header only shows when products.length > 0)
- Branch add form UI improvements
- Import endpoints use direct fetch() — request bodies need snake_case conversion (currently send camelCase)

## 2026-06-22 - Product Excel Import Implementation

Full Product Excel Import flow implemented from scratch: upload, column mapping, preview, and approval. This is the first working feature of the Ask Frontend application.

### Tech Stack Foundation

- **zustand** added for state management (Product slice + Import slice).
- React Context navigation with RouterProvider and useNavigation hook.
- Shared UI components: Button (primary/secondary/danger variants), Modal, Toast, EmptyState.
- Price and date formatting utilities in shared/lib/format.ts.

### Product Import Flow

- **ImportUploadStep**: File upload with hidden HTML input for web, demo dataset button, privacy warning, collapsible recommended column format guide.
- **MappingStep**: Column-to-field mapping table with dropdown target field selector (NAME, CATEGORY_LABEL, DESCRIPTION, SKU, PRICE, TAGS, IGNORE, APPEND_TO_DESCRIPTION, CHARACTERISTIC).
- **PreviewStep**: Preview table before approval with VALID/INVALID/WARNING statuses, error and warning lists, ignored/append/characteristic column summaries.
- **ImportStepper**: Three-step indicator: Upload → Mapping → Preview.

### Smart Column Name Recognition

- 30+ column name variations across 6 target fields (NAME, CATEGORY_LABEL, DESCRIPTION, SKU, PRICE, TAGS).
- Best-match algorithm: prefers longer pattern matches (e.g., "код товара" matches SKU over NAME because "код товара" is longer than "товар").
- Supports Russian and English column names.
- Unmatched columns default to IGNORE.

### Real Excel File Upload

- `xlsx` (SheetJS) library for browser-side Excel parsing.
- Hidden `<input type="file">` for web; parsing happens in-memory via `file.arrayBuffer()`.
- Supports `.xlsx` and `.xls` formats.

### Privacy Warning And Import Guide

- Privacy warning: users are reminded to only include customer-facing data, not internal business data (stock, suppliers, margins, purchase prices).
- Collapsible recommended format guide: shows ideal column names with examples in Russian and English.

### Product Dashboard

- **BusinessProductsPage**: Product table with search across name, category, description, SKU, tags, and characteristics.
- **ProductTable/ProductRow**: Product listing with enable/disable toggle, edit modal, delete action.
- **ProductEditModal**: Edit product form with all fields.
- Search excludes ignored columns — values not imported are not searchable.

### NativeWind CSS Fix For Web

- `nativewind/babel` must be a preset (not plugin) in babel.config.js.
- `nativewind/preset` required in tailwind.config.js.
- `global.css` with Tailwind directives must be imported in the app entry point (src/core/index.tsx) for NativeWind to inject CSS on web.
- Added `src/types/css.d.ts` for TypeScript CSS module declaration.

### Files Created (25 new files)

src/app/store.ts, src/shared/ui/{Button,Modal,Toast,EmptyState}.tsx, src/shared/lib/{navigation,format}.tsx, src/entities/product/model/types.ts, src/entities/product/ui/{ProductTable,ProductRow,ProductEditModal}.tsx, src/features/product-import/model/{types,defaults,mappers}.ts, src/features/product-import/api/mock-api.ts, src/features/product-import/ui/{ImportStepper,ImportUploadStep,MappingStep,MappingFieldDropdown,PreviewStep,ProductSearchInput}.tsx, src/pages/{BusinessProductsPage,ProductImportPage}.tsx, src/types/css.d.ts

## 2026-06-22 - Role Simplification: Owner/Staff Only

Removed MANAGER and OPERATOR roles from all frontend documentation. Business roles are now only OWNER and STAFF.

- Owner manages businesses/branches and creates Staff. Staff works inside assigned branch workspace.
- Staff management (EXPECTED_UX_UI_FLOW.md section 24): removed role picker; all staff created as STAFF.
- Entry point table: Manager/Operator → Staff.
- Unified login: removed manager/operator from role list.
- Non-negotiable rules updated: Staff never self-register, created by Owner only.
- Staff does not manage other accounts, branches, or business settings.
- Authority table: only ROLE_BUSINESS_OWNER and ROLE_BUSINESS_STAFF.

## 2026-06-22 - Automatic Supplier Check Search Flow

Updated product search UX direction:

- One submitted search query has one locked scope: `Товары` or `Услуги`.
- Product result screen uses search-session tabs: `Найденное`, `Подходящие магазины`, `Чаты`.
- `Найденное` contains exact catalog results, similar products, and known analogs.
- `Подходящие магазины` contains automatically selected business/branch candidates, dispatch state, and supplier responses.
- The customer no longer manually presses `Создать запрос` as the main fallback path.
- Ask automatically sends a supplier check/request to suitable stores after search submit when candidates exist.
- Auto-generated supplier check is visible to business as an incoming Activity/request item, but is not visible to the customer as an outgoing chat message.
- `Чаты` appears only after a real business/customer conversation starts.

## 2026-06-21 - Auth and Staff Management Model Update

Updated `EXPECTED_UX_UI_FLOW.md` and `FRONTEND_BACKEND_CONTRACT.md` to align with the refined backend auth and staff management model:

- Replaced mock-based auth flow with three distinct entry points: customer self-registration, business owner self-registration, and staff activation (via unified login).
- Added unified login (`/auth/login`) for all roles with `activationRequired` flag and password change flow.
- Added staff management section (Business Cabinet section 24): staff creation by owner, staff card views before/after activation, temporary password visibility rules, password reset, staff status lifecycle.
- Added invite code management as secondary path.
- Updated supplier response statuses: product (HAS_ITEM, NO_ITEM, NEED_CLARIFICATION, HAS_ANALOG) and service (CAN_PROVIDE, CANNOT_PROVIDE, NEED_CLARIFICATION, SUGGEST_OTHER_TIME).
- Added authority strings, error response format, and staff status/role tables to frontend-backend contract.
- Updated non-negotiable rules (42 total): staff never self-register, activation session TTL 5 min, temp password hidden after activation.

## 2026-06-19 - Documentation Structure Cleanup

Moved first-session guidance into `AI_Knowledge/first_steps`, moved product UX architecture into `AI_Knowledge/product_ux`, copied the full UX/UI flow into `AI_Knowledge/product_ux/UX_UI_FULL_FLOW.md`, and added `AI_Knowledge/client_contracts/FRONTEND_BACKEND_CONTRACT.md` for frontend-facing backend contract expectations.

Added root `AGENTS.md` as the short agent entrypoint and task router. Kept frontend rules intentionally lightweight because this repository does not yet define a real frontend stack or code structure.

Moved Codex plugin and MCP expectations into `codex/CODEX_INFRASTRUCTURE.md` and removed old project-local skill, audit, origin, deprecated web-staging, and playbook docs that were not useful for new frontend programmers.

## 2026-06-18 - Search-First Strategy Actualization

Updated the frontend strategy:

- Ask Frontend now treats customer discovery as local search first.
- The UI should show known products/services before request creation when backend data exists, with businesses shown as providers/context for those results.
- If exact data is missing, stale, or uncertain, the UI can guide the customer into a fallback request.
- Catalog-backed search, result confidence, service discovery, and API-backed Excel/CSV import UX are core product directions.
- Frontend still must not own backend source-of-truth, search indexing, ranking truth, catalog normalization, or availability facts.

## 2026-06-17 - Goal Actualization

Updated the frontend product architecture idea:

- Android, iOS, and web should use one AskBackend.
- Backend communication should live behind a shared design-independent client/API abstraction where possible.
- Feature-Sliced Design is the intended frontend architecture style when real app code exists.
- Platform UI can differ, but heavy request, catalog, service, and availability logic should not be duplicated separately in each UI.
- Product catalog UX should account for Excel and CSV import flows backed by backend contracts.
- Service-provider administration is expected to fit a web cabinet better than mobile-only screens for larger service data, schedules, discounts, conditions, specialists, and branches.

## 2026-06-27 - Branch City Loading And Error Categorization

- Business profile branch management now loads cities independently from branch list loading, so a branch-list failure no longer leaves the add-branch city dropdown empty.
- Add-branch city dropdown is disabled when reference cities are unavailable instead of silently showing an empty selectable dropdown.
- Frontend error handling now maps backend `errorCode` values such as `INVALID_CREDENTIALS`, `VALIDATION_ERROR`, `ACCESS_DENIED`, and `CITY_NOT_FOUND` to user-facing messages.
- Login with a missing or wrong account should show invalid credentials instead of a generic server error when backend returns the shared `ErrorResponse` contract.

## 2026-07-18 - Unified Chat, Platform Workspace, Compliance UI

Completed the frontend part of the identity/onboarding/managed-import/compliance spec:

- ChatsPage now lists real chat conversations (GENERAL_SUPPORT / MANAGED_IMPORT) with statuses (PENDING / IN_CHAT / CLOSED), unread counts, an inline thread with sender badges, file upload, and a `?conversation=` URL parameter for cross-page navigation.
- PlatformPage replaced static cards with permission-gated functional sections: managed imports, support conversations (list + thread + close via platform chat endpoints), platform users CRUD with role/permission editing, and moderation (open reports with resolve/reject, hide product, suspend/ban business).
- BusinessPage shows a catalog setup deadline banner (remaining days for IN_PROGRESS, restricted warning for RESTRICTED) with a complete-setup action for owner/manager/platform.
- New `ReportDialog` widget (reason code + details) wired into chat messages (MESSAGE), ProductPage (PRODUCT), and CompanyCard (BUSINESS); reports POST to `/api/v1/reports`.
- `uploadChatFile` now sends the required `conversationId` form field; ChatPanel and CompanyCard auto-start a conversation before uploading so files are never orphaned.
- New API clients: `platformClient.ts` (platform chat, users, reports, moderation) and `reportClient.ts`.
- i18n: added platform/support/users/moderation/report/conversation/catalog-setup keys to en/ru/kk; removed 78 dead `cardBuilder.*` keys from ru; fixed kk duplicate `time.*` keys and added missing plural forms (kk `_one/_other`, ru `_other`).

## 2026-07-18 - Frontend Test Infrastructure (spec section 26)

- Added vitest + @testing-library/react + jest-dom + user-event + jsdom; `npm test` runs `vitest run`; config in `vitest.config.ts`, shared setup in `src/test/setup.ts` (jsdom polyfills, en locale, cleanup).
- `Navigation.test.tsx`: common navigation identical for customer/business/platform users, conditional business and platform cabinet links, no global role switcher, hidden for unauthenticated visitors.
- `BusinessInvitationModal.test.tsx`: pending invitation rendering (business/role/inviter), accept calls API + refreshes session, decline calls API without session refresh, nothing rendered without invitations.
- `SellerOnboardingPage.test.tsx`: wizard renders for authenticated (existing) users, unauthenticated (new) users are redirected to auth first, no country selector rendered while submit defaults `countryCode: "KZ"`, full wizard walk lands in the business cabinet.
- `ProfilePage.test.tsx`: multiple business selector lists every membership; clicking one calls `selectBusiness` and opens that business cabinet.
## 2026-07-19 — OAuth bridge, scoped import, and cabinet usability

- OAuth callback exchanges `ASK_SESSION` for a signed Bearer token, stores it in session storage, and later API calls omit cookies.
- Existing business members no longer see create-business or duplicate storefront actions in the account screen.
- Removed the homepage mouse-hover tile canvas.
- Product, service, and unique-offer quick actions now open their create surface; the empty-product form renders correctly.
- Seller onboarding asks PRODUCTS, SERVICES, or BOTH before manual setup versus managed import.
- Product and service cabinet tabs open a scoped managed-import request with benefits, price state, sources, contact details, and legal acceptance.
- Kept the graphite, ivory, and orange palette while tightening typography, card motion, forms, responsive onboarding, and modal hierarchy.

## 2026-07-26 — Wanted-reference frontend redesign

- Rebuilt the customer home, search results, chats, public business profile, auth, and business cabinet around the approved warm ivory/orange reference layout.
- Added a token-driven graphite dark theme with identical information architecture and component behavior; light mode is now the default.
- Removed the oversized latest-request dashboard card and unsupported search/profile claims.
- Search now submits canonical `ITEM` or `SERVICE` mode, real backend filters, relevance sorting by default, and renders only fields returned by search cards.
- Customer and business chat surfaces now use the unified conversation APIs without unsupported status mutations or legacy request panels.
- Business profile editing now uses the real profile API and multipart logo/cover upload endpoints.
- Product and service attributes use guided key/value controls instead of exposed JSON.
- Corrected item and branch update routes to `/api/v1/items/{itemId}` and `/api/v1/branches/{branchId}`.
# 2026-07-27 — Business profile and durable catalog creation

- Added a dedicated Business profile cabinet surface and public-profile navigation keyed by `businessId`, separate from the personal `AppUser` profile.
- Item and Service creation now renders the committed create response immediately instead of discarding it and relying on a silently failing list refresh.
- Successful empty API responses no longer trigger JSON parse failures when a chat is marked as read.
- Search context is retained across internal navigation until the customer focuses the search field to start a new query.
- Result, Item, Service, and public Business profile chat actions now open the shared right-side drawer; the full `Чаты` screen remains unchanged.
- Enlarged the home search field, removed its enclosing square surface, and moved the Business profile into a dedicated bottom sidebar card.
