import { bindings, currentUser } from "@/lib/server";

export async function GET() {
  const user = await currentUser();
  const { results } = await bindings.DB.prepare(
    "SELECT id,type,title,message,status,metadata,created_at FROM activity_logs WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
  ).bind(user.id).all();
  return Response.json({ activities: results });
}
