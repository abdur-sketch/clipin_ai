import { bindings, currentUser, jsonError } from "@/lib/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const clip = await bindings.DB.prepare("SELECT clips.*,projects.storage_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first();
  if (!clip) return jsonError("Clip tidak ditemukan",404);
  if (!bindings.RENDER_SERVICE_URL) {
    await bindings.DB.prepare("UPDATE clips SET status='rendered',updated_at=? WHERE id=?").bind(Date.now(),id).run();
    return Response.json({ ok: true, status: "rendered", mode: "preview" });
  }
  await bindings.DB.prepare("UPDATE clips SET status='rendering',updated_at=? WHERE id=?").bind(Date.now(),id).run();
  const response = await fetch(`${bindings.RENDER_SERVICE_URL}/render`, { method: "POST", headers: { "content-type": "application/json", ...(bindings.RENDER_SERVICE_TOKEN ? { authorization: `Bearer ${bindings.RENDER_SERVICE_TOKEN}` } : {}) }, body: JSON.stringify(clip) });
  if (!response.ok) {
    await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run();
    return jsonError(`Render service gagal (${response.status})`,502);
  }
  return Response.json({ ok: true, status: "rendering" }, { status: 202 });
}
