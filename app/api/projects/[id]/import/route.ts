import { firebasePatch } from "@/lib/firebase";
import { bindings, currentUser, guardMutation, jsonError } from "@/lib/server";
import { assertPublicHttpsUrl, importableVideoUrl } from "@/lib/source-import";

const maximumBytes = 2 * 1024 * 1024 * 1024;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "project-import");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const project = await bindings.DB.prepare(
    "SELECT source_url,storage_key FROM projects WHERE id=? AND user_id=?",
  )
    .bind(id, user.id)
    .first<{ source_url?: string; storage_key?: string }>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  if (project.storage_key) return Response.json({ ok: true, imported: false });
  if (!project.source_url) return jsonError("Project tidak memiliki link sumber");

  try {
    const source = importableVideoUrl(project.source_url);
    let current=source.url,response:Response|null=null;
    for(let redirect=0;redirect<5;redirect++){
      response=await fetch(current,{redirect:"manual",signal:AbortSignal.timeout(30_000),headers:{"user-agent":"KLIYU/1.0 authorized media importer"}});
      if(![301,302,303,307,308].includes(response.status))break;
      const location=response.headers.get("location");if(!location)throw new Error("Redirect sumber video tidak valid");
      current=assertPublicHttpsUrl(new URL(location,current));response=null;
    }
    if(!response)throw new Error("Terlalu banyak redirect pada link video");
    if (!response.ok || !response.body)
      return jsonError(`Video cloud tidak dapat diambil (${response.status})`, 422);
    const length = Number(response.headers.get("content-length") || 0);
    if (length > maximumBytes)
      return jsonError("Ukuran video melebihi batas 2 GB", 413);
    const contentType = response.headers.get("content-type") || "video/mp4";
    if (
      !contentType.startsWith("video/") &&
      contentType !== "application/octet-stream"
    )
      return jsonError(
        "Link cloud tidak mengarah ke file video. Aktifkan akses ‘siapa saja yang memiliki link’.",
        422,
      );
    const key = `users/${user.id}/projects/${id}/source`;
    await bindings.MEDIA.put(key, response.body, {
      httpMetadata: {
        contentType:
          contentType === "application/octet-stream" ? "video/mp4" : contentType,
      },
    });
    const now = Date.now();
    await bindings.DB.prepare(
      "UPDATE projects SET storage_key=?,content_type=?,source_type=?,status='uploaded',progress=18,error=NULL,updated_at=? WHERE id=?",
    )
      .bind(
        key,
        contentType === "application/octet-stream" ? "video/mp4" : contentType,
        source.provider,
        now,
        id,
      )
      .run();
    await firebasePatch("projects", id, {
      storage_key: key,
      content_type:
        contentType === "application/octet-stream" ? "video/mp4" : contentType,
      source_type: source.provider,
      status: "uploaded",
      progress: 18,
      error: null,
      updated_at: now,
    });
    return Response.json({ ok: true, imported: true, provider: source.provider });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Import video cloud gagal",
      422,
    );
  }
}
