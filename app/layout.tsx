import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Figtree } from "next/font/google";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import Toast from "@/components/Toast";
import "@/styles/tokens.css";

const head = Bricolage_Grotesque({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-head" });
const body = Figtree({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = { title: "Class Hub", description: "CPE 3C class website" };
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
