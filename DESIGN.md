# Ask Frontend Design System

## Theme

Ask uses the existing `data-fcw-mode="ask"` token system. Light mode is the default and dark mode preserves the same hierarchy and behavior.

The platform cabinet uses a restrained operational register:

- canvas and surfaces remain neutral;
- orange identifies Ask, current navigation, focus, and primary actions;
- green communicates successful or active state;
- yellow communicates review-required events;
- red communicates critical risk, blocking, and destructive actions.

## Typography

Inter is the only interface family. Product headings use fixed sizes, not fluid display scales.

- page title: 28 px, 650–700 weight;
- section title: 18–20 px, 650 weight;
- body: 14–16 px, 400–500 weight;
- labels and metadata: 12–13 px, 500–650 weight;
- tabular figures use `font-variant-numeric: tabular-nums`.

## Layout

- Desktop platform shell: fixed 252 px sidebar and one scrollable content region.
- Wide workspaces may use list, detail, and context columns.
- Structural surfaces use 12–16 px radii.
- Tables and lists use 44–56 px rows depending on content.
- Mobile collapses navigation into a horizontally scrollable top rail and converts split panes into drill-down views.

## Components

### Navigation

Navigation items use icon, label, and optional yellow/red counters. Counters represent unresolved moderation events, never ordinary unread messages.

### Buttons

- Primary: orange fill, high-contrast label.
- Secondary: neutral surface or one-pixel border, no decorative shadow.
- Destructive: red treatment reserved for confirmed sanctions.
- Icon-only buttons always have an accessible name and at least a 40 px target.

### Fields

Fields use the existing `ask-field` and semantic token vocabulary. Focus uses the orange focus ring. Placeholder contrast remains readable.

### Tables and lists

Use one continuous surface with separators instead of a card per row. Sticky headers are allowed. Row selection, hover, focus, and active states must be distinct.

### Status and severity

Status combines text, shape, and color. Review-required uses yellow; critical uses red. Neutral, active, blocked, deleted, pending, and expired states use stable semantic labels.

### Dialogs

Use dialogs only for sanctions, destructive confirmation, or short focused creation. Every sanction dialog contains target, effect, reason, confirmation action, cancel action, pending state, and backend error.

## Motion

Transitions last 150–220 ms and communicate selection, pane changes, or mutation feedback. No orchestrated page entrances. Reduced motion removes transforms and shortens transitions.

## Accessibility

- Minimum WCAG AA contrast.
- `:focus-visible` on every interactive control.
- Severity text accompanies every color.
- Dialog focus is trapped and restored.
- Tables remain navigable and labels survive truncation through title or accessible descriptions.

