import {
  bindings,
  currentUser,
  guardMutation,
  jsonError,
  syncD1Record,
} from "@/lib/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "browser-subtitle-translate");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id } = await params;
  const body = (await request.json()) as {
    language?: string;
    translations?: string[];
  };
  const language = ["en", "ms", "es", "ja"].includes(String(body.language))
    ? String(body.language)
    : "";
  if (!language) return jsonError("Bahasa terjemahan tidak didukung");
  const clip = await bindings.DB.prepare(
    "SELECT clips.subtitles FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<{ subtitles?: string }>();
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  const subtitles = JSON.parse(clip.subtitles || "[]") as Array<Record<string, unknown>>;
  const translations = (body.translations || []).map((item) =>
    String(item).trim().slice(0, 500),
  );
  if (!subtitles.length || translations.length !== subtitles.length || translations.some((item) => !item))
    return jsonError("Hasil terjemahan Browser AI tidak lengkap");
  const translated = subtitles.map((row, index) => ({
    ...row,
    text: translations[index],
    words: undefined,
  }));
  await bindings.DB.prepare(
    "UPDATE clips SET subtitles=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?",
  )
    .bind(JSON.stringify(translated), Date.now(), id)
    .run();
  await syncD1Record("clips", id);
  return Response.json({ ok: true, subtitles: translated, language });
}
