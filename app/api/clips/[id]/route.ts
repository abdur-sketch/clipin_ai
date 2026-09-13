import { bindings, currentUser, jsonError } from "@/lib/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const body = await request.json() as Record<string, unknown>;
  const owned = await bindings.DB.prepare("SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first();
  if (!owned) return jsonError("Clip tidak ditemukan",404);
  const ratio = ["9:16","1:1","16:9"].includes(String(body.aspectRatio)) ? String(body.aspectRatio) : "9:16";
  const fontSize = Math.min(80,Math.max(24,Number(body.fontSize ?? 48)));
  const start = Math.max(0, Number(body.startTime ?? 0));
  const end = Number(body.endTime ?? 0);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return jsonError("Rentang trim tidak valid");
  await bindings.DB.prepare("UPDATE clips SET title=?,hook=?,caption=?,start_time=?,end_time=?,style=?,face_tracking=?,hook_overlay=?,aspect_ratio=?,font_size=?,watermark=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?")
    .bind(String(body.title ?? ""),String(body.hook ?? ""),String(body.caption ?? ""),start,end,String(body.style ?? "bold"),body.faceTracking ? 1 : 0,body.hookOverlay ? 1 : 0,ratio,fontSize,body.watermark ? 1 : 0,Date.now(),id).run();
  return Response.json({ok:true});
}
