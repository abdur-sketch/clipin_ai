import { bindings, currentUser, jsonError } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const { results } = await bindings.DB.prepare("SELECT id,type,title,message,read,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 30").bind(user.id).all();
  return Response.json({ notifications: results });
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  const body = await request.json() as { id?: string; all?: boolean };
  if (body.all) await bindings.DB.prepare("UPDATE notifications SET read=1 WHERE user_id=?").bind(user.id).run();
  else if (body.id) await bindings.DB.prepare("UPDATE notifications SET read=1 WHERE id=? AND user_id=?").bind(body.id,user.id).run();
  else return jsonError("Pilih notifikasi yang akan ditandai");
  return Response.json({ ok: true });
}
