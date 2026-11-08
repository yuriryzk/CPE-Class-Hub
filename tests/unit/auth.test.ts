import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ user: null as null | { email: string }, role: null as null | string }));

// Fake Supabase client: session user + the officers lookup. No network.
vi.mock("@/lib/supabase/server", () => ({
  serverClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: state.role && { role: state.role } }) }) }) }),
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revalidatePath } from "next/cache";
import { withOfficer } from "@/lib/auth";

const NOT_OFFICER = { ok: false, message: "This account isn't an officer" };

beforeEach(() => {
  state.user = { email: "a@x.com" };
  state.role = "officer";
  vi.clearAllMocks();
});

describe("withOfficer", () => {
  it("refuses a non-officer and never runs fn", async () => {
    state.role = null;
    const fn = vi.fn();
    expect(await withOfficer(fn)).toEqual(NOT_OFFICER);
    expect(fn).not.toHaveBeenCalled();
  });

  it("refuses a signed-out visitor", async () => {
    state.user = null;
    const fn = vi.fn();
    expect(await withOfficer(fn)).toEqual(NOT_OFFICER);
    expect(fn).not.toHaveBeenCalled();
  });

  it("translates a duplicate course code", async () => {
    const fn = async () => { throw { code: "23505" }; };
    expect(await withOfficer(fn, { courseCode: "CNS" })).toEqual({ ok: false, message: "Another course already uses CNS" });
  });

  it("translates a duplicate officer and a duplicate break", async () => {
    const dup = (message: string) => async () => { throw { code: "23505", message }; };
    expect(await withOfficer(dup('duplicate key value violates unique constraint "officers_pkey"'))).toEqual({ ok: false, message: "That email is already an officer" });
    expect(await withOfficer(dup('duplicate key value violates unique constraint "term_breaks_pkey"'))).toEqual({ ok: false, message: "That week is already a break" });
  });

  it("translates a row-level-security refusal", async () => {
    const fn = async () => { throw { code: "42501" }; };
    expect(await withOfficer(fn)).toEqual(NOT_OFFICER);
  });

  it("returns ok and revalidates on success", async () => {
    expect(await withOfficer(async () => "done")).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});
