import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// Local only: the cron secret comes from .env.local, the service key from the running local Supabase.
const cronSecret = readFileSync(".env.local", "utf8").match(/^CRON_SECRET=(.+)$/m)?.[1]?.trim() ?? "";
const status = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split(/\r?\n/).flatMap((l) => { const m = l.match(/^(\w+)="?(.*?)"?$/); return m ? [[m[1], m[2]]] : []; }),
);
const admin = () => createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const footer = (page: import("@playwright/test").Page) => page.getByRole("contentinfo");

test("the daily summary route refuses calls without the cron secret", async ({ request }) => {
  expect((await request.get("/api/cron/digest")).status()).toBe(401);
  expect((await request.get("/api/cron/digest", { headers: { authorization: "Bearer wrong" } })).status()).toBe(401);
});

test("the daily summary goes to each phone once a day", async ({ request }) => {
  expect(cronSecret, "CRON_SECRET in .env.local").not.toBe("");
  // A phone subscribed long ago, so the seeded notices count as new. Nothing listens on port 9, so the send fails
  // without reaching a real push service; the claim still counts, and a second run the same day claims nothing.
  const endpoint = `https://127.0.0.1:9/e2e-${Date.now()}`;
  const db = admin();
  await db.from("push_subscriptions").insert({ endpoint, p256dh: "BNc", auth: "abc", created_at: "2000-01-01T00:00:00Z" }).throwOnError();
  try {
    const run = async () => (await request.get("/api/cron/digest", { headers: { authorization: `Bearer ${cronSecret}` } })).json();
    expect(await run()).toMatchObject({ claimed: 1, sent: 0, failed: 1, removed: 0 });
    expect(await run()).toMatchObject({ claimed: 0 });
  } finally {
    await db.from("push_subscriptions").delete().eq("endpoint", endpoint);
  }
});

test("blocked notifications say how to allow them", async ({ page }) => {
  await page.goto("/"); // the test browser blocks notifications unless granted
  await footer(page).getByRole("button", { name: "Notifications" }).click();
  await expect(page.getByRole("dialog", { name: "Notifications" })).toContainText("Notifications are blocked for this site");
});

test("the Notifications panel offers courses, lab group and Turn on", async ({ page }) => {
  // Headless Chromium always reports "denied"; a new visitor's browser says "default" (not asked yet).
  await page.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "default" }));
  await page.goto("/");
  await footer(page).getByRole("button", { name: "Notifications" }).click();
  const dlg = page.getByRole("dialog", { name: "Notifications" });
  await expect(dlg.getByRole("button", { name: "Turn on notifications" })).toBeVisible();
  const boxes = dlg.getByRole("group", { name: "Courses" }).getByRole("checkbox");
  await expect(boxes).toHaveCount(9);
  for (const b of await boxes.all()) await expect(b).toBeChecked();
  // Untick all but the last course; the last one cannot be unticked (no courses would mean every course).
  for (const b of (await boxes.all()).slice(0, 8)) await b.uncheck();
  await boxes.last().click();
  await expect(boxes.last()).toBeChecked();
  await expect(dlg.getByRole("group", { name: "Lab group" }).getByRole("radio")).toHaveCount(3);
  await dlg.getByRole("button", { name: "Close" }).click();
  await expect(dlg).toBeHidden();
});

test.describe("iPhone in a Safari tab", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1" });

  test("explains Add to Home Screen instead of offering Turn on", async ({ page }) => {
    // A Safari tab has no PushManager; only Class Hub opened from the Home Screen does.
    await page.addInitScript(() => { delete (window as { PushManager?: unknown }).PushManager; });
    await page.goto("/");
    await footer(page).getByRole("button", { name: "Notifications" }).click();
    const dlg = page.getByRole("dialog", { name: "Notifications" });
    await expect(dlg).toContainText("Add to Home Screen");
    await expect(dlg.getByRole("button", { name: "Turn on notifications" })).toHaveCount(0);
  });
});
