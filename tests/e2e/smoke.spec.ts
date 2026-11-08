import { expect, test } from "@playwright/test";

test("home renders the header and hides notifications", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  for (const name of ["Schedule", "Notices", "Files"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  await expect(page.getByText("Turn on notifications")).toHaveCount(0);
});
