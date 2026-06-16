# Deprecated Web-Staging Notes

This file is archive context. It is not a required frontend product instruction.

## Useful Lessons From Browser Prototypes

- Smart Search should remain the primary customer discovery path.
- Supplier users need an inbox/work queue, not a single request detail as the whole experience.
- A customer request can receive many supplier responses over time.
- Response feeds need compact comparison rows and detailed expansion.
- Chat is scoped to one request and one supplier.
- Mobile ergonomics matter.
- Manual replies must not fake inventory, logistics, delivery, or schedule facts.

## Do Not Carry Forward As Backend Requirements

- localStorage runtime state.
- BroadcastChannel multi-window sync.
- fixed phone-shell implementation details.
- browser debug navigation.
- mock timers as product semantics.
- browser web staging as production architecture.
- screenshot-specific UI requirements.

## Current Direction

Ask should be mobile-first and product-first. Browser prototypes and admin tools can exist, but future frontend work should be driven by stable APIs, mobile UX, product rules, and honest supplier data display.
