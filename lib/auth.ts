import { revalidatePath } from "next/cache";
import { serverClient } from "@/lib/supabase/server";

export type Officer = { email: string; role: "head" | "officer"; name: string };
export type ActionResult = { ok: true } | { ok: false; message: string };

export const NOT_OFFICER_MESSAGE = "This account isn't an officer";

export class NotOfficerError extends Error {
  constructor() {
    super(NOT_OFFICER_MESSAGE);
  }
}

// Signed in AND listed in `officers` (the table allows a user to read only their own row).
export async function getOfficer(): Promise<Officer | null> {
  const db = await serverClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user?.email) return null;
  const { data } = await db.from("officers").select("role").eq("email", user.email.toLowerCase()).maybeSingle();
  if (!data) return null;
  const name = user.user_metadata?.full_name;
  return { email: user.email, role: data.role, name: typeof name === "string" && name ? name : user.email };
}

export async function requireOfficer(): Promise<Officer> {
  const officer = await getOfficer();
  if (!officer) throw new NotOfficerError();
  return officer;
}

// Wraps every Server Action. courseCode names the course for the duplicate-code message.
export async function withOfficer(
  fn: (o: Officer) => Promise<unknown>,
  ctx: { courseCode?: string } = {},
): Promise<ActionResult> {
  try {
    await fn(await requireOfficer());
  } catch (e) {
    if (e instanceof NotOfficerError) return { ok: false, message: e.message };
    const code = (e as { code?: string } | null)?.code;
    if (code === "42501") return { ok: false, message: NOT_OFFICER_MESSAGE };
    if (code === "23505" && ctx.courseCode) return { ok: false, message: `Another course already uses ${ctx.courseCode}` };
    return { ok: false, message: "Couldn't save. Try again." };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
