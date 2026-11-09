import { expect, test } from "@playwright/test";

// Needs a fresh `npx supabase db reset`. Every test puts back what it changed (setup also does, after a failed run).
const OFFICER = "tests/e2e/.auth/officer.json";
const PLAIN = "tests/e2e/.auth/plain.json";

test.describe("head officer", () => {
  test.use({ storageState: OFFICER });

  test("add a General link, reject a javascript: link, delete it", async ({ page }) => {
    const title = `E2E Guide ${Date.now()}`;
    await page.goto("/admin/files");
    const form = page.getByRole("form", { name: "Add a file" });
    await expect(form.getByLabel("Course").locator("option").first()).toHaveText("General (whole class)");
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Type").fill("Link");
    await form.getByLabel("Link").fill("javascript:alert(1)");
    await form.getByRole("button", { name: "Add file" }).click();
    await expect(form.getByText("Links must start with https://")).toBeVisible();
    await form.getByLabel("Link").fill("https://example.com/guide");
    await form.getByRole("button", { name: "Add file" }).click();
    await expect(page.getByRole("status")).toHaveText("File added");

    await page.goto("/files?course=general");
    await expect(page.getByRole("cell", { name: title })).toBeVisible();

    await page.goto("/admin/files");
    page.once("dialog", (d) => d.accept());
    const row = page.getByRole("region", { name: "Files" }).locator("div", { has: page.getByText(title) }).filter({ has: page.getByRole("button", { name: "Delete" }) }).last();
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByText(title)).toHaveCount(0);
  });

  test("rename a course code, refuse a duplicate, put it back", async ({ page }) => {
    const form = page.getByRole("form", { name: "Your courses" });
    const save = async (code: string) => {
      await page.goto("/admin/courses");
      await form.getByLabel("Course 6 code").fill(code);
      await form.getByRole("button", { name: "Save courses" }).click();
    };
    try {
      await save("cns2");
      await expect(page.getByRole("status")).toHaveText("Courses saved");
      await page.goto("/");
      await expect(page.locator(".tag", { hasText: "cns2" }).first()).toBeVisible();

      await save("pm");
      await expect(page.getByRole("status")).toContainText("Another course already uses");
      await expect(form.getByLabel("Course 6 code")).toHaveAttribute("maxlength", "8");
    } finally {
      await save("CNS");
      await expect(page.getByRole("status")).toHaveText("Courses saved");
    }
  });

  test("an instructor shows in a class's details, not on the calendar card", async ({ page }) => {
    const form = page.getByRole("form", { name: "Your courses" });
    const save = async (name: string) => {
      await page.goto("/admin/courses");
      await form.getByLabel("Course 6 instructor").fill(name);
      await form.getByRole("button", { name: "Save courses" }).click();
      await expect(page.getByRole("status")).toHaveText("Courses saved");
    };
    try {
      await save("Engr. E2E Santos");
      await page.goto("/?week=2026-11-15");
      const card = page.getByRole("region", { name: "Calendar" }).getByRole("button", { name: /Computer Networks and Security/ }).first();
      await expect(card).not.toContainText("Santos");
      await card.click();
      await expect(page.getByRole("dialog").getByText("Engr. E2E Santos")).toBeVisible();
    } finally {
      await save("");
    }
  });

  test("files list sorts by course, General last, and remembers it", async ({ page }) => {
    await page.goto("/admin/files");
    const sort = page.getByRole("region", { name: "Files" }).getByRole("group", { name: "Sort" });
    await expect(sort.getByRole("button", { name: "Most recent" })).toHaveAttribute("aria-pressed", "true");
    await sort.getByRole("button", { name: "By course" }).click();
    await expect(sort.getByRole("button", { name: "By course" })).toHaveAttribute("aria-pressed", "true");
    const titles = page.getByRole("region", { name: "Files" }).locator("b");
    await expect(titles.first()).toHaveText("Lab manual"); // MICROP, the first course
    await expect(titles.last()).toHaveText("Class master list"); // General
    await page.reload();
    await expect(sort.getByRole("button", { name: "By course" })).toHaveAttribute("aria-pressed", "true");
  });

  test("semester: change the weeks, add and remove a break, refuse bad breaks", async ({ page }) => {
    await page.goto("/admin/courses");
    const sem = page.getByRole("form", { name: "Semester" });
    await sem.getByLabel("Number of weeks").fill("17");
    await sem.getByRole("button", { name: "Save semester" }).click();
    await expect(page.getByRole("status")).toHaveText("Semester saved");
    await sem.getByLabel("Number of weeks").fill("18");
    await sem.getByRole("button", { name: "Save semester" }).click();
    await expect(page.getByRole("status")).toHaveText("Semester saved");
    await sem.getByLabel("Week 1 starts").fill("2026-11-16");
    await sem.getByRole("button", { name: "Save semester" }).click();
    await expect(sem.getByText("Must be a Sunday")).toBeVisible();

    const br = page.getByRole("form", { name: "Breaks" });
    await expect(br.getByText("Christmas break")).toBeVisible();
    await br.getByLabel("Label").fill("E2E break");
    await br.getByLabel("Week starts (Sunday)").fill("2026-12-23");
    await br.getByRole("button", { name: "Add break" }).click();
    await expect(br.getByText("Must be a Sunday")).toBeVisible();
    await br.getByLabel("Week starts (Sunday)").fill("2030-01-06");
    await br.getByRole("button", { name: "Add break" }).click();
    await expect(page.getByRole("status")).toHaveText("That break is outside the semester");
    await br.getByLabel("Week starts (Sunday)").fill("2026-11-29");
    await br.getByRole("button", { name: "Add break" }).click();
    await expect(page.getByRole("status")).toHaveText("Break added");
    const item = br.getByRole("listitem").filter({ hasText: "E2E break" });
    await expect(item).toBeVisible();
    page.once("dialog", (d) => d.accept());
    await item.getByRole("button", { name: "Remove" }).click();
    await expect(item).toHaveCount(0);
  });

  test("add an officer, remove them; own row has no Remove", async ({ page }) => {
    const email = `E2E-${Date.now()}@Test.local`;
    await page.goto("/admin/officers");
    const list = page.getByRole("region", { name: "Officers" });
    await expect(list.locator("div", { hasText: "officer@test.local" }).filter({ hasText: "Head officer" }).last().getByRole("button", { name: "Remove" })).toHaveCount(0);
    const form = page.getByRole("form", { name: "Add an officer" });
    await form.getByLabel("Email").fill("not-an-email");
    await form.getByRole("button", { name: "Add officer" }).click();
    await expect(form.getByRole("alert")).toBeVisible();
    await form.getByLabel("Email").fill(email);
    await form.getByRole("button", { name: "Add officer" }).click();
    await expect(page.getByRole("status")).toHaveText("Officer added");
    const row = list.locator("div", { hasText: email.toLowerCase() }).filter({ has: page.getByRole("button", { name: "Remove" }) }).last();
    await expect(row).toContainText("added by officer@test.local");
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(email.toLowerCase())).toHaveCount(0);
  });
});

test.describe("officer who is not the head", () => {
  test.use({ storageState: PLAIN });

  test("gets a 404 on /admin/officers and no Officers tab", async ({ page }) => {
    const res = await page.goto("/admin/officers");
    expect(res?.status()).toBe(404);
    await page.goto("/admin/files");
    await expect(page.getByRole("navigation", { name: "What to change" }).getByRole("link", { name: "File" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Officers" })).toHaveCount(0);
  });
});
