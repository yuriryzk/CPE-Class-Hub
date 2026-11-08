import { expect, test } from "@playwright/test";

test("/admin while signed out goes to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Officers sign in with Google")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in with Google/ })).toBeVisible();
});

test("/login shows a fixed message, never text from the link", async ({ page }) => {
  await page.goto("/login?error=Your account is locked");
  await expect(page.getByText("Your account is locked")).toHaveCount(0);
  await expect(page.locator("main p")).toHaveText("Sign-in didn't finish. Try again.");
});
