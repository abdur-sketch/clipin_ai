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

const socialCaptionSchema = {
  type: "object",
  additionalProperties: false,
  required: ["hook", "caption", "cta", "hashtags"],
  properties: {
    hook: { type: "string", minLength: 3, maxLength: 180 },
    caption: { type: "string", minLength: 10, maxLength: 1500 },
    cta: { type: "string", minLength: 3, maxLength: 180 },
    hashtags: { type: "array", minItems: 3, maxItems: 12, items: { type: "string", pattern: "^#[A-Za-z0-9_]+$" } },
  },
} as const;

type AiOptions = {
  provider?: "openai" | "ollama";
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  safetyIdentifier?: string;
};

function cleanJson(value: string) {
  return value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
}

async function structuredJson<T>(options: AiOptions & { instructions: string; input: string; schema: object; schemaName: string }): Promise<T> {
  if (options.provider === "ollama") {
    const baseUrl = (options.baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: options.model || "qwen2.5:1.5b",
        system: options.instructions,
        prompt: `${options.input}\n\nKembalikan hanya JSON valid sesuai schema berikut:\n${JSON.stringify(options.schema)}`,
        format: options.schema,
        stream: false,
        options: { temperature: 0 },
      }),
    });
    if (!response.ok) throw new Error(`Ollama gagal (${response.status}). Pastikan Ollama aktif dan model sudah diunduh.`);
    const data = await response.json() as { response?: string };
    if (!data.response) throw new Error("Ollama tidak mengembalikan hasil");
    return JSON.parse(cleanJson(data.response)) as T;
  }

  if (!options.apiKey) throw new Error("OPENAI_API_KEY belum dikonfigurasi");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { authorization: `Bearer ${options.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      store: false,
      safety_identifier: options.safetyIdentifier,
      instructions: options.instructions,
      input: options.input,
      text: { format: { type: "json_schema", name: options.schemaName, strict: true, schema: options.schema } },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI gagal (${response.status})`);
  const data = await response.json() as { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  const outputText = data.output_text || data.output?.flatMap((item) => item.content || []).find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI tidak mengembalikan hasil");
  return JSON.parse(cleanJson(outputText)) as T;
}

function stabilizeLocalMoments(clips: KliyuMoment[], segments: TranscriptSegment[], duration: number) {
  const weakOutput = clips.length < 3 || clips.every((clip) => clip.score <= 10) || clips.filter((clip) => clip.end - clip.start >= 12).length < Math.ceil(clips.length / 2);
  if (!weakOutput || !segments.length || duration < 12) return clips;

  const targetCount = Math.min(8, Math.max(1, Math.floor(duration / 12)));
  const windowLength = Math.min(35, Math.max(15, duration / Math.max(2, targetCount - 1)));
  const maxStart = Math.max(0, duration - windowLength);
  const starts = Array.from({ length: targetCount }, (_, index) => targetCount === 1 ? 0 : maxStart * index / (targetCount - 1));

  return starts.map((approximateStart, index) => {
    const first = segments.reduce((best, segment) => Math.abs(segment.start - approximateStart) < Math.abs(best.start - approximateStart) ? segment : best, segments[0]);
    const start = Math.max(0, first.start);
    const wantedEnd = Math.min(duration, start + windowLength);
    const last = segments.filter((segment) => segment.end <= wantedEnd + 3 && segment.end > start + 10).at(-1);
    const end = Math.min(duration, Math.max(start + Math.min(12, duration - start), last?.end || wantedEnd));
    const text = segments.filter((segment) => segment.end >= start && segment.start <= end).map((segment) => segment.text).join(" ").trim();
    const suggested = clips.find((clip) => clip.start >= start - 2 && clip.start <= end) || clips[index % Math.max(1, clips.length)];
    const shortText = text.split(/(?<=[.!?])\s+/)[0]?.trim() || text.slice(0, 90);
    return {
      start,
      end,
      score: Math.max(65, 92 - index * 4),
      title: (shortText || suggested?.title || `Momen terbaik ${index + 1}`).slice(0, 90),
      hook: (suggested?.hook || shortText || "Simak bagian penting ini.").slice(0, 160),
      reason: suggested?.reason || "Potongan ini memiliki konteks utuh, pesan jelas, dan dapat berdiri sendiri.",
      category: (suggested?.category || "insight").toLowerCase(),
    };
  });
}

export async function detectMoments(options: AiOptions & { transcript: string; segments: TranscriptSegment[] }): Promise<KliyuMoment[]> {
  const duration = options.segments.reduce((max, segment) => Math.max(max, segment.end), 0);
  const timedTranscript = options.segments.length
    ? options.segments.map((segment) => `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`).join("\n")
    : options.transcript;
  const parsed = await structuredJson<{ clips?: KliyuMoment[] }>({
    ...options,
    instructions: "Anda adalah KLIYU AI, editor short-form berbahasa Indonesia. Pilih 6-10 momen berbeda yang benar-benar dapat berdiri sendiri. Nilai Hook Strength, Clarity, Emotion, Standalone Value, Shareability, dan Curiosity. Gunakan timestamp yang hanya ada dalam transkrip. Durasi ideal 15-60 detik. Jangan mengarang ucapan yang tidak ada di transkrip.",
    input: `Analisis transkrip bertimestamp berikut dan temukan momen short-form terbaik:\n\n${timedTranscript.slice(0, 110000)}`,
    schema: momentSchema,
    schemaName: "kliyu_moments",
  });
  const rawClips = (parsed.clips || []).map((clip) => ({ ...clip, start: Math.max(0, clip.start), end: duration ? Math.min(duration, clip.end) : clip.end, score: Math.round(Math.min(100, Math.max(0, clip.score))), title: clip.title.trim(), hook: clip.hook.trim(), reason: clip.reason.trim(), category: clip.category.trim().toLowerCase() })).filter((clip) => Number.isFinite(clip.start) && Number.isFinite(clip.end) && clip.end > clip.start && clip.end - clip.start <= 90 && clip.title && clip.hook);
  const clips = (options.provider === "ollama" ? stabilizeLocalMoments(rawClips, options.segments, duration) : rawClips).sort((a, b) => b.score - a.score).slice(0, 10);
  if (!clips.length) throw new Error("Tidak ada momen valid yang ditemukan oleh KLIYU AI");
  return clips;
}

export type SocialCaption = { hook: string; caption: string; cta: string; hashtags: string[] };

export async function generateSocialCaption(options: AiOptions & { title: string; hook: string; category: string; transcript: string }): Promise<SocialCaption> {
  const result = await structuredJson<SocialCaption>({
    ...options,
    instructions: "Anda adalah copywriter short-form Indonesia. Buat copy yang akurat terhadap isi video, ringkas, natural, tidak clickbait menyesatkan, dan tidak mengarang fakta.",
    input: `Judul: ${options.title}\nHook clip: ${options.hook}\nKategori: ${options.category}\nPotongan transkrip sumber:\n${options.transcript.slice(0, 12000)}`,
    schema: socialCaptionSchema,
    schemaName: "kliyu_social_caption",
  });
  const hashtags = [...new Set((result.hashtags || []).map((tag) => tag.trim()).filter((tag) => /^#[A-Za-z0-9_]+$/.test(tag)))].slice(0, 12);
  if (!result.hook?.trim() || !result.caption?.trim() || !result.cta?.trim() || hashtags.length < 3) throw new Error("AI lokal mengembalikan caption yang tidak lengkap");
  return { hook: result.hook.trim(), caption: result.caption.trim(), cta: result.cta.trim(), hashtags };
}
