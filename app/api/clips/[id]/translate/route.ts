import { translateSubtitleText } from "@/lib/kliyu-ai";
import {
  aiProvider,
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
  const guarded = guardMutation(request, "subtitle-translate");
  if (guarded) return guarded;
  const user = await currentUser();
  const { id } = await params;
  const body = (await request.json()) as { language?: string };
  const languages: Record<string, string> = {
    en: "English",
    ms: "Bahasa Melayu",
    es: "Spanish",
    ja: "Japanese",
  };
  const language = languages[String(body.language || "")];
  if (!language) return jsonError("Bahasa terjemahan tidak didukung");
  const clip = await bindings.DB.prepare(
    "SELECT clips.subtitles FROM clips JOIN projects ON projects.id=clips.project_id WHERE clips.id=? AND projects.user_id=?",
  )
    .bind(id, user.id)
    .first<{ subtitles?: string }>();
  if (!clip) return jsonError("Clip tidak ditemukan", 404);
  const subtitles = JSON.parse(clip.subtitles || "[]") as Array<
    Record<string, unknown>
  >;
  if (!subtitles.length) return jsonError("Subtitle belum tersedia");
  const provider = aiProvider();
  try {
    const texts = await translateSubtitleText({
      provider,
      apiKey: bindings.OPENAI_API_KEY,
      model: bindings.OPENAI_MODEL,
      safetyIdentifier: user.id,
      language,
      rows: subtitles.map((row, index) => ({
        id: index,
        text: String(row.text || ""),
      })),
    });
    const translated = subtitles.map((row, index) => ({
      ...row,
      text: texts[index] || String(row.text || ""),
      words: undefined,
    }));
    await bindings.DB.prepare(
      "UPDATE clips SET subtitles=?,status='ready',rendered_key=NULL,updated_at=? WHERE id=?",
    )
      .bind(JSON.stringify(translated), Date.now(), id)
      .run();
    await syncD1Record("clips", id);
    return Response.json({ ok: true, subtitles: translated, language });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Terjemahan gagal",
      502,
    );
  }
}
