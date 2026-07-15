import { expect, test } from "@playwright/test";

// Structural smoke tests for the Phase 0a skeleton. They assert roles and
// routes, not copy — the visual layer and real content arrive in Phase 0b/1.

test("the marketing landing renders at /", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link")).toHaveAttribute("href", "/app");
});

test("the platform shell renders at /app with the navigation menu", async ({
  page,
}) => {
  await page.goto("/app");
  await expect(page.getByRole("navigation")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("every V1 route from the vision responds", async ({ page }) => {
  for (const path of [
    "/app/auth",
    "/app/catalog",
    "/app/product/e2e-smoke",
    "/app/chats",
    "/app/profile",
    "/app/business",
  ]) {
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    expect(response!.status(), path).toBe(200);
    await expect(page.getByRole("heading", { level: 1 }), path).toBeVisible();
  }
});
