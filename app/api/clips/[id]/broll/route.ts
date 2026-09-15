import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "broll-upload");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const contentType = request.headers.get("content-type") || "";
  if (!/^image\/(png|jpeg|webp)$/.test(contentType))
    return jsonError("B-roll harus berupa PNG, JPG, atau WebP", 415);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 12 * 1024 * 1024)
    return jsonError("Ukuran B-roll maksimum 12 MB", 413);
  if (!request.body) return jsonError("File B-roll kosong");
  const extension =
    contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const key = `broll/${user.id}/${id}.${extension}`;
  await bindings.MEDIA.put(key, request.body, {
    httpMetadata: { contentType },
  });
  await bindings.DB.prepare(
    "UPDATE clips SET broll_key=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  return Response.json({ ok: true, key });
}
