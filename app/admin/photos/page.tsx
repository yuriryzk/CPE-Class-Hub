import Link from "next/link";
import { deletePhoto } from "@/app/admin/actions/photos";
import AdminPage from "@/components/AdminPage";
import AdminRow from "@/components/AdminRow";
import ConfirmDelete from "@/components/ConfirmDelete";
import PhotoForm from "@/components/forms/PhotoForm";
import { loadPhotos } from "@/lib/data";
import { formatShort } from "@/lib/time";

export default async function AdminPhotos({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const [photos] = await Promise.all([loadPhotos()]);
  const editing = photos.find((p) => p.id === edit);

  return (
    <AdminPage tab="photos" form={<PhotoForm key={editing?.id ?? "new"} photo={editing} />} list="Photos" count={photos.length}>
      {photos.map((p) => (
        <AdminRow
          key={p.id}
          title={p.title}
          details={[p.album, p.taken_on ? formatShort(p.taken_on) : null].filter(Boolean).join(" · ")}
          editing={p.id === editing?.id}
          actions={<>
            <Link className="btn s" href={`/admin/photos?edit=${p.id}`}>Edit</Link>
            <ConfirmDelete title={p.title} action={deletePhoto.bind(null, p.id)} />
          </>}
        />
      ))}
    </AdminPage>
  );
}
