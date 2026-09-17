import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";

async function ownedClip(id: string, userId: string) {
  return bindings.DB.prepare(
    "SELECT clips.*,projects.storage_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, userId)
    .first();
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const clip = await ownedClip(id, user.id);
  if (!clip?.thumbnail_key) return jsonError("Thumbnail belum dibuat", 404);
  const image = await bindings.MEDIA.get(String(clip.thumbnail_key));
  if (!image) return jsonError("File thumbnail tidak ditemukan", 404);
  return new Response(image.body, {
    headers: {
      "content-type": image.httpMetadata?.contentType || "image/jpeg",
      "content-disposition": `attachment; filename="kliyu-thumbnail-${id}.jpg"`,
      "cache-control": "private, max-age=300",
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "thumbnail-create");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const clip = await ownedClip(id, user.id);
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  return jsonError(
    "Thumbnail sekarang dibuat langsung di Browser Studio. Buka editor klip untuk menangkap frame.",
    409,
  );
}
