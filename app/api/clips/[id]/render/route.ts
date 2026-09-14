import { bindings, currentUser, jsonError } from "@/lib/server";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser(), { id } = await params;
  const clip = await bindings.DB.prepare("SELECT clips.*,projects.storage_key FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?").bind(id,user.id).first();
  if (!clip) return jsonError("Clip tidak ditemukan",404);
  if (!bindings.LOCAL_RENDER_BASE_URL && !bindings.RENDER_SERVICE_URL) return jsonError("Export MP4 belum dikonfigurasi. Aktifkan layanan render lokal atau tambahkan RENDER_SERVICE_URL.",503);
  await bindings.DB.prepare("UPDATE clips SET status='rendering',updated_at=? WHERE id=?").bind(Date.now(),id).run();
  let response: Response;
  if (bindings.LOCAL_RENDER_BASE_URL) {
    const source = clip.storage_key ? await bindings.MEDIA.get(String(clip.storage_key)) : null;
    if (!source) { await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run(); return jsonError("Video sumber tidak ditemukan",404); }
    response = await fetch(`${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/render`, {
      method: "POST",
      headers: {
        "content-type": source.httpMetadata?.contentType || "application/octet-stream",
        "x-kliyu-start": String(clip.start_time),
        "x-kliyu-end": String(clip.end_time),
        "x-kliyu-aspect-ratio": String(clip.aspect_ratio || "9:16"),
      },
      body: await source.arrayBuffer(),
    });
  } else {
    response = await fetch(`${bindings.RENDER_SERVICE_URL}/render`, { method: "POST", headers: { "content-type": "application/json", ...(bindings.RENDER_SERVICE_TOKEN ? { authorization: `Bearer ${bindings.RENDER_SERVICE_TOKEN}` } : {}) }, body: JSON.stringify(clip) });
  }
  if (!response.ok) {
    await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run();
    return jsonError(`Render service gagal (${response.status})`,502);
  }
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("video/")) {
    if (!response.body) { await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run(); return jsonError("Layanan render tidak mengembalikan video",502); }
    const key = `exports/${user.id}/${id}.mp4`;
    await bindings.MEDIA.put(key,response.body,{httpMetadata:{contentType}});
    await bindings.DB.prepare("UPDATE clips SET status='rendered',rendered_key=?,updated_at=? WHERE id=?").bind(key,Date.now(),id).run();
    await bindings.DB.prepare("INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)").bind(`note_${crypto.randomUUID()}`,user.id,"export","Export MP4 selesai",`${String(clip.title)} siap diunduh.`,Date.now()).run();
    return Response.json({ok:true,status:"rendered",downloadUrl:`/api/clips/${id}/download`});
  }
  const result = await response.json() as { downloadUrl?: string };
  if (!result.downloadUrl) { await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run(); return jsonError("Layanan render tidak mengembalikan file MP4",502); }
  const rendered = await fetch(result.downloadUrl);
  if (!rendered.ok || !rendered.body) { await bindings.DB.prepare("UPDATE clips SET status='ready',updated_at=? WHERE id=?").bind(Date.now(),id).run(); return jsonError("File hasil render tidak dapat diambil",502); }
  const key = `exports/${user.id}/${id}.mp4`;
  await bindings.MEDIA.put(key,rendered.body,{httpMetadata:{contentType:rendered.headers.get("content-type") || "video/mp4"}});
  await bindings.DB.prepare("UPDATE clips SET status='rendered',rendered_key=?,updated_at=? WHERE id=?").bind(key,Date.now(),id).run();
  await bindings.DB.prepare("INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)").bind(`note_${crypto.randomUUID()}`,user.id,"export","Export MP4 selesai",`${String(clip.title)} siap diunduh.`,Date.now()).run();
  return Response.json({ok:true,status:"rendered",downloadUrl:`/api/clips/${id}/download`});
}
