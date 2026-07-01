import { expect, test } from "@playwright/test";

test("a visitor cannot bypass companion creation", async ({ page }) => {
  await page.goto("/map");
  await expect(page).toHaveURL(/onboarding/);

  const response = await page.request.get("/api/state");
  expect(response.status()).toBe(401);
});

test("health response contains status only, not secret values", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBe(true);
  const body = await response.text();
  expect(body).not.toContain("1813ee");
  expect(body).not.toContain("0cdc90");
});
