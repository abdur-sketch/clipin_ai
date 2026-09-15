import {
  bindings,
  currentUser,
  guardMutation,
  id,
  jsonError,
} from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const { results } = await bindings.DB.prepare(
    "SELECT p.*, (SELECT COUNT(*) FROM clips c WHERE c.project_id=p.id) clip_count FROM projects p WHERE user_id=? ORDER BY updated_at DESC LIMIT 50",
  )
    .bind(user.id)
    .all();
  return Response.json({ projects: results });
}

export async function POST(request: Request) {
  const guarded = guardMutation(request, "project-create");
  if (guarded) return guarded;
  const user = await currentUser();
  const body = (await request.json()) as {
    title?: string;
    filename?: string;
    contentType?: string;
    sourceUrl?: string;
  };
  if (!body.title?.trim()) return jsonError("Nama project wajib diisi");
  let sourceUrl: string | null = null,
    sourceType = "upload";
  if (body.sourceUrl) {
    try {
      const parsed = new URL(body.sourceUrl.trim());
      if (!/^https?:$/.test(parsed.protocol))
        return jsonError("Link video harus menggunakan http atau https");
      sourceUrl = parsed.toString();
      const host = parsed.hostname.toLowerCase();
      sourceType =
        host.includes("youtube.com") || host === "youtu.be"
          ? "youtube"
          : host.includes("tiktok.com")
            ? "tiktok"
            : host.includes("instagram.com")
              ? "instagram"
              : "url";
    } catch {
      return jsonError("Link video tidak valid");
    }
  }
  const projectId = id("prj"),
    now = Date.now();
  const defaults = await bindings.DB.prepare(
    "SELECT language FROM user_settings WHERE user_id=?",
  )
    .bind(user.id)
    .first<{ language?: string }>();
  const language = ["id", "en", "auto"].includes(String(defaults?.language))
    ? String(defaults?.language)
    : "id";
  await bindings.DB.prepare(
    "INSERT INTO projects (id,user_id,title,filename,content_type,source_url,source_type,language,status,progress,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,'draft',0,?,?)",
  )
    .bind(
      projectId,
      user.id,
      body.title.trim(),
      body.filename ?? null,
      body.contentType ?? null,
      sourceUrl,
      sourceType,
      language,
      now,
      now,
    )
    .run();
  return Response.json(
    {
      project: {
        id: projectId,
        title: body.title.trim(),
        sourceType,
        sourceUrl,
        status: "draft",
        progress: 0,
        createdAt: now,
      },
    },
    { status: 201 },
  );
}
