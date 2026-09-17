import {
  bindings,
  currentUser,
  guardMutation,
  jsonError,
  syncD1Record,
} from "@/lib/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "browser-caption");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const body = (await request.json()) as {
    hook?: string;
    caption?: string;
    cta?: string;
    hashtags?: string[];
  };
  const hook = String(body.hook || "").trim().slice(0, 180);
  const caption = String(body.caption || "").trim().slice(0, 1500);
  const cta = String(body.cta || "").trim().slice(0, 180);
  const hashtags = (body.hashtags || [])
    .map((item) => String(item).trim())
    .filter((item) => /^#[\p{L}\p{N}_]+$/u.test(item))
    .slice(0, 12);
  if (!hook || !caption || !cta || !hashtags.length)
    return jsonError("Hasil caption Browser AI tidak lengkap");
  await bindings.DB.prepare(
    "UPDATE clips SET post_caption=?,post_cta=?,post_hashtags=?,updated_at=? WHERE id=?",
  )
    .bind(`${hook}\n\n${caption}`, cta, JSON.stringify(hashtags), Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({ hook, caption, cta, hashtags });
}
