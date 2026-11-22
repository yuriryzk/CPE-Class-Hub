import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import InstallPrompt from "@/components/InstallPrompt";
import Toast from "@/components/Toast";
import "@/styles/tokens.css";

// Fonts live in the repo (Latin, variable weight; licenses in app/fonts), so builds never depend on Google Fonts.
const head = localFont({ src: "./fonts/bricolage-grotesque-latin.woff2", weight: "700 800", variable: "--font-head" });
const body = localFont({ src: "./fonts/figtree-latin.woff2", weight: "400 700", variable: "--font-body" });

export const metadata: Metadata = {
  metadataBase: new URL("https://cpe-class-hub.vercel.app"), // full image links in link previews
  title: "Class Hub",
  description: "CPE 3C’s schedule, notices, files, photos and courses in one place.",
  appleWebApp: { capable: true, title: "Class Hub" }, // opens full screen from the iPhone home screen
};
// Before paint: the phones' Schedule view, and a theme the visitor picked (none = follow the device), so nothing flashes.
const VIEW_SCRIPT = `try{var d=document.documentElement,t=localStorage.getItem("classhub.theme");d.dataset.view=localStorage.getItem("classhub.calendarView")==="week"?"week":"day";if(t==="light"||t==="dark")d.dataset.theme=t}catch(e){}`;

// The phone's title bar takes the header's colour in each theme (ThemeSwitch overrides it when one is picked).
export const viewport: Viewport = {
  width: "device-width", initialScale: 1, viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#262626" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${head.variable} ${body.variable}`} suppressHydrationWarning>
      <body>
        {/* Phones' Schedule view (day summary or Week), set before paint so the page never swaps after loading */}
        <script dangerouslySetInnerHTML={{ __html: VIEW_SCRIPT }} />
        <Header />
        {children}
        <Footer />
        <Toast />
        <InstallPrompt />
      </body>
    </html>
  );
}
