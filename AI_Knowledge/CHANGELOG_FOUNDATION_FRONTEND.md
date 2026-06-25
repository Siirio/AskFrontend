# Ask Frontend AI Knowledge Changelog

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
