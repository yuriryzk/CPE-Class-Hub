import { expect, test } from "@playwright/test";

test("/admin while signed out goes to the login page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Officers sign in with Google")).toBeVisible();
  await expect(page.getByRole("button", { name: /Sign in with Google/ })).toBeVisible();
});
