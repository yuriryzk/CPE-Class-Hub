import { expect, test } from "@playwright/test";

// Data comes from supabase/seed.sql (run `npx supabase db reset` first).
const cards = (page: import("@playwright/test").Page) => page.getByRole("article");

test("a done notice comes after the active ones and is greyed", async ({ page }) => {
  await page.goto("/notices");
  const all = cards(page);
  await expect(all).toHaveCount(3);
  // Quiz 1 greys after 17 Nov, so only the first card and the done notice are checked.
  const done = all.filter({ hasText: "Group list submitted" });
  await expect(done).toContainText("Done");
  await expect(done).toHaveClass(/past/);
  await expect(all.first()).toContainText("Read the code of ethics");
  await expect(all.first()).not.toHaveClass(/past/);
  await expect(all.filter({ hasText: "Quiz 1 on Tuesday" })).toContainText("On the calendar: Quiz/exam, Tue 17 Nov");
});

test("List view is a table with a Status column and is remembered", async ({ page }) => {
  await page.goto("/notices");
  await page.getByRole("group", { name: "View" }).getByRole("button", { name: "List" }).click();
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Group list submitted.*Done/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
});

test("General files show without course files", async ({ page }) => {
  await page.goto("/files?course=general");
  await expect(page.getByRole("cell", { name: "Class master list" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Packet Tracer download" })).toHaveCount(0);
  const link = page.getByRole("link", { name: "Open link" });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener");
  await page.goto("/files?course=CNS");
  await expect(page.getByRole("cell", { name: "Packet Tracer download" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "Class master list" })).toHaveCount(0);
});

test("picking MOR on Notices is carried to the Schedule", async ({ page }) => {
  await page.goto("/notices");
  await page.getByRole("group", { name: "Show notices from these courses" }).getByRole("button", { name: /^MOR/ }).click();
  await expect(page).toHaveURL(/course=MOR/);
  await page.goto("/");
  await expect(page).toHaveURL(/[?&]course=MOR(&|$)/);
});
