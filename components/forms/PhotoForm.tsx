"use client";
import Link from "next/link";
import { savePhoto } from "@/app/admin/actions/photos";
import { photoSchema } from "@/lib/schemas";
import type { PhotoRow } from "@/lib/types";
import s from "../Admin.module.css";
import { useAdminForm } from "./useAdminForm";

/** Add or edit a photo link. */
export default function PhotoForm({ photo }: { photo?: PhotoRow }) {
  const { onSubmit, err, busy } = useAdminForm({
    schema: photoSchema,
    action: savePhoto,
    done: () => (photo ? "Saved" : "Photo added"),
    base: "/admin/photos",
    editing: !!photo,
  });
  const heading = photo ? "Edit photo" : "Add a photo";
  return (
    <form className={`box ${s.panel}${photo ? ` ${s.editing}` : ""}`} aria-label={heading} onSubmit={onSubmit} noValidate>
      <h2>{heading}</h2>
      {photo && <input type="hidden" name="id" value={photo.id} />}
      <label>Title<input name="title" defaultValue={photo?.title} maxLength={120} required /></label>
      {err("title")}
      <div className={s.f2}>
        <label>Album<input name="album" defaultValue={photo?.album} placeholder="Intrams 2026" maxLength={60} required /></label>
        <label>When (optional)<input name="taken_on" type="date" defaultValue={photo?.taken_on ?? ""} /></label>
      </div>
      {err("album")}
      {err("taken_on")}
      <label>Image link<input name="url" type="url" defaultValue={photo?.url} placeholder="https://" required /></label>
      {err("url")}
      <button className={`btn p ${s.save}`} disabled={busy}>{photo ? "Save changes" : "Add photo"}</button>
      {photo && <Link className={s.cancel} href="/admin/photos" scroll={false}>Cancel editing</Link>}
    </form>
  );
}
