import { bindings, currentUser, guardMutation, jsonError, syncD1Record } from "@/lib/server";

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
  if (!bindings.LOCAL_RENDER_BASE_URL)
    return jsonError("Generator thumbnail lokal belum aktif", 503);
  const source = clip.storage_key
    ? await bindings.MEDIA.get(String(clip.storage_key))
    : null;
  if (!source) return jsonError("Video sumber tidak ditemukan", 404);
  const form = new FormData();
  form.append(
    "video",
    new File([await source.arrayBuffer()], "source-video", {
      type: source.httpMetadata?.contentType || "application/octet-stream",
    }),
  );
  form.append(
    "config",
    JSON.stringify({
      timestamp: Math.max(
        Number(clip.start_time || 0),
        Math.min(
          Number(clip.end_time || 1) - 0.1,
          Number(clip.start_time || 0) + 1.5,
        ),
      ),
      aspectRatio: clip.aspect_ratio || "9:16",
    }),
  );
  const generated = await fetch(
    `${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/thumbnail`,
    { method: "POST", body: form },
  );
  if (!generated.ok)
    return jsonError(
      ((await generated.json().catch(() => ({}))) as { error?: string })
        .error || "Thumbnail gagal dibuat",
      502,
    );
  const key = `thumbnails/${user.id}/${id}.jpg`;
  await bindings.MEDIA.put(key, await generated.arrayBuffer(), {
    httpMetadata: { contentType: "image/jpeg" },
  });
  await bindings.DB.prepare(
    "UPDATE clips SET thumbnail_key=?,updated_at=? WHERE id=?",
  )
    .bind(key, Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({
    ok: true,
    downloadUrl: `/api/clips/${id}/thumbnail`,
  });
}
