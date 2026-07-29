# Platform Cabinet Redesign

## Goal

Replace the existing fragmented platform cabinet with a calm, coherent operational interface for super administrators, administrators, and moderators.

## Information architecture

The cabinet contains exactly five primary sections:

1. `Сводка`
2. `Бизнесы`
3. `Чаты`
4. `Аккаунты`
5. `Команда Ask`

Moderation is embedded into the section that owns the affected entity instead of being a separate primary section.

## Navigation and event indicators

Each primary navigation item may show unresolved moderation-event counts:

- yellow means review is required;
- red means a critical event requires immediate attention;
- yellow and red counters may appear together;
- counters represent moderation events, not ordinary unread messages.

The backend is authoritative for event severity. The frontend never derives severity from text.

## Catalog publication and moderation

All normal active Items and Services publish immediately for every Business, including a Business without an IP or TOO legal form.

The automated safety check does not place every catalog mutation into the moderation queue. It creates a moderation event only when it identifies suspicious content.

The `Бизнесы` section exposes every Business and its complete Item and Service catalog. Authorized platform members can:

- remove an Item or Service from search with a reversible block;
- restore a blocked Item or Service;
- soft-delete an Item or Service;
- block a Business from the platform;
- restore a blocked Business;
- soft-delete a Business.

Role defaults:

- moderators review events and block or restore Items and Services;
- administrators may additionally block or restore Businesses and AppUser accounts;
- super administrators may additionally soft-delete Businesses, AppUser accounts, Items, and Services and manage the Ask team.

Runtime authorization continues to use explicit permission sets rather than role-name checks.

## Business workspace

`Бизнесы` is a searchable list with status and unresolved-risk indicators. Opening a Business displays:

- identity and operational summary;
- active platform sanctions;
- branches and members;
- Item and Service tabs with search, status filters, and actions;
- destructive actions behind an explicit reason and confirmation dialog.

The platform member does not receive arbitrary catalog editing access from this page. Item and Service creation remains available only through an assigned active managed-import grant.

## Chats

`Чаты` contains three tabs:

- `Поддержка` for `PLATFORM_SUPPORT`;
- `Помощь с импортом` for `MANAGED_IMPORT`;
- `Обычные` for customer-to-Business `GENERAL_SUPPORT`.

Chat moderation events are surfaced as yellow or red counters and filters. Message actions operate on the canonical `MESSAGE` moderation target.

Privacy and access remain locked:

- `MANAGE_SUPPORT_CHATS` permits inspection of `GENERAL_SUPPORT` and `PLATFORM_SUPPORT`;
- `MANAGED_IMPORT` requires `MANAGE_MANAGED_IMPORTS`, assignment to that request, and an unexpired grant;
- managed-import attachments remain conversation-scoped.

The split-pane desktop layout contains conversation list, thread, and context/actions. Mobile uses a list-to-thread drill-down.

## Managed import

Pending managed-import requests live in the `Помощь с импортом` chat tab.

`Начать работу` atomically assigns the request to the current platform member and immediately opens:

- the managed-import conversation;
- the Business-scoped Item/Service workspace;
- the matching `ITEM`, `SERVICE`, or `BOTH` scope;
- an exact seven-day access window.

The UI shows the assignee, scope, start time, expiration time, and remaining time. No global catalog-edit permission is introduced.

## Accounts

`Аккаунты` lists customer and Business-associated AppUser accounts. It supports search and status filters.

Administrators can block and restore accounts. Super administrators can additionally soft-delete accounts. Soft deletion anonymizes personal data, revokes sessions, and preserves required audit history. Existing ownership-transfer constraints remain authoritative.

## Ask team

`Команда Ask` lists platform memberships, roles, statuses, and permissions.

Super administrators can add, edit, deactivate, and soft-delete platform members subject to the existing protections against self-deletion and deletion of the last active super administrator.

## Summary

`Сводка` prioritizes actionable operational truth:

- unresolved yellow and red events by owning section;
- active managed-import work and expiring grants;
- blocked Businesses, Items, Services, and accounts;
- recent moderation decisions;
- shortcuts into already-filtered sections.

It does not use decorative vanity metrics or duplicate the detailed lists.

## Visual system

The cabinet uses the approved Ask Inter-based light/dark design tokens while taking a denser, more neutral operational register than the customer experience.

- restrained surfaces with orange reserved for navigation and primary actions;
- yellow and red used only for event severity and sanctions;
- compact tables and split panes instead of repeated card grids;
- 12–16 px maximum radii for structural surfaces;
- responsive behavior from full desktop workspace to mobile drill-down;
- visible focus states, semantic buttons, sufficient contrast, and reduced-motion support.

## Error and safety behavior

Every mutation:

- requires a reason where moderation or deletion is involved;
- disables repeated submission while pending;
- reports backend validation and authorization errors;
- refreshes the affected list and counters after success;
- uses an explicit confirmation for soft deletion and Business/account blocking.

## Verification

- frontend TypeScript build;
- frontend tests;
- desktop and mobile browser verification;
- responsive overflow and focus checks;
- `git diff --check`;
- backend compilation is not run unless the user explicitly requests a backend build, per repository rules.

