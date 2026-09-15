import { bindings, currentUser, jsonError } from "@/lib/server";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const clip = await bindings.DB.prepare("SELECT clips.rendered_key,projects.storage_key,projects.content_type FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?")
    .bind(id,user.id).first<{rendered_key?:string;storage_key?:string;content_type?:string}>();
  if (!clip) return jsonError("Clip tidak ditemukan",404);
  const key = clip.rendered_key || clip.storage_key;
  if (!key) return jsonError("Video clip belum tersedia",404);
  const metadata = await bindings.MEDIA.head(key);
  if (!metadata) return jsonError("File video tidak ditemukan di penyimpanan",404);

  const commonHeaders = {
    "accept-ranges": "bytes",
    "cache-control": "private, max-age=3600",
    "content-type": metadata.httpMetadata?.contentType || clip.content_type || "video/mp4",
    "content-disposition": `inline; filename="kliyu-preview-${id}.mp4"`,
  };
  const range = request.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (!range) {
    const object = await bindings.MEDIA.get(key);
    if (!object) return jsonError("File video tidak ditemukan di penyimpanan",404);
    return new Response(object.body,{headers:{...commonHeaders,"content-length":String(metadata.size)}});
  }

  const requestedStart = range[1] ? Number(range[1]) : undefined;
  const requestedEnd = range[2] ? Number(range[2]) : undefined;
  const start = requestedStart ?? Math.max(0,metadata.size-(requestedEnd || 1));
  const end = Math.min(metadata.size-1,requestedStart === undefined ? metadata.size-1 : (requestedEnd ?? metadata.size-1));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= metadata.size) {
    return new Response(null,{status:416,headers:{...commonHeaders,"content-range":`bytes */${metadata.size}`}});
  }
  const length = end-start+1;
  const object = await bindings.MEDIA.get(key,{range:{offset:start,length}});
  if (!object) return jsonError("File video tidak ditemukan di penyimpanan",404);
  return new Response(object.body,{status:206,headers:{...commonHeaders,"content-length":String(length),"content-range":`bytes ${start}-${end}/${metadata.size}`}});
}
