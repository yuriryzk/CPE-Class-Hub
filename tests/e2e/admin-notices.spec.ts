import { expect, test, type Page } from "@playwright/test";

// Needs a fresh `npx supabase db reset`; rows made here use a unique title and are deleted at the end.
const OFFICER = "tests/e2e/.auth/officer.json"; // written by auth.setup.ts
const VIEWER = "tests/e2e/.auth/viewer.json";
const cal = (page: Page) => page.getByRole("region", { name: "Calendar" });
const list = (page: Page, name: string) => page.getByRole("region", { name });

async function confirmDelete(page: Page, row: ReturnType<Page["locator"]>, title: string) {
  let asked = "";
  page.once("dialog", (d) => {
    asked = d.message();
    d.accept();
  });
  await row.getByRole("button", { name: "Delete" }).click();
  await expect(row).toHaveCount(0);
  expect(asked).toBe(`Delete ${title}? This can't be undone.`);
}

test.describe("officer", () => {
  test.use({ storageState: OFFICER });

  test("post a notice with a new calendar item, move the item, delete both", async ({ page }) => {
    const title = `E2E lab report ${Date.now()}`;
    await page.goto("/admin/notices");
    const form = page.getByRole("form", { name: "Post a notice" });
    await form.getByLabel("Course").selectOption({ label: "CNS · Computer Networks and Security" });
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Message").fill("Submit it on the class drive.");
    await form.locator('input[name="posted_on"]').fill("2026-11-16");

    // A zod message shows under the field.
    await form.getByLabel("Link it to a calendar item").check();
    // The item list only offers the chosen course's items; LAWS has none in the seed data.
    await form.getByLabel("Course").selectOption({ label: "LAWS · CpE Laws and Professional Practice" });
    await expect(form.getByLabel("Calendar item").locator("option")).toHaveCount(1);
    await form.getByLabel("Course").selectOption({ label: "CNS · Computer Networks and Security" });
    await form.getByRole("button", { name: "Post notice" }).click();
    await expect(form.getByText("Pick a calendar item")).toBeVisible();

    await form.getByLabel("Add it as a new calendar item").check();
    await form.getByLabel("What is it?").selectOption({ label: "Due" });
    await form.getByLabel("Group").selectOption({ label: "G2 only" });
    await form.locator('input[name="new_date"]').fill("2026-11-18");
    await form.getByLabel("Time (optional)").fill("3:00 PM");
    await form.getByRole("button", { name: "Post notice" }).click();
    await expect(page.getByRole("status")).toHaveText("Posted and on the calendar");
    await expect(list(page, "Notices").getByText(title)).toBeVisible();

    await page.goto("/?week=2026-11-15");
    const card = cal(page).getByRole("button", { name: new RegExp(title) });
    await expect(card).toBeVisible();
    await expect(card).toContainText("Due · G2");
    await expect(card).not.toContainText("Moved");

    await page.goto("/admin/calendar");
    const row = list(page, "Calendar").locator("div", { has: page.getByText(title, { exact: true }) }).filter({ has: page.getByRole("link", { name: "Edit" }) }).last();
    await row.getByRole("link", { name: "Edit" }).click();
    const edit = page.getByRole("form", { name: "Edit calendar item" });
    await expect(edit.getByLabel("Title")).toHaveValue(title);
    await expect(row).toHaveAttribute("aria-current", "true");
    await edit.getByLabel("Date").fill("2026-11-20");
    await edit.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByRole("status")).toHaveText("Saved");
    await expect(page.getByRole("form", { name: "Add to the calendar" })).toBeVisible();
    await expect(row).toContainText("Due · G2 · Fri 20 Nov · 3:00 PM · moved from Wed 18 Nov · has a notice");

    await page.goto("/?week=2026-11-15");
    await expect(cal(page).getByRole("button", { name: new RegExp(title) })).toContainText("Moved");

    await page.goto("/admin/calendar");
    await confirmDelete(page, row, title);
    await page.goto("/admin/notices");
    const noticeRow = list(page, "Notices").locator("div", { has: page.getByText(title, { exact: true }) }).filter({ has: page.getByRole("link", { name: "Edit" }) }).last();
    await confirmDelete(page, noticeRow, title);
  });

  test("a notice linked to an item in another week still shows its calendar link", async ({ page }) => {
    const title = `E2E far item ${Date.now()}`;
    await page.goto("/admin/notices");
    const form = page.getByRole("form", { name: "Post a notice" });
    await form.getByLabel("Course").selectOption({ label: "CNS · Computer Networks and Security" });
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Message").fill("The item is weeks after this notice.");
    await form.locator('input[name="posted_on"]').fill("2026-11-16");
    await form.getByLabel("Add it as a new calendar item").check();
    await form.getByLabel("What is it?").selectOption({ label: "Due" });
    await form.locator('input[name="new_date"]').fill("2026-12-08");
    await form.getByRole("button", { name: "Post notice" }).click();
    await expect(page.getByRole("status")).toHaveText("Posted and on the calendar");

    await page.goto("/?week=2026-11-15");
    const card = page.getByRole("region", { name: "Posted this week" }).getByRole("article").filter({ hasText: title });
    await expect(card).toContainText(/On the calendar: Due, [A-Z][a-z]{2} 8 Dec/);

    await page.goto("/admin/calendar");
    const row = list(page, "Calendar").locator("div", { has: page.getByText(title, { exact: true }) }).filter({ has: page.getByRole("link", { name: "Edit" }) }).last();
    await confirmDelete(page, row, title);
    await page.goto("/admin/notices");
    const noticeRow = list(page, "Notices").locator("div", { has: page.getByText(title, { exact: true }) }).filter({ has: page.getByRole("link", { name: "Edit" }) }).last();
    await confirmDelete(page, noticeRow, title);
  });
});

test.describe("signed in, not an officer", () => {
  test.use({ storageState: VIEWER });

  test("/admin says so, with Sign out and Back to the week", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "This account isn't an officer" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to the week" })).toBeVisible();
  });
});
