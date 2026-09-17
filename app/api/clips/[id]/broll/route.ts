import { bindings, currentUser, guardMutation, jsonError, syncD1Record } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const clip = await bindings.DB.prepare("SELECT clips.broll_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first<{broll_key?:string}>();
  if (!clip?.broll_key) return jsonError("B-roll belum tersedia",404);
  const image=await bindings.MEDIA.get(clip.broll_key);
  if(!image)return jsonError("File B-roll tidak ditemukan",404);
  return new Response(image.body,{headers:{"content-type":image.httpMetadata?.contentType||"image/jpeg","cache-control":"private, max-age=3600"}});
}

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
  await syncD1Record("clips", id);
  return Response.json({ ok: true, key });
}
