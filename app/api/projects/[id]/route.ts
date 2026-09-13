import { bindings, currentUser, jsonError } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const project = await bindings.DB.prepare("SELECT * FROM projects WHERE id=? AND user_id=?").bind(id,user.id).first();
  if (!project) return jsonError("Project tidak ditemukan",404);
  const { results: clips } = await bindings.DB.prepare("SELECT * FROM clips WHERE project_id=? ORDER BY score DESC").bind(id).all();
  const transcript = await bindings.DB.prepare("SELECT * FROM transcripts WHERE project_id=?").bind(id).first();
  return Response.json({ project, clips, transcript });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params; const body = await request.json() as { title?: string };
  if (!body.title?.trim()) return jsonError("Judul wajib diisi");
  const result = await bindings.DB.prepare("UPDATE projects SET title=?,updated_at=? WHERE id=? AND user_id=?").bind(body.title.trim(),Date.now(),id,user.id).run();
  return result.meta.changes ? Response.json({ ok:true }) : jsonError("Project tidak ditemukan",404);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const project = await bindings.DB.prepare("SELECT storage_key,rendered_key FROM projects LEFT JOIN clips ON clips.project_id=projects.id WHERE projects.id=? AND user_id=?").bind(id,user.id).first<{storage_key?:string;rendered_key?:string}>();
  if (!project) return jsonError("Project tidak ditemukan",404);
  const clipFiles = await bindings.DB.prepare("SELECT rendered_key FROM clips WHERE project_id=? AND rendered_key IS NOT NULL").bind(id).all<{rendered_key:string}>();
  await bindings.DB.batch([bindings.DB.prepare("DELETE FROM clips WHERE project_id=?").bind(id),bindings.DB.prepare("DELETE FROM transcripts WHERE project_id=?").bind(id),bindings.DB.prepare("DELETE FROM projects WHERE id=? AND user_id=?").bind(id,user.id)]);
  const keys=[project.storage_key,...clipFiles.results.map(x=>x.rendered_key)].filter(Boolean) as string[]; if(keys.length) await bindings.MEDIA.delete(keys);
  return Response.json({ ok:true });
}
