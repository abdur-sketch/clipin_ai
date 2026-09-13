import { bindings, currentUser, jsonError } from "@/lib/server";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const owned = await bindings.DB.prepare("SELECT clips.id FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first();
  if (!owned) return jsonError("Clip tidak ditemukan",404);
  const contentType = request.headers.get("content-type") || "";
  if (!/^image\/(png|jpeg|webp)$/.test(contentType)) return jsonError("Logo harus berupa PNG, JPG, atau WebP",415);
  const size = Number(request.headers.get("content-length") || 0);
  if (size > 5 * 1024 * 1024) return jsonError("Ukuran logo maksimum 5 MB",413);
  if (!request.body) return jsonError("File logo kosong");
  const key = `logos/${user.id}/${id}`;
  await bindings.MEDIA.put(key,request.body,{httpMetadata:{contentType}});
  await bindings.DB.prepare("UPDATE clips SET logo_key=?,updated_at=? WHERE id=?").bind(key,Date.now(),id).run();
  return Response.json({ok:true,key});
}
