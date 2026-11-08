import { expect, test } from "@playwright/test";

// Needs a fresh `npx supabase db reset`; the class made here has a unique room and is deleted at the end.
const OFFICER = "tests/e2e/.auth/officer.json";
const VIEWER = "tests/e2e/.auth/viewer.json";

test.describe("officer", () => {
  test.use({ storageState: OFFICER });

  test("add a G2 class, cancel it for one week, restore it, delete it", async ({ page }) => {
    const room = `E2E Room ${Date.now()}`;
    await page.goto("/admin/classes");
    const form = page.getByRole("form", { name: "Add a weekly class" });
    await form.getByLabel("Course").selectOption({ label: "CNS · Computer Networks and Security" });
    await form.getByLabel("Day").selectOption({ label: "Thursday" });
    await form.getByLabel("Group").selectOption({ label: "G2 only" });
    await form.getByLabel("Starts").fill("5:00 PM");
    await form.getByLabel("Ends").fill("4:00 PM");
    await form.getByRole("button", { name: "Add class" }).click();
    await expect(form.getByText("End time must be after the start time")).toBeVisible();
    await form.getByLabel("Ends").fill("6:00 PM");
    await form.getByLabel("Room").fill(room);
    await form.getByRole("button", { name: "Add class" }).click();
    await expect(page.getByRole("status")).toHaveText("Class added");
    const row = page.getByRole("region", { name: "Weekly classes" }).locator("div", { has: page.getByText(room) }).filter({ has: page.getByRole("button", { name: "Delete" }) }).last();
    await expect(row).toContainText(`Computer Networks and Security · G2 · ${room}`);

    const card = (week: string) => page.goto(`/?week=${week}`).then(() => page.getByRole("region", { name: "Calendar" }).getByRole("button").filter({ hasText: room }));
    const thisWeek = await card("2026-11-15");
    await expect(thisWeek).toContainText("Class · G2");
    await thisWeek.click();
    const dlg = page.getByRole("dialog");
    await expect(dlg.getByText("Officers only")).toBeVisible();
    await dlg.getByRole("button", { name: "Cancel this class on Thu 19 Nov only" }).click();
    await expect(page.getByRole("status")).toHaveText("Class cancelled for Thu 19 Nov");
    await expect(dlg.getByRole("button", { name: "Restore this class" })).toBeVisible();
    await dlg.getByRole("button", { name: "Close" }).click();
    await expect(thisWeek).toContainText("Cancelled");
    await expect(await card("2026-11-22")).toContainText("Class · G2");

    await (await card("2026-11-15")).click();
    await page.getByRole("dialog").getByRole("button", { name: "Restore this class" }).click();
    await expect(page.getByRole("status")).toHaveText("Class restored");
    await page.getByRole("dialog").getByRole("button", { name: "Close" }).click();
    await expect(await card("2026-11-15")).toContainText("Class · G2");

    await page.goto("/admin/classes");
    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete" }).click();
    await expect(row).toHaveCount(0);
  });
});

test.describe("visitor", () => {
  test.use({ storageState: VIEWER });

  test("the class dialog has no officer footer", async ({ page }) => {
    await page.goto("/?week=2026-11-15");
    await page.getByRole("region", { name: "Calendar" }).getByRole("button").filter({ hasText: /Class/ }).first().click();
    await expect(page.getByRole("dialog").getByRole("heading", { name: /.+/ }).first()).toBeVisible();
    await expect(page.getByText("Officers only")).toHaveCount(0);
  });
});
