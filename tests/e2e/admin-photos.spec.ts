import { expect, test } from "@playwright/test";

// Needs a fresh `npx supabase db reset`. Seed photos: two in "Intrams 2026", one in "Org Trip".
const OFFICER = "tests/e2e/.auth/officer.json";

test.describe("head officer", () => {
  test.use({ storageState: OFFICER });

  test("add a photo, see it grouped by album, edit and delete it", async ({ page }) => {
    const title = `E2E summit ${Date.now()}`;
    await page.goto("/admin/photos");
    const form = page.getByRole("form", { name: "Add a photo" });
    await form.getByLabel("Title").fill(title);
    await form.getByLabel("Album").fill("E2E Album");
    await form.getByLabel("Image link").fill("javascript:alert(1)");
    await form.getByRole("button", { name: "Add photo" }).click();
    await expect(form.getByText("Links must start with https://")).toBeVisible();
    await form.getByLabel("Image link").fill("https://example.com/e2e.jpg");
    await form.getByRole("button", { name: "Add photo" }).click();
    await expect(page.getByRole("status")).toHaveText("Photo added");

    await page.goto("/photos");
    const section = page.getByRole("region", { name: "E2E Album" });
    const link = section.getByRole("link", { name: new RegExp(title) });
    await expect(link).toHaveAttribute("href", "https://example.com/e2e.jpg");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("region", { name: "Intrams 2026" }).getByRole("link", { name: /Relay finals/ })).toBeVisible();

    await page.goto("/admin/photos");
    const row = page.getByRole("region", { name: "Photos" }).locator("div", { has: page.getByText(title) }).filter({ has: page.getByRole("button", { name: "Delete" }) }).last();
    await row.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("form", { name: "Edit photo" }).getByLabel("Album")).toHaveValue("E2E Album");
    await page.getByRole("link", { name: "Cancel editing" }).click();

    page.once("dialog", (d) => d.accept());
    await row.getByRole("button", { name: "Delete" }).click();
    // The list refreshes in place; /photos itself is cached for a minute.
    await expect(page.getByText(title)).toHaveCount(0);
  });
});
