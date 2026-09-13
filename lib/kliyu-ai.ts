export type TranscriptSegment = { start: number; end: number; text: string };
export type KliyuMoment = {
  start: number;
  end: number;
  score: number;
  title: string;
  hook: string;
  reason: string;
  category: string;
};

const momentSchema = {
  type: "object",
  additionalProperties: false,
  required: ["clips"],
  properties: {
    clips: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["start", "end", "score", "title", "hook", "reason", "category"],
        properties: {
          start: { type: "number", minimum: 0 },
          end: { type: "number", minimum: 1 },
          score: { type: "integer", minimum: 0, maximum: 100 },
          title: { type: "string", minLength: 3, maxLength: 90 },
          hook: { type: "string", minLength: 3, maxLength: 160 },
          reason: { type: "string", minLength: 3, maxLength: 240 },
          category: { type: "string", minLength: 2, maxLength: 40 },
        },
      },
    },
  },
} as const;

export async function detectMoments(options: { apiKey: string; transcript: string; segments: TranscriptSegment[]; model?: string; safetyIdentifier?: string }): Promise<KliyuMoment[]> {
  const duration = options.segments.reduce((max, segment) => Math.max(max, segment.end), 0);
  const timedTranscript = options.segments.length
    ? options.segments.map((segment) => `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`).join("\n")
    : options.transcript;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${options.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      store: false,
      safety_identifier: options.safetyIdentifier,
      instructions: "Anda adalah KLIYU AI, editor short-form berbahasa Indonesia. Pilih 6-10 momen berbeda yang benar-benar dapat berdiri sendiri. Nilai Hook Strength, Clarity, Emotion, Standalone Value, Shareability, dan Curiosity. Gunakan timestamp yang hanya ada dalam transkrip. Durasi ideal 15-60 detik. Jangan mengarang ucapan yang tidak ada di transkrip.",
      input: `Analisis transkrip bertimestamp berikut dan temukan momen short-form terbaik:\n\n${timedTranscript.slice(0, 110000)}`,
      text: { format: { type: "json_schema", name: "kliyu_moments", strict: true, schema: momentSchema } },
    }),
  });
  if (!response.ok) throw new Error(`Analisis AI gagal (${response.status})`);
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("KLIYU AI tidak mengembalikan hasil analisis");
  const parsed = JSON.parse(outputText) as { clips?: KliyuMoment[] };
  const clips = (parsed.clips || []).map((clip) => ({ ...clip, start: Math.max(0, clip.start), end: duration ? Math.min(duration, clip.end) : clip.end, score: Math.round(Math.min(100, Math.max(0, clip.score))), title: clip.title.trim(), hook: clip.hook.trim(), reason: clip.reason.trim(), category: clip.category.trim().toLowerCase() })).filter((clip) => Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start && clip.end - clip.start <= 90 && clip.title && clip.hook).sort((a, b) => b.score - a.score).slice(0, 10);
  if (!clips.length) throw new Error("Tidak ada momen valid yang ditemukan oleh KLIYU AI");
  return clips;
}
