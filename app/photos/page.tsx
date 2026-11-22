import { loadPhotos, LoadError } from "@/lib/data";
import PhotoGrid from "@/components/photos/PhotoGrid";

export const revalidate = 60;

export default async function Photos() {
  let photos;
  try {
    photos = await loadPhotos();
  } catch (e) {
    if (!(e instanceof LoadError)) throw e;
    return <main><div className="title"><h1>Photos</h1></div><p className="box empty">Couldn&apos;t load the {e.what}. <a href="/photos">Try again.</a></p></main>;
  }
  // Newest first; albums keep the order their newest photo was added in.
  const albums = [...new Set(photos.map((p) => p.album))].map((album) => ({
    album,
    photos: photos.filter((p) => p.album === album),
  }));

  return (
    <main>
      <div className="title"><h1>Photos</h1><p className="sub">Trips, intrams and meetings, from the whole class.</p></div>
      {albums.length ? albums.map(({ album, photos: ps }) => (
        <section key={album} aria-label={album} style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, marginBottom: 12 }}>{album}</h2>
          <PhotoGrid photos={ps} />
        </section>
      )) : <p className="box empty">No photos yet.</p>}
    </main>
  );
}
