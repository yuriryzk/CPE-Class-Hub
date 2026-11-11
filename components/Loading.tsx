/** Shown at once while the next page is built on the server, so taps respond instead of freezing. */
export default function Loading() {
  return (
    <main aria-busy="true">
      <p className="box empty" role="status">Loading…</p>
    </main>
  );
}
