import { expect, test } from "@playwright/test";

// Data comes from supabase/seed.sql (run `npx supabase db reset` first). Nothing here depends on today's date.

test("the Courses tab lists all nine courses as cards", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Courses" }).click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Courses");
  const cards = page.locator("main a").filter({ has: page.getByRole("heading", { level: 2 }) });
  await expect(cards).toHaveCount(9);
  await expect(cards.filter({ hasText: "Computer Networks and Security" })).toContainText("3 classes a week");
});

test("a course page shows its weekly classes (by lab group), notices and files", async ({ page }) => {
  await page.goto("/courses/cns"); // codes match in any case
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Computer Networks and Security");
  const weekly = page.getByRole("region", { name: "Weekly classes" }).getByRole("listitem");
  await expect(weekly).toHaveCount(3);
  await page.getByRole("group", { name: "Lab group" }).getByRole("button", { name: "G1" }).click();
  await expect(weekly).toHaveCount(2); // the G2 lab is left out
  await expect(weekly.filter({ hasText: "G2" })).toHaveCount(0);
  await page.getByRole("group", { name: "Lab group" }).getByRole("button", { name: "Both" }).click();
  await expect(page.getByRole("region", { name: "Notices" })).toContainText("Quiz 1 on Tuesday");
  await expect(page.getByRole("region", { name: "Files" }).getByRole("cell", { name: "Packet Tracer download" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open in Files" })).toHaveAttribute("href", "/files?course=CNS");
});

test("an unknown course code says so", async ({ page }) => {
  await page.goto("/courses/NOPE");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("No such course");
  await expect(page.getByRole("link", { name: "See all courses." })).toHaveAttribute("href", "/courses");
});

test("a class's details link to its course page", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  await page.getByRole("region", { name: "Calendar" }).getByRole("button", { name: /Methods of Research/ }).first().click();
  await page.getByRole("dialog").getByRole("link", { name: "View MOR course page →" }).click();
  await expect(page).toHaveURL(/\/courses\/MOR$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Methods of Research");
});
