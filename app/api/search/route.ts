import { bindings, currentUser } from "@/lib/server";

export async function GET(request: Request) {
  const user = await currentUser();
  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 120) || "";
  if (query.length < 2) return Response.json({ results: [] });
  const pattern = `%${query.replace(/[%_]/g, " ")}%`;
  const { results } = await bindings.DB.prepare(
    `SELECT projects.id AS project_id,projects.title AS project_title,clips.id AS clip_id,
      clips.title AS title,clips.hook AS hook,clips.score AS score,'clip' AS kind
     FROM clips JOIN projects ON projects.id=clips.project_id
     WHERE projects.user_id=? AND (clips.title LIKE ? OR clips.hook LIKE ? OR clips.caption LIKE ?)
     UNION ALL
     SELECT projects.id,projects.title,NULL,projects.title,substr(transcripts.text,1,220),0,'transcript'
     FROM transcripts JOIN projects ON projects.id=transcripts.project_id
     WHERE projects.user_id=? AND transcripts.text LIKE ? LIMIT 30`,
  ).bind(user.id, pattern, pattern, pattern, user.id, pattern).all();
  return Response.json({ results });
}
