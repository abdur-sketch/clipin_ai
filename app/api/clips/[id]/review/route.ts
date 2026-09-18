import { bindings, currentUser, guardMutation, jsonError, roleAllows, workspaceRole } from "@/lib/server";

async function access(id:string,user:{id:string;email:string}){const clip=await bindings.DB.prepare("SELECT clips.id,projects.user_id AS owner_id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=?").bind(id).first<{id:string;owner_id:string}>();if(!clip)return null;const role=await workspaceRole(clip.owner_id,user);return roleAllows(role,"review")?{...clip,role}:null}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const owned = await access(id,user);
  if (!owned) return jsonError("Clip tidak ditemukan", 404);
  const rows = await bindings.DB.prepare(
    "SELECT * FROM review_comments WHERE clip_id=? ORDER BY created_at DESC LIMIT 100",
  ).bind(id).all();
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
  const owned = await access(id,user);
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
