import { bindings, currentUser, jsonError } from "@/lib/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const project = await bindings.DB.prepare(
    "SELECT storage_key,content_type,filename FROM projects WHERE id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first<{ storage_key?: string; content_type?: string; filename?: string }>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  if (!project.storage_key)
    return jsonError("Video asli project belum tersimpan", 404);
  const object = await bindings.MEDIA.get(project.storage_key);
  if (!object) return jsonError("Video asli tidak ditemukan", 404);
  return new Response(object.body, {
    headers: {
      "content-type":
        object.httpMetadata?.contentType ||
        project.content_type ||
        "video/mp4",
      "content-length": String(object.size),
      "cache-control": "private, max-age=300",
      "content-disposition": `inline; filename="${(project.filename || "video.mp4").replace(/["\\]/g, "")}"`,
    },
  });
}
