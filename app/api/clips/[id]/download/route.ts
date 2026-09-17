import { bindings, currentUser, jsonError } from "@/lib/server";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const clip = await bindings.DB.prepare("SELECT clips.title,clips.rendered_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first<{title:string;rendered_key?:string}>();
  if (!clip) return jsonError("Clip tidak ditemukan",404);
  if (!clip.rendered_key) return jsonError("File video belum tersedia. Render clip terlebih dahulu.",404);
  const object = await bindings.MEDIA.get(clip.rendered_key);
  if (!object) return jsonError("File video tidak ditemukan di penyimpanan",404);
  const filename = clip.title.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || `kliyu-${id}`;
  const contentType=object.httpMetadata?.contentType || "video/mp4",extension=contentType.includes("webm")?"webm":"mp4";
  return new Response(object.body,{headers:{"content-type":contentType,"content-disposition":`attachment; filename="${filename}.${extension}"`,"cache-control":"private, max-age=3600"}});
}
