import { expect, test } from "@playwright/test";

test("search finds a file, a notice and a course", async ({ page }) => {
  await page.goto("/search?q=packet");
  await expect(page.getByRole("heading", { name: "Files", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Packet Tracer download/ })).toHaveAttribute("href", "/files?course=CNS");

  await page.goto("/search?q=pen");
  await expect(page.getByRole("heading", { name: "Notices", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Quiz 1 on Tuesday/ })).toHaveAttribute("href", "/notices?course=CNS");

  await page.goto("/search?q=micro");
  await expect(page.getByRole("heading", { name: "Courses", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: /Microprocessors/ })).toHaveAttribute("href", "/courses/MICROP");
});

test("search shows an empty state and clears on Escape", async ({ page }) => {
  await page.goto("/search?q=zzzznothing");
  await expect(page.getByText("Nothing matches")).toBeVisible();
  await page.goto("/search");
  await expect(page.getByText("Type a course, notice or file to search.")).toBeVisible();
  const box = page.getByRole("searchbox");
  await box.fill("pen");
  await page.keyboard.press("Escape");
  await expect(box).toHaveValue("");
});
