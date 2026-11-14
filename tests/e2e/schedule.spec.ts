import { expect, test } from "@playwright/test";

// Data comes from supabase/seed.sql (run `npx supabase db reset` first).
const cal = (page: import("@playwright/test").Page) => page.getByRole("region", { name: "Calendar" });

test("a term week shows its number and US date range", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Schedule of Week 1");
  await expect(page.getByText("November 15, 2026 to November 21, 2026")).toBeVisible();
});

test("a break week shows the break and no classes", async ({ page }) => {
  await page.goto("/?week=2026-12-20");
  await expect(page.getByText(/Christmas break, no classes/)).toBeVisible();
  await expect(cal(page).getByRole("button", { name: "Verilog exercises" })).toBeVisible();
  await expect(cal(page).getByRole("button", { name: /Class/ })).toHaveCount(0);
});

test("G1 hides G2 labs and is remembered", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  await expect(cal(page).getByRole("button", { name: /G2/ }).first()).toBeVisible();
  await page.getByRole("group", { name: "Lab group" }).getByRole("button", { name: "G1" }).click();
  await expect(cal(page).getByRole("button", { name: /G2/ })).toHaveCount(0);
  await expect(cal(page).getByRole("button", { name: /G1/ }).first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole("group", { name: "Lab group" }).getByRole("button", { name: "G1" })).toHaveAttribute("aria-pressed", "true");
  await expect(cal(page).getByRole("button", { name: /G2/ })).toHaveCount(0);
});

test("a course link filters, is saved, and comes back on the plain site", async ({ page }) => {
  await page.goto("/?week=2026-11-15&course=cns");
  const filter = page.getByRole("navigation", { name: "Your courses" });
  await expect(filter.getByRole("button", { name: /^CNS/ })).toHaveAttribute("aria-pressed", "true");
  await expect(cal(page).getByRole("button", { name: /Quiz 1: OSI model/ }).first()).toBeVisible();
  for (const code of ["MICROP", "MOR", "PM", "LAWS", "HDL"]) {
    await expect(cal(page).getByText(code, { exact: true })).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page).toHaveURL(/[?&]course=CNS(&|$)/);
});

test("the timetable sizes classes by length and marks a timed quiz in the grid and the row below", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  const block = (name: RegExp) => cal(page).getByRole("button", { name }).first();
  const lecture = await block(/MICROP 7:30–9:00/).boundingBox(); // 1½ hours
  const lab = await block(/MICROP 1:00–4:00/).boundingBox(); // 3 hours
  expect(lab!.height / lecture!.height).toBeGreaterThan(1.9);
  expect(lab!.y).toBeGreaterThan(lecture!.y);
  await expect(cal(page).getByRole("button", { name: /Quiz 1: OSI model/ })).toHaveCount(2);
  await expect(cal(page).getByText("Also this day")).toBeVisible();
  await expect(cal(page).getByRole("group", { name: "Day" })).toBeHidden(); // day tabs are for phones only
});

test("on a phone the day tabs show one day at a time", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto("/?week=2026-11-15");
  const tabs = cal(page).getByRole("group", { name: "Day" });
  await tabs.getByRole("button", { name: /Mon/ }).click();
  await expect(cal(page).getByRole("button", { name: /Microprocessors/ }).first()).toBeVisible();
  await expect(cal(page).getByRole("button", { name: /Quiz 1: OSI model/ })).toHaveCount(0);
  await tabs.getByRole("button", { name: /Tue/ }).click();
  await expect(tabs.getByRole("button", { name: /Tue/ })).toHaveAttribute("aria-pressed", "true");
  await expect(cal(page).getByRole("button", { name: /Quiz 1: OSI model/ }).first()).toBeVisible();
  await expect(cal(page).getByRole("button", { name: /Microprocessors/ })).toHaveCount(0);
});

test("a card opens its details and Escape closes them", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  await cal(page).getByRole("button", { name: /Quiz 1: OSI model/ }).first().click();
  const dlg = page.getByRole("dialog");
  await expect(dlg).toBeVisible();
  await expect(dlg.getByText("When", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dlg).toBeHidden();
});

test("the download button saves a PNG", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download image" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("phone width has no sideways page scroll", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto("/?week=2026-11-15");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("posted this week puts done notices after active ones", async ({ page }) => {
  await page.goto("/?week=2026-11-15");
  const cards = page.getByRole("region", { name: "Posted this week" }).getByRole("article");
  await expect(cards).toHaveCount(3);
  // Quiz 1's place depends on today (it greys after 17 Nov), so only the first card (active) and the done notice (greyed) are checked.
  await expect(cards.first()).toContainText("Read the code of ethics");
  await expect(cards.filter({ hasText: "Group list submitted" })).toHaveClass(/past/);
  await expect(cards.first()).not.toHaveClass(/past/);
});
