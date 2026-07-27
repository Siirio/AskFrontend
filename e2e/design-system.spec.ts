import { expect, test } from "@playwright/test";

// Teeth for the Design Locks (Locks.md, decision D13). These assert the WIRING,
// not the values: a token may be retuned freely, but the body must keep rendering
// on the surface token, dark must keep redefining it, and the webfont must keep
// covering ₸ and Kazakh. The VALUES are proven separately by the OKLCH→WCAG
// contrast computation recorded at the bottom of design-system/tokens_old.css.

/** The real face, not the metric-matched fallback next/font appends after it. */
const primaryFamily = (fontVar: string) => fontVar.split(",")[0].trim();

test("the body renders on the design-system tokens, and dark redefines them", async ({
  browser,
}) => {
  const read = async (colorScheme: "light" | "dark") => {
    const context = await browser.newContext({ colorScheme });
    const page = await context.newPage();
    await page.goto("/app/auth/login");
    const values = await page.evaluate(() => {
      // Resolve each token THROUGH the colour system rather than reading the raw
      // custom property: getPropertyValue returns the authored text
      // (`lab(97.08% .86 1.18)`) while a computed colour is normalised
      // (`lab(97.08 0.86 1.18)`). Same colour, different string — compare the
      // normalised form on both sides or the assertion is about serialisation.
      const resolve = (token: string) => {
        const probe = document.createElement("span");
        probe.style.color = `var(${token})`;
        document.body.appendChild(probe);
        const colour = getComputedStyle(probe).color;
        probe.remove();
        return colour;
      };
      const body = getComputedStyle(document.body);
      return {
        bodyBackground: body.backgroundColor,
        bodyColor: body.color,
        surface: resolve("--surface"),
        foreground: resolve("--foreground"),
        accentForeground: resolve("--accent-foreground"),
      };
    });
    await context.close();
    return values;
  };

  const light = await read("light");
  const dark = await read("dark");

  // The body is painted BY the tokens — not by a hardcoded colour that merely
  // happens to match (P9.2: no magic values).
  expect(light.bodyBackground).toBe(light.surface);
  expect(light.bodyColor).toBe(light.foreground);
  expect(dark.bodyBackground).toBe(dark.surface);
  expect(dark.bodyColor).toBe(dark.foreground);

  // Both grounds are designed. If someone drops the dark block, these collapse.
  expect(dark.surface).not.toBe(light.surface);
  expect(dark.foreground).not.toBe(light.foreground);

  // The accent's label flips white → ink across the grounds, because one accent
  // value provably cannot serve both (D13). This is the assertion that breaks if
  // someone "simplifies" --accent-foreground back into a constant.
  expect(dark.accentForeground).not.toBe(light.accentForeground);
});

test("the webfont covers ₸ and Kazakh — the latin-ext lock", async ({
  page,
}) => {
  await page.goto("/app");

  const coverage = await page.evaluate(async () => {
    const fontVar = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-golos")
      .trim();
    const family = fontVar.split(",")[0].trim();

    const TENGE = "₸"; // U+20B8 — lives in latin-ext, in NO Cyrillic range
    const KAZAKH = "әғқңөұүһі"; // split across cyrillic AND cyrillic-ext

    // Subsets load lazily by unicode-range, so a page with no ₸ on it has never
    // fetched latin-ext. Force the load before asking, or check() reports a
    // false negative.
    await document.fonts.load(`16px ${family}`, TENGE);
    await document.fonts.load(`16px ${family}`, KAZAKH);
    await document.fonts.ready;

    // Independent of check(): if the face lacked the glyphs the browser would
    // substitute, and the width would equal a no-webfont control.
    const width = (text: string, fontFamily: string) => {
      const span = document.createElement("span");
      span.textContent = text;
      span.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:64px;font-family:${fontFamily}`;
      document.body.appendChild(span);
      const measured = span.getBoundingClientRect().width;
      span.remove();
      return measured;
    };

    return {
      family,
      tengeAvailable: document.fonts.check(`16px ${family}`, TENGE),
      kazakhAvailable: document.fonts.check(`16px ${family}`, KAZAKH),
      kazakhWidth: width(KAZAKH, family),
      kazakhWidthWithoutWebfont: width(KAZAKH, `"NoSuchFace_zzz"`),
    };
  });

  expect(coverage.family).toContain("Golos");
  expect(
    coverage.tengeAvailable,
    "₸ (U+20B8) must resolve from the webfont — drop the latin-ext subset and every price on the platform silently falls back",
  ).toBe(true);
  expect(
    coverage.kazakhAvailable,
    "Kazakh letters must resolve from the webfont",
  ).toBe(true);
  expect(coverage.kazakhWidth).not.toBeCloseTo(
    coverage.kazakhWidthWithoutWebfont,
    0,
  );
});
