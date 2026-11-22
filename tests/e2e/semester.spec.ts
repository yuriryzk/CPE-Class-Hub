import { expect, test } from "@playwright/test";

// Runs last (its own project): starting a semester archives the seed every other spec reads. Reset the database
// before the next run (`npx supabase db reset`).
const OFFICER = "tests/e2e/.auth/officer.json"; // the head officer
const PLAIN = "tests/e2e/.auth/plain.json";

test.describe("officer who is not the head", () => {
  test.use({ storageState: PLAIN });
  test("does not get the new semester form", async ({ page }) => {
    await page.goto("/admin/courses");
    await expect(page.getByRole("form", { name: "Semester", exact: true })).toBeVisible();
    await expect(page.getByRole("form", { name: "Start a new semester" })).toHaveCount(0);
  });
});

test.describe("head officer", () => {
  test.use({ storageState: OFFICER });
  // Dev-mode compiles make the archive pages slow on a cold run; the assertions themselves are quick.
  test.setTimeout(90_000);
  test("starts a new semester: last semester moves to the Archive, courses and General files stay", async ({ page, browser }) => {
    await page.goto("/admin/courses");
    const form = page.getByRole("form", { name: "Start a new semester" });

    // Saying no to the question changes nothing.
    page.once("dialog", (d) => d.dismiss());
    await form.getByLabel("Week 1 starts").fill("2027-01-17");
    await form.getByRole("button", { name: "Start new semester" }).click();
    await expect(page.getByRole("status")).toHaveText("Nothing was changed");

    // A start that isn't after the current semester is refused.
    page.once("dialog", (d) => d.accept());
    await form.getByLabel("Week 1 starts").fill("2026-11-15");
    await form.getByRole("button", { name: "Start new semester" }).click();
    await expect(page.getByRole("status")).toHaveText("The new semester must start after the current one");

    let asked = "";
    page.once("dialog", (d) => { asked = d.message(); d.accept(); });
    await form.getByLabel("Week 1 starts").fill("2027-01-17");
    await form.getByLabel("Number of weeks").fill("18");
    await form.getByRole("button", { name: "Start new semester" }).click();
    await expect(page.getByRole("status")).toHaveText("New semester started");
    expect(asked).toContain("Sunday 17 January 2027");
    expect(asked).toMatch(/\d+ weekly class(es)?, \d+ calendar items?, \d+ notices?, \d+ course files?/);
    expect(asked).toContain("moves to the Archive");
    expect(asked).toContain("General files stay");

    // What a classmate sees: the new semester is empty, the old one is in the Archive.
    const visitor = await (await browser.newContext()).newPage();
    await visitor.goto("/?week=2027-01-17");
    await expect(visitor.locator(".dt h1")).toHaveText("Schedule of Week 1");
    await expect(visitor.getByRole("region", { name: "Calendar" }).getByRole("button")).toHaveCount(0);
    await visitor.goto("/notices");
    await expect(visitor.getByRole("article")).toHaveCount(0);
    await visitor.goto("/files");
    await expect(visitor.getByText("Class master list").filter({ visible: true })).toBeVisible(); // a General file
    await visitor.goto("/courses");
    await expect(visitor.getByText("9 courses this semester")).toBeVisible();
    await expect(visitor.getByText("0 classes a week").filter({ visible: true })).toHaveCount(9);
    // The old semester's course files are not on the live Files page.
    await visitor.goto("/files?course=MICROP");
    await expect(visitor.getByText("Lab manual")).toHaveCount(0);

    await visitor.goto("/archive");
    await visitor.getByRole("link", { name: /Semester of Sunday 15 November 2026/ }).click();
    await expect(visitor).toHaveURL(/\/archive\/[0-9a-f-]{36}/);
    await expect(visitor.locator("h1")).toHaveText("Semester of Sunday 15 November 2026");
    await expect(visitor.getByText("Christmas break")).toBeVisible();
    await expect(visitor.getByRole("heading", { name: "Microprocessors" })).toBeVisible();
    await expect(visitor.getByText("ER 301").first()).toBeVisible(); // a weekly class room
    await expect(visitor.getByText("Quiz 1: OSI model")).toBeVisible(); // a calendar item
    await expect(visitor.getByText("Quiz 1 on Tuesday")).toBeVisible(); // a notice
    await expect(visitor.getByRole("link", { name: /Lab manual/ })).toBeVisible(); // a course file
  });
});
