import { expect, test } from "@playwright/test";

test("home renders the header and hides notifications", async ({ page }) => {
  const res = await page.goto("/");
  expect(res?.status()).toBe(200);
  for (const name of ["Schedule", "Notices", "Files"]) {
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  }
  const foot = page.getByRole("contentinfo");
  await expect(foot.getByRole("link", { name: "Officer sign in" })).toHaveAttribute("href", "/login");
  await expect(foot).toContainText("CPE 3C");
  await expect(foot).toContainText(/Updated [A-Z][a-z]{2} \d+ [A-Z][a-z]{2}, \d+:\d\d [AP]M/);
  await expect(foot).toContainText(/v\d+\.\d+\.\d+/);
  // Notifications are opt-in: the panel stays closed until the footer link is used.
  await expect(foot.getByRole("button", { name: "Notifications" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toBeHidden();
});
