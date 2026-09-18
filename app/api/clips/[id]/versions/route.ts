import { bindings, currentUser, guardMutation, jsonError, roleAllows, workspaceRole } from "@/lib/server";

async function editableClip(id:string,user:{id:string;email:string}){const clip=await bindings.DB.prepare("SELECT clips.*,projects.user_id AS owner_id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=?").bind(id).first<Record<string,unknown>>();if(!clip)return null;return roleAllows(await workspaceRole(String(clip.owner_id),user),"edit")?clip:null}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  const { id } = await params;
  const clip=await editableClip(id,user);if(!clip) return jsonError("Clip tidak ditemukan atau akses ditolak", 404);
  const rows = await bindings.DB.prepare(
    "SELECT id,label,created_at FROM clip_versions WHERE clip_id=? AND user_id=? ORDER BY created_at DESC LIMIT 30",
  )
    .bind(id, String(clip.owner_id))
    .all();
  return Response.json({ versions: rows.results });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "clip-version");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const clip = await editableClip(id,user);
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    versionId?: string;
    label?: string;
  };
  if (body.action === "restore" && body.versionId) {
    const version = await bindings.DB.prepare(
      "SELECT snapshot FROM clip_versions WHERE id=? AND clip_id=? AND user_id=?",
    )
      .bind(body.versionId, id, String(clip.owner_id))
      .first<{ snapshot?: string }>();
    if (!version?.snapshot) return jsonError("Versi tidak ditemukan", 404);
    const snapshot = JSON.parse(version.snapshot) as Record<string, unknown>;
    await bindings.DB.prepare(
      "UPDATE clips SET title=?,hook=?,caption=?,start_time=?,end_time=?,subtitles=?,style=?,aspect_ratio=?,font_size=?,font_family=?,font_color=?,font_effect=?,title_effect=?,title_animation=?,title_position=?,caption_position=?,updated_at=? WHERE id=?",
    )
      .bind(
        snapshot.title,
        snapshot.hook,
        snapshot.caption,
        snapshot.start_time,
        snapshot.end_time,
        snapshot.subtitles,
        snapshot.style,
        snapshot.aspect_ratio,
        snapshot.font_size,
        snapshot.font_family,
        snapshot.font_color,
        snapshot.font_effect,
        snapshot.title_effect,
        snapshot.title_animation,
        snapshot.title_position,
        snapshot.caption_position,
        Date.now(),
        id,
      )
      .run();
    return Response.json({ ok: true, restored: body.versionId });
  }
  const versionId = `ver_${crypto.randomUUID()}`;
  await bindings.DB.prepare(
    "INSERT INTO clip_versions (id,clip_id,user_id,label,snapshot,created_at) VALUES (?,?,?,?,?,?)",
  )
    .bind(
      versionId,
      id,
      String(clip.owner_id),
      String(body.label || "Manual save").slice(0, 80),
      JSON.stringify(clip),
      Date.now(),
    )
    .run();
  return Response.json({ ok: true, id: versionId }, { status: 201 });
}
