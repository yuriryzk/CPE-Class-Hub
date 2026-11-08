"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "./Header.module.css";

const LINKS = [["/", "Schedule"], ["/notices", "Notices"], ["/files", "Files"]] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <nav className={s.nav} aria-label="Main">
      {LINKS.map(([href, label]) => (
        <Link key={href} href={href} aria-current={(href === "/" ? path === "/" : path.startsWith(href)) ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
