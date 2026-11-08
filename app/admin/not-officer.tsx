import Link from "next/link";

export default function NotOfficer() {
  return (
    <main>
      <div className="box" style={{ padding: 24, maxWidth: 420 }}>
        <h1>This account isn&apos;t an officer</h1>
        <p style={{ marginTop: 12 }}>Sign in with an account that an officer has added.</p>
        <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
          <form action="/auth/signout" method="post"><button className="btn p">Sign out</button></form>
          <Link className="btn" href="/">Back to the week</Link>
        </div>
      </div>
    </main>
  );
}
