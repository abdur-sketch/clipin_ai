import { bindings, currentUser, jsonError } from "@/lib/server";

const kinds = { brief: "brief_url", source: "asset_url" } as const;

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const user = await currentUser(), { id, kind } = await params;
  if (!(kind in kinds)) return jsonError("Jenis asset tidak valid", 400);
  const campaign = await bindings.DB.prepare("SELECT id FROM campaigns WHERE id=? AND owner_user_id=?").bind(id, user.id).first();
  if (!campaign) return jsonError("Campaign tidak ditemukan", 404);
  const type = request.headers.get("content-type") || "application/octet-stream";
  const size = Number(request.headers.get("content-length") || 0);
  const limit = kind === "brief" ? 25 * 1024 * 1024 : 500 * 1024 * 1024;
  if (size > limit) return jsonError(kind === "brief" ? "Brief maksimum 25 MB" : "Source asset maksimum 500 MB", 413);
  if (!request.body) return jsonError("File kosong", 400);
  const key = `campaigns/${id}/${kind}`;
  await bindings.MEDIA.put(key, request.body, { httpMetadata: { contentType: type } });
  const url = `/api/campaigns/${id}/assets/${kind}`;
  const column = kinds[kind as keyof typeof kinds];
  const query = column === "brief_url" ? "UPDATE campaigns SET brief_url=?,updated_at=? WHERE id=?" : "UPDATE campaigns SET asset_url=?,updated_at=? WHERE id=?";
  await bindings.DB.prepare(query).bind(url, Date.now(), id).run();
  return Response.json({ ok: true, url });
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  await currentUser();
  const { id, kind } = await params;
  if (!(kind in kinds)) return jsonError("Jenis asset tidak valid", 400);
  const campaign = await bindings.DB.prepare("SELECT id FROM campaigns WHERE id=?").bind(id).first();
  if (!campaign) return jsonError("Campaign tidak ditemukan", 404);
  const object = await bindings.MEDIA.get(`campaigns/${id}/${kind}`);
  if (!object) return jsonError("Asset tidak ditemukan", 404);
  return new Response(object.body, { headers: {
    "content-type": object.httpMetadata?.contentType || "application/octet-stream",
    "content-disposition": `attachment; filename="kliyu-${kind}-${id}"`,
    "cache-control": "private, max-age=3600",
  } });
}
