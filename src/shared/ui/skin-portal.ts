"use client";

import { useLayoutEffect, useState } from "react";

/**
 * Where Radix should portal its overlays so they inherit the platform skin.
 *
 * THE PROBLEM THIS SOLVES. The neumorphic skin (D25) lives on a `.neu-skin`
 * wrapper applied once by the platform layout — both its CSS variables and its
 * ~84 `.neu-*` component rules are scoped to it. Radix renders Dialog,
 * DropdownMenu and Select content into a portal at the end of `<body>`, OUTSIDE
 * that wrapper, where:
 *
 *   - a colour utility (`bg-surface`) silently resolves to the MARKETING
 *     palette, because the primitives it reads are only redefined inside the
 *     scope, and
 *   - a `.neu-*` class silently matches NOTHING.
 *
 * Both failures are invisible in review and in a diff — they only show in a
 * browser. It was caught by driving the role modal: its cards and its Continue
 * button rendered with `box-shadow: none` and a transparent background.
 *
 * WHY A CONTAINER RATHER THAN RE-DECLARING THE VARIABLES. Re-declaring on the
 * portal node was the first fix and it does not scale: once the `.neu-*` rules
 * themselves must work out there too, "the handful of variables they need" is
 * the entire palette, duplicated across light, dark and the no-JS block — three
 * copies to keep in step forever. Moving the portal INSIDE the scope makes the
 * whole skin apply by inheritance, with nothing duplicated. Putting the palette
 * on `:root` instead was rejected for the opposite reason: it would leak the
 * skin onto the marketing landing, which is the one thing the scope exists to
 * prevent.
 *
 * `position: fixed` still resolves against the viewport inside the wrapper —
 * `.neu-skin` sets no transform, filter or perspective, the three properties
 * that would turn it into a containing block. Keep it that way, or every
 * overlay in the product silently re-anchors.
 *
 * Returns `undefined` before mount and on the server, which is exactly Radix's
 * default (portal to `<body>`); the lazy initializer resolves the common case
 * instantly (the wrapper already exists from an earlier commit — e.g. the
 * email/password auth pages already sit inside `app/app/layout.tsx`, so it
 * predates any dialog opening on top of them).
 *
 * THE CASE THE INITIALIZER ALONE MISSES: a route OUTSIDE `app/app/layout.tsx`
 * (Google OAuth's `/oauth/callback`, on the ROOT layout only) that arms the
 * role modal and then client-navigates into `/app` for the first time in the
 * session. There, `#ask-skin-root` and the open dialog mount in the SAME
 * commit — the lazy initializer runs during React's RENDER phase, before that
 * commit has touched the real DOM, so it always finds nothing. Caught
 * 2026-08-01 driving a real Google sign-up: the modal rendered with no
 * backdrop and no card background, exactly the failure this hook exists to
 * prevent, just from the one direction that doesn't warm the DOM first.
 *
 * The `useLayoutEffect` re-check fixes it: layout effects run after the
 * commit's DOM mutations are applied but before the browser paints, so it
 * always sees a sibling/ancestor created in that same commit. The resulting
 * state update is flushed synchronously in that same pre-paint window, so
 * there is still no visible flash — the property the original comment
 * described, now true for both directions instead of only the warmed one.
 */
export const SKIN_ROOT_ID = "ask-skin-root";

export function useSkinPortalContainer(): HTMLElement | undefined {
  const [container, setContainer] = useState<HTMLElement | null>(() =>
    typeof document === "undefined"
      ? null
      : document.getElementById(SKIN_ROOT_ID),
  );

  useLayoutEffect(() => {
    if (container) return;
    const found = document.getElementById(SKIN_ROOT_ID);
    if (found) setContainer(found);
  }, [container]);

  return container ?? undefined;
}
