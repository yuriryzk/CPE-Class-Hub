"use client";

/** Opens the browser's print dialog; the @media print styles do the rest. */
export default function PrintButton() {
  return <button type="button" className="btn s" onClick={() => window.print()}>Print</button>;
}
