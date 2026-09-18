import { bindings, currentUser, guardMutation } from "@/lib/server";

async function snapshot(userId: string) {
  const [projects, clips, transcripts, settings, studio, publications, revenue] = await Promise.all([
    bindings.DB.prepare("SELECT * FROM projects WHERE user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT clips.* FROM clips JOIN projects ON projects.id=clips.project_id WHERE projects.user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT transcripts.* FROM transcripts JOIN projects ON projects.id=transcripts.project_id WHERE projects.user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT * FROM user_settings WHERE user_id=?").bind(userId).first(),
    bindings.DB.prepare("SELECT * FROM studio_preferences WHERE user_id=?").bind(userId).first(),
    bindings.DB.prepare("SELECT * FROM publications WHERE user_id=?").bind(userId).all(),
    bindings.DB.prepare("SELECT * FROM revenue_entries WHERE user_id=?").bind(userId).all(),
  ]);
  return { version: 1, createdAt: new Date().toISOString(), projects: projects.results, clips: clips.results, transcripts: transcripts.results, settings, studio, publications: publications.results, revenue: revenue.results };
}

export async function GET(request: Request) {
  const user = await currentUser();
  const url = new URL(request.url);
  if (url.searchParams.get("download") === "1") {
    const data = await snapshot(user.id);
    return new Response(JSON.stringify(data, null, 2), { headers: { "content-type": "application/json", "content-disposition": `attachment; filename="kliyu-backup-${new Date().toISOString().slice(0,10)}.json"` } });
  }
  const { results } = await bindings.DB.prepare("SELECT id,created_at,length(snapshot) AS bytes FROM workspace_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 10").bind(user.id).all();
  return Response.json({ backups: results });
}

export async function POST(request: Request) {
  const guarded = guardMutation(request, "workspace-backup"); if (guarded) return guarded;
  const user = await currentUser(); const now = Date.now(); const id = crypto.randomUUID();
  const data = await snapshot(user.id);
  await bindings.DB.batch([
    bindings.DB.prepare("INSERT INTO workspace_backups (id,user_id,snapshot,created_at) VALUES (?,?,?,?)").bind(id,user.id,JSON.stringify(data),now),
    bindings.DB.prepare("INSERT INTO activity_logs (id,user_id,type,title,message,status,metadata,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user.id,"backup","Backup workspace dibuat","Project, klip, transkrip, dan pengaturan diamankan.","success","{}",now),
  ]);
  await bindings.DB.prepare("DELETE FROM workspace_backups WHERE user_id=? AND id NOT IN (SELECT id FROM workspace_backups WHERE user_id=? ORDER BY created_at DESC LIMIT 10)").bind(user.id,user.id).run();
  return Response.json({ ok: true, id, createdAt: now });
}
