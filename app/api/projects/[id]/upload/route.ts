import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";
import { firebasePatch } from "@/lib/firebase";
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "upload");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const project = await bindings.DB.prepare(
    "SELECT id FROM projects WHERE id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  const type =
    request.headers.get("content-type") ?? "application/octet-stream";
  if (!type.startsWith("video/"))
    return jsonError("File harus berupa video", 415);
  const size = Number(request.headers.get("content-length") ?? 0);
  if (size > 2 * 1024 * 1024 * 1024)
    return jsonError("Ukuran maksimum 2 GB", 413);
  if (!request.body) return jsonError("File video kosong");
  const key = `users/${user.id}/projects/${id}/source`;
  await bindings.MEDIA.put(key, request.body, {
    httpMetadata: { contentType: type },
  });
  await bindings.DB.prepare(
    "UPDATE projects SET storage_key=?,content_type=?,status='uploaded',progress=15,updated_at=? WHERE id=?",
  )
    .bind(key, type, Date.now(), id)
    .run();
  await firebasePatch("projects", id, {
    storage_key: key,
    content_type: type,
    status: "uploaded",
    progress: 15,
    updated_at: Date.now(),
  });
  return Response.json({ ok: true, key });
}
