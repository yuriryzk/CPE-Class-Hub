import type { PhotoRow } from "@/lib/types";
import { formatShort } from "@/lib/time";
import s from "./PhotoGrid.module.css";

/** The memories wall: photos as a grid; each opens the full image in a new tab. */
export default function PhotoGrid({ photos }: { photos: PhotoRow[] }) {
  return (
    <ul className={s.grid}>
      {photos.map((p) => (
        <li key={p.id}>
          <a className={s.ph} href={p.url} target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element -- external links, no image host to configure */}
            <img src={p.url} alt={p.title} loading="lazy" />
            <span className={s.cap}><b>{p.title}</b>{p.taken_on && <small>{formatShort(p.taken_on)}</small>}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
