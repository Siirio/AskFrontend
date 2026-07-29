# Account Security and Navigation Cleanup

## Scope

This change simplifies the ordinary customer account, secures password and two-factor changes with email verification, removes chat status filtering, removes the search-bar notification action, and exposes company creation to customers without a Business membership.

The implementation spans AskFrontend and AskBackend. Existing Business account legal surfaces remain available. The ordinary customer account no longer shows legal documents or agreements.

## Account layout

The ordinary customer account contains:

- personal profile editing;
- a security section;
- a company-creation action when the customer has no Business membership;
- a visually distinct account-deletion danger zone.

The preferences section and browser-notification control are removed for every account context. Legal documents and agreements are hidden from ordinary customers and remain available only in the Business account context.

The company-creation action routes to the existing seller onboarding flow. It is hidden when the current session already contains a Business membership.

## Password-change verification

Password change uses a dedicated modal and a two-step flow:

1. The customer enters the current password, the new password, and confirmation.
2. The backend validates the current password and issues a six-digit email verification challenge.
3. The modal switches to the verification step and accepts exactly six digits.
4. Confirmation consumes the challenge and changes the password.

The current authenticated session remains valid after a successful password change. Other active sessions for the same user are revoked.

The challenge is single-use and uses the existing configured challenge TTL. Invalid, expired, cancelled, or already-consumed challenges cannot change the password. Resending replaces the pending challenge through the same request flow.

## Two-factor verification

Two-factor management uses a separate modal from password change.

Both enabling and disabling two-factor authentication require a six-digit code sent to the current verified email address:

1. The customer requests the desired state.
2. The backend creates an email challenge for `TWO_FACTOR_ENABLE` or `TWO_FACTOR_DISABLE`.
3. The modal accepts exactly six digits.
4. Confirmation consumes the challenge and applies the requested state.

When two-factor authentication is enabled, every new password login issues a six-digit email challenge and creates no authenticated session until that challenge is confirmed. Disabling two-factor authentication also requires email confirmation so an existing stolen session cannot silently remove the protection.

## Account deletion

Account deletion is presented as a distinct danger zone with stronger visual emphasis than ordinary settings. Its action opens a compact modal overlay rather than expanding content inline. The modal explains that deletion is destructive and exposes separate cancel and final-delete actions.

The existing authenticated account-deletion API remains the deletion mechanism. This scope does not add another OTP requirement to deletion.

## Chats

The dedicated `/chats` page shows the conversation list without the status controls:

- `Все`;
- `Новый`;
- `В работе`;
- `Завершён`.

The related client-side status filter state is removed. Conversation content, unread state, selection, and messaging behavior remain unchanged.

## Search bar

The notification/bell action rendered to the right of the search bar is removed. Search submission, search scope, query restoration, and navigation behavior remain unchanged.

## API shape

The backend exposes purpose-specific authenticated request and confirmation operations:

- password-change request;
- password-change confirmation;
- two-factor state-change request;
- two-factor state-change confirmation.

Request responses reuse the existing verification challenge response shape. Confirmation returns the refreshed authenticated session shape.

The existing direct password-change and direct two-factor-toggle behavior is replaced so a client cannot bypass email verification.

## Error handling

The modal remains open and displays the backend error when:

- the current password is wrong;
- the new password is invalid;
- email delivery fails;
- the code is malformed, wrong, expired, cancelled, or consumed;
- the challenge purpose or authenticated user does not match;
- the requested two-factor state changed before confirmation.

Busy state prevents duplicate requests. Closing a modal clears locally held passwords and verification codes.

## Documentation and verification

Identity contracts and frontend UX documentation are updated with the new challenge flows and account layout.

Verification covers:

- backend request and confirmation authorization;
- challenge purpose and ownership checks;
- password change and other-session revocation;
- two-factor enable, disable, and login challenge behavior;
- frontend modal state transitions and six-digit input validation;
- ordinary-customer legal/preferences removal;
- company onboarding action visibility;
- chat filter removal;
- search notification-action removal;
- responsive account modals.

After verification, the completed code is promoted to both `dev` and `master`. The test environment deploys `dev`; production deploys `master`.
