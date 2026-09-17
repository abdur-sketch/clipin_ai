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
  const contentType = request.headers.get("content-type") || "";
  if (!/^image\/(jpeg|png|webp)$/.test(contentType))
    return jsonError("Thumbnail harus berupa JPG, PNG, atau WebP", 415);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 8 * 1024 * 1024)
    return jsonError("Ukuran thumbnail maksimum 8 MB", 413);
  if (!request.body) return jsonError("Thumbnail kosong");
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const key = `thumbnails/${user.id}/${id}.${extension}`;
  await bindings.MEDIA.put(key, request.body, { httpMetadata: { contentType } });
  await bindings.DB.prepare(
    "UPDATE clips SET thumbnail_key=?,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  return Response.json({ ok: true, downloadUrl: `/api/clips/${id}/thumbnail` });
}
