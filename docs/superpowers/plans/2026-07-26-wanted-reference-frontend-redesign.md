# Wanted Reference Frontend Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a complete light/dark AskFrontend whose primary desktop layouts match the five wanted screenshots while every visible fact and action remains backed by AskBackend.

**Architecture:** Replace page-local styling with semantic theme tokens and focused layout components. Align the API client to current Backend DTOs, then rebuild customer search, results, chat, storefront, and business cabinet on those shared primitives without restoring retired request flows.

**Tech Stack:** React, TypeScript, Vite, React Router, i18next, lucide-react, Framer Motion, CSS custom properties.

## Global Constraints

- Preserve all pre-existing worktree changes.
- Do not run automated tests; the user will verify interactively.
- Do not commit or push.
- Use only `ITEM`, `SERVICE`, and `BOTH` canonical business terminology.
- Do not invent stock, delivery, ratings, verification, response time, nearby businesses, or operational facts.
- Keep light and dark themes structurally identical.
- Preserve protected business-card canvas behavior and persistence.

---

### Task 1: Shared visual foundation and shell

**Files:**
- Modify: `src/design-system/tokens.css`
- Modify: `src/design-system/typography.css`
- Modify: `src/design-system/surfaces.css`
- Modify: `src/design-system/layout.css`
- Modify: `src/design-system/interaction.css`
- Modify: `src/app/styles.css`
- Modify: `src/shared/ui/Navigation/Navigation.tsx`

**Interfaces:**
- Produces semantic theme tokens and shared `ask-*` layout classes consumed by all later tasks.
- Preserves existing `fcw-*` classes for untouched screens during migration.

- [ ] Replace dark-only token assumptions with wanted-reference light tokens and equivalent dark values.
- [ ] Add shared shell, navigation pill, surface, button, input, status, list, responsive panel, skeleton, empty, and error styles.
- [ ] Rebuild desktop navigation into the wanted centered segmented navigation with city/account controls.
- [ ] Preserve accessible mobile top and bottom navigation.

### Task 2: Current Backend search and chat contracts

**Files:**
- Modify: `src/shared/api/dto.ts`
- Modify: `src/shared/api/askClient.ts`
- Modify: `src/entities/search-result/model.ts`
- Modify: `src/shared/api/mappers.ts`

**Interfaces:**
- Produces `SearchMode = "ITEM" | "SERVICE"`, current explicit filter request types, current search-card response types, and existing chat DTOs.
- Removes active UI dependencies on retired request and notification calls.

- [ ] Replace stale search scope, overrides, selected category, language, and compatibility values.
- [ ] Send `rawQuery`, `mode`, `explicitFilters`, `userLocation`, `locale`, `sort`, `page`, and `pageSize`.
- [ ] Model compact and detail result data exposed by current SearchCard responses.
- [ ] Verify chat paths against Backend controllers and update only where the controller differs from stale frontend calls.

### Task 3: Customer home and authentication

**Files:**
- Modify: `src/pages/HomePage/HomePage.tsx`
- Modify: `src/pages/AuthPage/AuthPage.tsx`
- Modify: `src/shared/ui/SearchBar/SearchBar.tsx`
- Modify: `src/shared/ui/SegmentedControl/SegmentedControl.tsx`
- Modify: `src/shared/ui/CitySelector/CitySelector.tsx`
- Modify: `src/shared/i18n/locales/ru.json`
- Modify: `src/shared/i18n/locales/kk.json`
- Modify: `src/shared/i18n/locales/en.json`

**Interfaces:**
- Home navigates with `mode=ITEM|SERVICE`, raw query, and selected city.
- Authentication keeps existing AuthProvider calls and session behavior.

- [ ] Rebuild home to wanted screenshot 4 with mode above query and a clear orange search action.
- [ ] Omit unsupported nearby-Business cards.
- [ ] Rebuild login and registration into compact branded panels with complete field states.
- [ ] Keep long labels and all locales resilient.

### Task 4: Search results and business detail

**Files:**
- Modify: `src/pages/ResultsPage/ResultsPage.tsx`
- Modify: `src/shared/ui/ResultCard/ResultCard.tsx`
- Modify: `src/widgets/CompanyCard/CompanyCard.tsx`
- Modify: `src/shared/ui/EmptyState/EmptyState.tsx`
- Modify: `src/shared/ui/Loading/Loading.tsx`

**Interfaces:**
- Consumes current search request and response types from Task 2.
- Result row chat action uses `businessId`; row selection opens details without creating chat.

- [ ] Build the wanted three-column desktop results workspace.
- [ ] Render only category, city/country, price, open-now, radius, and supported sorts.
- [ ] Keep relevance as default and preserve raw query.
- [ ] Render compact Item/Service rows with match reasons and available branch facts.
- [ ] Render selected details in the right rail and mobile sheet.
- [ ] Replace spinner-only and raw error states with skeletons, useful empty states, and retry.

### Task 5: Customer and business chat workspace

**Files:**
- Modify: `src/pages/ChatsPage/ChatsPage.tsx`
- Modify: `src/widgets/ChatPanel/ChatPanel.tsx`
- Modify: `src/widgets/ChatPanel/ChatContext.tsx`
- Modify: `src/pages/BusinessPage/BusinessPage.tsx`

**Interfaces:**
- Consumes `ChatConversationDto`, `ChatMessageDto`, customer chat methods, and business chat methods.
- Renders `PENDING`, `IN_CHAT`, and `CLOSED` status filters.

- [ ] Build wanted left-list, center-thread, right-context desktop layout.
- [ ] Remove request-detail surfaces from chat.
- [ ] Show real unread counts, message times, subject, customer/Business identity, and attachments.
- [ ] Render external contact actions only from public profile or opaque contact actions.
- [ ] Implement separate list and thread mobile views.

### Task 6: Public storefront

**Files:**
- Modify: `src/pages/StorefrontPage/StorefrontPage.tsx`
- Modify: `src/pages/ProductPage/ProductPage.tsx`
- Modify: `src/widgets/StorefrontEditor/StorefrontEditor.tsx` only where shared presentation requires it.

**Interfaces:**
- Consumes current Business profile, published business-card data, and available storefront blocks.
- Leaves BusinessCardBuilder canvas behavior unchanged.

- [ ] Build wanted business hero, cover, contact rail, branch facts, and published content sections.
- [ ] Hide empty optional content instead of generating placeholder facts.
- [ ] Preserve Ask chat as an explicit authenticated action.
- [ ] Collapse contact rail and content tabs correctly on mobile.

### Task 7: Business overview and cabinet sections

**Files:**
- Modify: `src/pages/BusinessPage/BusinessPage.tsx`
- Modify: `src/pages/BusinessPage/ProductsTab.tsx`
- Modify: `src/pages/BusinessPage/ServicesTab.tsx`
- Modify: `src/pages/BusinessPage/types.ts`
- Modify: `src/widgets/ProductImportWizard/ProductImportWizard.tsx`
- Modify: `src/widgets/MapLocationPicker/MapLocationPicker.tsx`

**Interfaces:**
- Overview metrics derive from loaded Items, Services, and conversations.
- Catalog tabs retain current CRUD API methods and category IDs.

- [ ] Rebuild sidebar and business header to wanted screenshot 1.
- [ ] Add real Item, Service, and conversation metrics.
- [ ] Omit the large latest-request card.
- [ ] Render recent conversations as a compact inbox table.
- [ ] Convert Items and Services to list-first management with focused create/edit panels.
- [ ] Replace raw attributes JSON input with guided key/value fields.
- [ ] Restyle import, branch, schedule, and staff flows without changing their contracts.

### Task 8: Remaining application surfaces and documentation

**Files:**
- Modify: `src/pages/ProfilePage/ProfilePage.tsx`
- Modify: `src/pages/SellerOnboardingPage/SellerOnboardingPage.tsx`
- Modify: `src/pages/PlatformPage/PlatformPage.tsx`
- Modify: relevant widgets under `src/widgets/Admin*`
- Modify: `AI_Knowledge/product_ux/DESIGN_AND_VISUALS_FRONTEND.md` if present, otherwise `AI_Knowledge/product_ux/FRONTEND_REDESIGN_REFERENCE_STACK.md`
- Modify: `AI_Knowledge/CHANGELOG_FOUNDATION_FRONTEND.md`
- Modify: `AGENTS.md`

**Interfaces:**
- All routes consume the same shared visual foundation from Task 1.

- [ ] Apply the shared shell and form vocabulary to profile, onboarding, platform, support, legal, imports, and admin screens.
- [ ] Ensure raw server JSON is converted to readable error copy.
- [ ] Document the approved dual-theme wanted-reference direction and Backend-truth rule.
- [ ] Inspect the final diff for unrelated overwrite, conflict markers, placeholder code, and accidental retired-request usage without running tests.
