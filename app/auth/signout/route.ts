import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  await (await serverClient()).auth.signOut();
  return NextResponse.redirect(new URL("/", req.url), 303);
}
