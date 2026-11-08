import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Class Hub",
  description: "BSCpE 3-C class website",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
