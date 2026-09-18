import {
  bindings,
  currentUser,
  guardMutation,
  jsonError,
  syncD1Record,
} from "@/lib/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const clip = await bindings.DB.prepare(
    "SELECT clips.music_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<{ music_key?: string }>();
  if (!clip?.music_key) return jsonError("Musik belum tersedia", 404);
  const audio = await bindings.MEDIA.get(clip.music_key);
  if (!audio) return jsonError("File musik tidak ditemukan", 404);
  return new Response(audio.body, {
    headers: {
      "content-type": audio.httpMetadata?.contentType || "audio/mpeg",
      "cache-control": "private, max-age=3600",
    },
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "music-upload");
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
  if (!/^audio\/(mpeg|mp4|wav|ogg|webm)$/.test(contentType))
    return jsonError("Musik harus berupa MP3, M4A, WAV, OGG, atau WebM", 415);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 25 * 1024 * 1024)
    return jsonError("Ukuran musik maksimum 25 MB", 413);
  if (!request.body) return jsonError("File musik kosong");
  const key = `music/${user.id}/${id}`;
  await bindings.MEDIA.put(key, request.body, { httpMetadata: { contentType } });
  await bindings.DB.prepare(
    "UPDATE clips SET music_key=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({ ok: true, key });
}
