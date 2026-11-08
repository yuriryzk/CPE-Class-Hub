import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// async because cookies() is async in Next 15
export async function serverClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (all) => {
        // Server Components cannot set cookies; the session refresh happens where they can.
        try {
          all.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {}
      },
    },
  });
}
