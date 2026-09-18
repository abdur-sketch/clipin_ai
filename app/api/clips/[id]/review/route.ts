import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  ).bind(id, user.id).first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const rows = await bindings.DB.prepare(
    "SELECT * FROM review_comments WHERE clip_id=? AND user_id=? ORDER BY created_at DESC LIMIT 100",
  ).bind(id, user.id).all();
  return Response.json({ reviews: rows.results });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "clip-review");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const owned = await bindings.DB.prepare(
    "SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  ).bind(id, user.id).first();
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const body = (await request.json()) as Record<string, unknown>;
  const message = String(body.message || "").trim().slice(0, 1000);
  const status = ["comment", "revision", "approved"].includes(String(body.status))
    ? String(body.status)
    : "comment";
  if (!message && status === "comment") return jsonError("Komentar wajib diisi");
  const reviewId = `review_${crypto.randomUUID()}`;
  await bindings.DB.prepare(
    "INSERT INTO review_comments (id,clip_id,user_id,author,message,timestamp,status,created_at) VALUES (?,?,?,?,?,?,?,?)",
  ).bind(
    reviewId,
    id,
    user.id,
    String(body.author || user.name).slice(0, 80),
    message || (status === "approved" ? "Klip disetujui" : "Revisi diminta"),
    Math.max(0, Number(body.timestamp || 0)),
    status,
    Date.now(),
  ).run();
  return Response.json({ ok: true, id: reviewId }, { status: 201 });
}
