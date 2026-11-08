import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { test as setup } from "@playwright/test";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

// Local Supabase only: keys come from the running stack, never from committed files.
const OFFICER = "tests/e2e/.auth/officer.json";
const VIEWER = "tests/e2e/.auth/viewer.json";

const env: Record<string, string> = Object.fromEntries(
  execSync("npx supabase status -o env", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    .split(/\r?\n/)
    .flatMap((l) => {
      const m = l.match(/^(\w+)="?(.*?)"?$/);
      return m ? [[m[1], m[2]]] : [];
    }),
);

async function signedInState(email: string, path: string) {
  const admin = createClient(env.API_URL, env.SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const password = randomUUID();
  const { data, error } = await admin.auth.admin.listUsers();
  if (error) throw error;
  const user = data.users.find((u) => u.email === email);
  const res = user
    ? await admin.auth.admin.updateUserById(user.id, { password })
    : await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (res.error) throw res.error;

  // Sign in the way the app's server client does, so the cookies match what @supabase/ssr reads.
  const jar = new Map<string, string>();
  const db = createServerClient(env.API_URL, env.ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (all) => all.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  });
  const signIn = await db.auth.signInWithPassword({ email, password });
  if (signIn.error) throw signIn.error;
  if (!jar.size) throw new Error("Sign-in set no cookies");

  mkdirSync("tests/e2e/.auth", { recursive: true });
  const cookies = [...jar].map(([name, value]) => ({
    name, value, domain: "localhost", path: "/", expires: -1, httpOnly: false, secure: false, sameSite: "Lax" as const,
  }));
  writeFileSync(path, JSON.stringify({ cookies, origins: [] }));
  return admin;
}

setup("officer and viewer sessions", async () => {
  const admin = await signedInState("officer@test.local", OFFICER);
  const { error } = await admin.from("officers").upsert({ email: "officer@test.local", role: "head" });
  if (error) throw error;
  await signedInState("viewer@test.local", VIEWER);
  // Leftovers from an admin test that failed before its own cleanup.
  for (const table of ["notices", "calendar_items"]) {
    const { error: e } = await admin.from(table).delete().like("title", "E2E %");
    if (e) throw e;
  }
});
