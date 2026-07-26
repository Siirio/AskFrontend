# AskFrontend Wanted Reference Redesign

## Goal

Rebuild AskFrontend into a complete production frontend that follows the first five supplied screenshots in composition, density, spacing, component hierarchy, warm light styling, and controlled orange accent. The same component structure must support a dark theme through theme tokens.

The frontend must consume the current AskBackend contracts. Reference-only facts or actions must not be invented.

## Source of truth

Priority order for this redesign:

1. The user's current instructions.
2. AskBackend API contracts and locks for data and allowed behavior.
3. AskFrontend product documentation and locks that do not conflict with this approved visual change.
4. Existing code only as a reusable implementation pattern.

The previously documented dark-only visual direction is replaced by two equivalent themes:

- light: the supplied wanted references;
- dark: the same layouts, hierarchy, and interactions with dark semantic tokens.

## Scope

The redesign covers the complete user-facing and business-facing AskFrontend:

- application shell and navigation;
- authentication;
- customer home and search;
- search results and details;
- customer and business chats;
- public business storefront;
- business overview;
- Items and Services management;
- Unique Offers;
- business card editor shell;
- branches and staff;
- import workflows;
- profile, settings, support, legal, loading, empty, and error states;
- platform screens through the same shared design system.

The work preserves all existing user changes in the dirty worktree and does not commit.

## Design system

### Visual language

- Warm white background and pale neutral surfaces in light mode.
- Deep graphite background and raised neutral surfaces in dark mode.
- Orange is reserved for primary actions, selected navigation, focus, and meaningful status emphasis.
- Text uses a single clear sans-serif family with compact product typography.
- Controls use consistent radii, heights, icon sizes, borders, focus states, and disabled states.
- Shadows stay subtle and directional. Borders and large soft shadows are not combined decoratively.
- Cards are used for real groupings; nested decorative cards are removed.

### Theme architecture

Every screen uses semantic tokens for:

- page, sidebar, navigation, surface, raised surface, and input backgrounds;
- primary, secondary, muted, inverse, success, warning, and danger text;
- border, divider, focus ring, overlay, and shadow;
- orange primary action and orange-tinted selected state.

Light and dark themes change token values only. Layout and component markup remain identical.

### Responsive behavior

- Desktop reproduces the supplied wide layouts.
- Tablet collapses secondary side panels before primary content.
- Mobile uses a compact top bar and reachable bottom navigation.
- Search filters become a drawer or inline expandable panel.
- Result details and business information become a full-height sheet or route.
- Chat keeps the active conversation as a separate mobile view instead of stacking it below the list.
- Business sidebar collapses into an accessible section switcher.

## Global shell

Desktop uses:

- ASK wordmark on the left;
- centered segmented navigation for Main, Chats, and Business Cabinet when the user has a business membership;
- city and account controls on the right where relevant;
- business cabinet sidebar on business routes.

Customer mobile navigation remains task-oriented and reachable. Business routes retain their own compact section navigation.

Navigation visibility follows authentication, membership, platform permissions, and actual conversation availability.

## Customer home

The home screen follows wanted screenshot 4:

- large centered headline;
- explanatory subtitle;
- Item and Service segmented control above the search input;
- prominent search field and orange submit button;
- city control in the global shell or compact mobile area.

The selected mode maps directly to `ITEM` or `SERVICE`. The raw query is preserved unchanged.

The reference block “Рядом с вами” is omitted because AskBackend does not expose standalone nearby Business results and Business is not a valid search result type.

Anonymous visitors may view the home surface. Authentication is requested only for actions that require it.

## Search results

The results screen follows wanted screenshot 5:

- persistent query bar and submit action;
- supported filters in a left panel;
- compact Item or Service result rows in the center;
- selected result details in a right panel on desktop;
- result count, relevance sort, pagination or progressive loading.

Supported explicit filters:

- typed flat category;
- city and country;
- minimum and maximum price;
- open now;
- radius when user location exists.

Supported sorts:

- relevance by default;
- distance;
- ascending price when explicitly selected.

Delivery, material, color, verification, stock, response-time, and other reference filters or badges are rendered only if the API contract supplies them as explicit facts. Otherwise they are omitted rather than mocked.

Every result remains an `ItemCard` or `ServiceCard`. Business identity is contextual and never becomes a standalone result.

The compact row shows available decision data: business identity, Item or Service title, short information, price when known, match reasons, optional branch facts, and chat action.

The selected detail panel shows the complete Item or Service description and public Business profile fields returned by the search response. On mobile it opens as a sheet or dedicated detail view.

## Chats

The chat workspace follows wanted screenshot 2:

- conversation list on the left;
- active message thread in the center;
- public Business summary or customer context on the right when data exists.

The crossed-out request detail card is not rendered.

Conversation filters and labels derive from the real statuses:

- `PENDING`;
- `IN_CHAT`;
- `CLOSED`.

Unread counts and last-message times come from the conversation contract. The inbox must remain usable with many conversations.

The message thread supports text and contract-approved attachments. Call, video, WhatsApp, Telegram, site, and map actions appear only when the public profile or contact-action contract supplies them. No average response time is calculated or claimed.

Customer Item and Service cards explicitly start or resume the one durable customer-to-Business conversation. Search itself creates no chat.

## Public business storefront

The storefront follows wanted screenshot 3 while rendering only available content:

- logo or uploaded profile image;
- business name and description;
- uploaded cover;
- contact actions;
- branch address, opening summary, and map action when available;
- published business-card blocks;
- Items, Services, offers, lookbook, or other sections only when their published data exists.

The interface does not fabricate verification, current availability, delivery price, branch count, photo count, ratings, or working status.

Empty optional sections are omitted. Missing media uses a restrained branded placeholder rather than fake product photography.

## Business cabinet

The overview follows wanted screenshot 1:

- business identity and branch selector;
- left section navigation;
- welcome heading;
- summary metrics for real Items, Services, and unread or active conversations;
- compact recent conversation table.

The large “Последний запрос” card is explicitly omitted.

Legacy customer-request and supplier-response surfaces are not restored. Business activity is the shared conversation inbox.

## Catalog management

Items and Services use dense list-first management instead of permanently expanded creation forms.

Each section contains:

- heading, count, import, and create actions;
- searchable compact rows;
- status, category, price, and branch facts supported by the relevant DTO;
- edit, activate/deactivate, and delete actions;
- create/edit form in a focused inline panel or sheet.

Category fields use the typed category API. Attributes use a guided key/value editor rather than raw JSON text.

Import remains a progressive upload, mapping, preview, approve, and result workflow. The visual redesign does not simplify or bypass these stages.

## Branches and staff

Branch management uses:

- branch list and focused editor;
- map-based location selection;
- address details;
- weekly and special opening hours;
- no numeric latitude or longitude fields.

Staff management follows membership permissions and separates real staff creation from invitations. Long combined pages are split into focused sections without changing API behavior.

## Authentication and account screens

Authentication follows the same visual system:

- ASK identity and compact value proposition;
- focused login or registration panel;
- clear tabs, labels, validation, password visibility, submit progress, and Google action;
- responsive layout without large unused empty space.

Profile, settings, support, and legal screens reuse the same shell, controls, spacing, and semantic states.

## State handling

All data surfaces provide:

- skeleton loading states;
- actionable empty states;
- inline validation;
- recoverable API errors with retry;
- authentication and authorization explanations;
- disabled and pending submit states;
- offline-safe messaging where applicable.

Raw JSON server errors are never shown directly to users.

## Accessibility

- WCAG AA contrast in both themes.
- Visible keyboard focus.
- Semantic buttons, links, headings, forms, lists, and tables.
- Accessible labels for icon-only actions.
- No color-only status communication.
- Reduced-motion support.
- Russian, Kazakh, and English text must not overlap or truncate essential actions.

## Data and contract corrections

The existing frontend client contains stale search and chat shapes. The implementation must align them to current AskBackend contracts:

- search uses `mode: ITEM | SERVICE`;
- filters live under `explicit_filters`;
- locale uses `locale`;
- default sort is `relevance`;
- result component names and response fields match current backend values;
- retired request creation and business notification calls are removed from active UI paths;
- chat endpoints and DTOs are verified against backend controllers before adjustment.

No compatibility adapters for `PRODUCTS`, `SERVICES`, `PRODUCT`, or `ALL` may be introduced.

## Verification boundaries

The user requested no automated test execution in this task. Implementation verification is therefore limited to:

- TypeScript/editor-level consistency while changing code;
- targeted static inspection;
- browser rendering and responsive screenshots where possible;
- `git diff --check` only if it does not run project tests.

The user will perform interactive product testing and report follow-up issues.

## Acceptance criteria

The redesign is complete when:

1. All existing routes render through one coherent light/dark design system.
2. The five primary surfaces visibly match the wanted reference composition.
3. No large latest-request card appears on the business overview.
4. Red-question-mark areas are resolved from backend truth rather than mock data.
5. Search sends the current backend request contract and renders only Item or Service results.
6. Chat uses real conversations and omits the crossed-out request panel.
7. Business cabinet forms and lists are usable without raw JSON editing.
8. Desktop, tablet, and mobile layouts remain operable.
9. Existing unrelated worktree changes are preserved.
10. No commit or push is created.
