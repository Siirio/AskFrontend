import { expect, test, type Page } from "@playwright/test";

import { pinLocale } from "./helpers";

// Teeth for a design rule that has no other enforcement: **no layout may be
// tight to its text, on any width** (`platform-ui-design` §7).
//
// Russian runs ~30% longer than English and Kazakh longer still, so a control
// row sized against English copy fits on the developer's screen and breaks for
// the actual users. That failure is INVISIBLE to every other check we run:
// TypeScript cannot see a translated string, `eslint` cannot measure a box, and
// the functional specs pin `ask.locale=en` on purpose so their assertions read
// stable English. Nothing in the suite looked at a phone in Russian until this
// file.
//
// It is a real risk, not a hypothetical one. The Unique-Offers sort tab
// (2026-08-04) put four tabs totalling **523px** into a 375px viewport — ru's
// "Уникальные предложения" alone is 215px against English's 123px. It happens
// to wrap, so it is fine; had the tab row been `flex-nowrap` or a fixed height,
// it would have shipped broken for every Russian and Kazakh user while passing
// 120/120 tests.
//
// **kk is checked FIRST because it is the product's DEFAULT locale** (D18/D19)
// — the language most users see before they touch a switcher, and therefore the
// one a regression hurts most.
//
// The assertion is deliberately about the PAGE, not about any component: a
// horizontal scrollbar on `<body>` is the one symptom every overflow produces,
// whatever caused it. That keeps this file from needing an edit each time a
// control is added — it tests the rule, not the implementation.

const PHONE = { width: 375, height: 780 };

const CUSTOMER_SESSION = {
  access_token: null,
  token_type: "Bearer",
  role: "CUSTOMER",
  start_route: "CLIENT_SEARCH",
  user: {
    user_id: "22222222-2222-2222-2222-222222222222",
    display_name: "Тестовый Пользователь",
    email: "t@example.com",
    status: "ACTIVE",
  },
  all_roles: ["CUSTOMER"],
};

async function seed(page: Page, locale: string) {
  await page.addInitScript(() =>
    localStorage.setItem("ask.accessToken", "layout-test-token"),
  );
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 200, json: CUSTOMER_SESSION }),
  );
  await pinLocale(page, locale);
  await page.setViewportSize(PHONE);
}

/** Routes whose copy is dense enough for length to matter. `roses` is the mock
 *  backend's populated scenario, so the Catalog Page renders real cards with
 *  badges, an offer chip and the full sort row rather than an empty state. */
const ROUTES = [
  ["Home", "/app"],
  ["Catalog", "/app/catalog?query=roses&mode=ITEM"],
  ["Login", "/app/auth/login"],
  ["Register", "/app/auth/register"],
] as const;

for (const locale of ["kk", "ru"] as const) {
  for (const [name, path] of ROUTES) {
    test(`${name} does not scroll horizontally on a phone in ${locale}`, async ({
      page,
    }) => {
      await seed(page, locale);
      await page.goto(path);
      // Wait for real content rather than a bare load: an empty shell never
      // overflows, so asserting too early would pass on nothing.
      await expect(page.locator("main")).toBeVisible();

      const { scrollWidth, clientWidth, widest } = await page.evaluate(() => {
        const doc = document.documentElement;
        // Name the widest offender, so a failure says WHICH element to fix
        // instead of only that something overflowed.
        let widest = "";
        let max = 0;
        for (const el of Array.from(document.body.querySelectorAll("*"))) {
          const r = el.getBoundingClientRect();
          if (r.right > max) {
            max = r.right;
            widest = `${el.tagName.toLowerCase()}.${(el.className || "").toString().split(" ").slice(0, 3).join(".")}`;
          }
        }
        return {
          scrollWidth: doc.scrollWidth,
          clientWidth: doc.clientWidth,
          widest: `${widest} @ ${Math.round(max)}px`,
        };
      });

      expect(
        scrollWidth,
        `${name} overflows ${scrollWidth - clientWidth}px in ${locale}; widest element: ${widest}`,
      ).toBeLessThanOrEqual(clientWidth);
    });
  }
}
