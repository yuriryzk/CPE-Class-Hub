"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { browserClient } from "@/lib/supabase/browser";

function SignIn() {
  const failed = useSearchParams().get("error");
  const signIn = () =>
    browserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${location.origin}/auth/callback` } });
  return (
    <main>
      <div className="box" style={{ padding: 24, maxWidth: 420 }}>
        <h1>Officers sign in with Google</h1>
        {failed && <p role="alert" style={{ marginTop: 12 }}>{failed}</p>}
        <button className="btn p" style={{ marginTop: 16 }} onClick={signIn}>Sign in with Google</button>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense><SignIn /></Suspense>;
}
