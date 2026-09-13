import { bindings, currentUser, id, jsonError } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const { results } = await bindings.DB.prepare("SELECT p.*, (SELECT COUNT(*) FROM clips c WHERE c.project_id=p.id) clip_count FROM projects p WHERE user_id=? ORDER BY updated_at DESC LIMIT 50").bind(user.id).all();
  return Response.json({ projects: results });
}

export async function POST(request: Request) {
  const user = await currentUser(); const body = await request.json() as { title?: string; filename?: string; contentType?: string; sourceUrl?: string };
  if (!body.title?.trim()) return jsonError("Nama project wajib diisi");
  const projectId = id("prj"), now = Date.now();
  await bindings.DB.prepare("INSERT INTO projects (id,user_id,title,filename,content_type,source_url,source_type,status,progress,created_at,updated_at) VALUES (?,?,?,?,?,?,?,'draft',0,?,?)").bind(projectId,user.id,body.title.trim(),body.filename ?? null,body.contentType ?? null,body.sourceUrl ?? null,body.sourceUrl ? "youtube" : "upload",now,now).run();
  return Response.json({ project: { id: projectId, title: body.title.trim(), status: "draft", progress: 0, createdAt: now } }, { status: 201 });
}
