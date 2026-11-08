"use client";

// Unhandled errors here are database outages (loaders catch per-block LoadErrors), e.g. a paused free project.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <div className="box" style={{ padding: 24 }}>
        <p>Class Hub is waking up, try again in a minute.</p>
        <button className="btn" style={{ marginTop: 16 }} onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
