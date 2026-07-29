# Platform Cabinet Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the five-section Ask platform cabinet with entity-owned moderation, severity counters, managed-import chat workflow, account sanctions, and role-safe team administration.

**Architecture:** Extend the existing platform API client and permission-gated backend contracts, then replace the current admin widgets with one shared platform shell and focused section workspaces. Keep canonical entity terms and existing managed-import/chat locks; moderation events remain backend-authored and are rendered in the owning section.

**Tech Stack:** React 19, TypeScript, Vite, React Router, i18next, lucide-react, Spring Boot 3, Java 17, PostgreSQL.

## Global Constraints

- Primary navigation contains exactly `Сводка`, `Бизнесы`, `Чаты`, `Аккаунты`, and `Команда Ask`.
- Normal active Items and Services publish immediately; only suspicious autocheck results create moderation events.
- Yellow means review required and red means critical; the backend supplies severity.
- Authorization uses platform permission sets, never role-name checks.
- Managed-import access is assigned per platform member and Business for exactly seven days and canonical scope `ITEM`, `SERVICE`, or `BOTH`.
- `MANAGE_SUPPORT_CHATS` covers `GENERAL_SUPPORT` and `PLATFORM_SUPPORT`; `MANAGED_IMPORT` additionally requires assignment and an active grant.
- Preserve unrelated dirty-worktree changes.
- Do not commit or push.

---

### Task 1: Stabilize platform moderation contracts

**Files:**
- Modify: `AskBackend/AI_Knowledge/features/platform/README.md`
- Modify: `AskBackend/AI_Knowledge/features/platform/contracts.md`
- Modify: `AskBackend/AI_Knowledge/features/platform/flow.md`
- Modify: `AskBackend/AI_Knowledge/features/messaging/README.md`
- Modify: `AskBackend/AI_Knowledge/features/messaging/contracts.md`
- Modify: `AskFrontend/AI_Knowledge/client_contracts/FRONTEND_BACKEND_CONTRACT_FRONTEND.md`
- Modify: `AskFrontend/AI_Knowledge/CHANGELOG_FOUNDATION_FRONTEND.md`

**Interfaces:**
- Produces: documented severity `REVIEW|CRITICAL`, five-section navigation, entity-owned moderation, and the role-default sanction matrix.

- [ ] Update the platform documents so normal catalog publication and autocheck escalation are unambiguous.
- [ ] Document chat-tab access and managed-import assignment boundaries.
- [ ] Document reversible block versus soft deletion for catalog, Business, and AppUser targets.
- [ ] Scan the changed documents for contradictory publication or role rules.

### Task 2: Add frontend platform domain model and API operations

**Files:**
- Modify: `AskFrontend/src/shared/api/platformClient.ts`
- Create: `AskFrontend/src/widgets/PlatformShell/platformTypes.ts`
- Test: `AskFrontend/tests/platform-navigation.test.mjs`

**Interfaces:**
- Produces: `PlatformSection`, `PlatformEventCounts`, `PlatformRiskSeverity`, sanction request helpers, account list helpers, and filtered conversation helpers.

- [ ] Add a test asserting the exact five-section navigation contract and three chat tabs.
- [ ] Run the focused test and confirm it fails before implementation.
- [ ] Add canonical frontend types without `PRODUCTS` or `SERVICES` aliases.
- [ ] Add API methods for moderation actions, platform-account listing, account sanctions, platform-member deletion, and severity counts using existing endpoints where available.
- [ ] Run the focused test and confirm it passes.

### Task 3: Build the new platform shell

**Files:**
- Create: `AskFrontend/src/widgets/PlatformShell/PlatformShell.tsx`
- Create: `AskFrontend/src/widgets/PlatformShell/PlatformShell.css`
- Modify: `AskFrontend/src/pages/PlatformPage/PlatformPage.tsx`
- Modify: `AskFrontend/src/shared/i18n/locales/ru.json`
- Modify: `AskFrontend/src/shared/i18n/locales/en.json`
- Modify: `AskFrontend/src/shared/i18n/locales/kk.json`

**Interfaces:**
- Consumes: `PlatformSection`, `PlatformEventCounts`.
- Produces: responsive permission-aware shell with yellow and red navigation counters.

- [ ] Replace the old seven-section local state with the exact five-section model.
- [ ] Implement compact desktop navigation and mobile top navigation.
- [ ] Render separate yellow and red unresolved-event counters without counting ordinary unread messages.
- [ ] Preserve logout, current-member identity, focus visibility, and light/dark tokens.
- [ ] Remove the old AdminLayout dependency from PlatformPage.

### Task 4: Rebuild Summary

**Files:**
- Rewrite: `AskFrontend/src/widgets/AdminDashboard/AdminDashboard.tsx`
- Create: `AskFrontend/src/widgets/AdminDashboard/AdminDashboard.css`

**Interfaces:**
- Consumes: dashboard response, event counts, active managed-import grants.
- Produces: actionable summary shortcuts through `onNavigate(section, filter)`.

- [ ] Replace vanity metric cards with severity lanes, active import work, sanctions, and recent decisions.
- [ ] Add shortcuts that open the owning section with the correct filter.
- [ ] Implement loading, empty, and failed-request states.
- [ ] Keep the layout readable from 360 px through wide desktop.

### Task 5: Rebuild Businesses and catalog moderation

**Files:**
- Rewrite: `AskFrontend/src/widgets/AdminBusinesses/AdminBusinesses.tsx`
- Rewrite: `AskFrontend/src/widgets/AdminBusinessDetail/AdminBusinessDetail.tsx`
- Create: `AskFrontend/src/widgets/AdminBusinesses/AdminBusinesses.css`
- Create: `AskFrontend/src/widgets/PlatformSanctionDialog/PlatformSanctionDialog.tsx`

**Interfaces:**
- Consumes: Business list/detail, Item/Service lists, generic moderation action helper.
- Produces: searchable Business workspace with `ITEM|SERVICE` catalog tabs and role-safe block, restore, and soft-delete operations.

- [ ] Add Business search, status, and severity filters.
- [ ] Build Business detail as identity summary plus branches, members, Items, and Services.
- [ ] Add reversible search block and restore for Items and Services.
- [ ] Add Business block and restore for administrators.
- [ ] Add soft deletion only when the required permission is present.
- [ ] Require a reason and explicit confirmation for every sanction mutation.
- [ ] Refresh the list, detail, and shell counters after each success.

### Task 6: Unify Chats into three tabs

**Files:**
- Rewrite: `AskFrontend/src/widgets/AdminSupport/AdminSupport.tsx`
- Create: `AskFrontend/src/widgets/AdminSupport/AdminSupport.css`
- Integrate existing: `AskFrontend/src/widgets/AdminManagedImports/AdminManagedImports.tsx`

**Interfaces:**
- Consumes: platform conversation APIs and moderation target `MESSAGE`.
- Produces: `PLATFORM_SUPPORT`, `MANAGED_IMPORT`, and `GENERAL_SUPPORT` tabs with severity filters.

- [ ] Add the exact tabs `Поддержка`, `Помощь с импортом`, and `Обычные`.
- [ ] Filter conversations by canonical `conversationType`.
- [ ] Render the desktop list/thread/context split and mobile list-to-thread drill-down.
- [ ] Display violation severity and allow authorized message block, restore, and resolution.
- [ ] Preserve managed-import privacy by relying on the backend-filtered conversation list.
- [ ] Place `Начать работу`, assignee, scope, and seven-day remaining time in the import tab.

### Task 7: Build Accounts and Ask Team

**Files:**
- Create: `AskFrontend/src/widgets/AdminAccounts/AdminAccounts.tsx`
- Create: `AskFrontend/src/widgets/AdminAccounts/AdminAccounts.css`
- Rewrite: `AskFrontend/src/widgets/AdminUsers/AdminUsers.tsx`
- Create: `AskFrontend/src/widgets/AdminUsers/AdminUsers.css`

**Interfaces:**
- Consumes: platform AppUser list/sanction operations and platform-membership operations.
- Produces: account blocking/restoration/deletion and team administration.

- [ ] Add account search and status filters.
- [ ] Add administrator block/restore and super-administrator soft-delete affordances based on permissions.
- [ ] Preserve backend ownership-transfer errors without client-side bypasses.
- [ ] Rebuild team list and editor around explicit permissions.
- [ ] Add platform-member deactivate and soft-delete confirmations.
- [ ] Hide self-delete and last-super-admin paths according to backend responses.

### Task 8: Remove obsolete platform surfaces and verify

**Files:**
- Modify: `AskFrontend/src/pages/PlatformPage/PlatformPage.tsx`
- Delete only if unreferenced: `AskFrontend/src/widgets/AdminLayout/AdminLayout.tsx`
- Delete only if unreferenced: `AskFrontend/src/widgets/AdminLayout/AdminLayout.css`
- Delete only if unreferenced: `AskFrontend/src/widgets/AdminModeration/AdminModeration.tsx`
- Delete only if unreferenced: `AskFrontend/src/widgets/AdminRequests/AdminRequests.tsx`

**Interfaces:**
- Consumes: all five completed section widgets.
- Produces: one reachable, responsive platform cabinet with no unused platform code.

- [ ] Search all imports before removing obsolete widgets.
- [ ] Run `npm run test`.
- [ ] Run `npm run build`.
- [ ] Start the local frontend and capture desktop and mobile screenshots of every primary section.
- [ ] Check keyboard focus, overflow, empty states, destructive confirmations, and reduced motion.
- [ ] Run `git diff --check` in AskFrontend and AskBackend.
- [ ] Review both diffs to confirm unrelated dirty changes were preserved.

### Task 9: Keep ordinary customer-business chats read-only

- [ ] Do not render reply or close controls for `GENERAL_SUPPORT` conversations in the platform cabinet.
- [ ] Allow platform staff to inspect the full history and moderate reported Messages.
- [ ] Keep sending available only in `PLATFORM_SUPPORT` and authorized `MANAGED_IMPORT` conversations.

### Task 10: Complete platform catalog moderation entry points

- [ ] Move the platform cabinet link from the account menu to primary navigation next to Chats.
- [ ] Add block and superadmin soft-delete controls for every Item, Service, and Drop row.
- [ ] Apply word-aware automated detection to Item, Service, and UniqueOffer content while preserving immediate publication for clear content.

### Task 11: Make chat authors and receipts visually scannable

- [ ] Use distinct message colors for customer, Business, and platform senders in platform chat moderation.
- [ ] Show sent/read state as single-check and double-check icons in ordinary customer-Business chats.
- [ ] Change receipt icon color after `readAt` is set and keep the text available through an accessible label.
