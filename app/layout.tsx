import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import "@/styles/tokens.css";

// Fonts live in the repo (Latin, variable weight; licenses in app/fonts), so builds never depend on Google Fonts.
const head = localFont({ src: "./fonts/bricolage-grotesque-latin.woff2", weight: "700 800", variable: "--font-head" });
const body = localFont({ src: "./fonts/figtree-latin.woff2", weight: "400 700", variable: "--font-body" });

export const metadata: Metadata = {
  title: "Class Hub",
  description: "CPE 3C class website",
  appleWebApp: { capable: true, title: "Class Hub" }, // opens full screen from the iPhone home screen
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`}>
      <body>
        <Header />
        {children}
        <Footer />
        <Toast />
      </body>
    </html>
  );
}
