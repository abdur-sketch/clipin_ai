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
        required: [
          "start",
          "end",
          "score",
          "title",
          "hook",
          "reason",
          "category",
        ],
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
    hashtags: {
      type: "array",
      minItems: 3,
      maxItems: 12,
      items: { type: "string", pattern: "^#[A-Za-z0-9_]+$" },
    },
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
  return value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
}

async function structuredJson<T>(
  options: AiOptions & {
    instructions: string;
    input: string;
    schema: object;
    schemaName: string;
  },
): Promise<T> {
  if (options.provider === "ollama") {
    const baseUrl = (options.baseUrl || "http://127.0.0.1:11434").replace(
      /\/$/,
      "",
    );
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
    if (!response.ok)
      throw new Error(
        `Ollama gagal (${response.status}). Pastikan Ollama aktif dan model sudah diunduh.`,
      );
    const data = (await response.json()) as { response?: string };
    if (!data.response) throw new Error("Ollama tidak mengembalikan hasil");
    return JSON.parse(cleanJson(data.response)) as T;
  }

  if (!options.apiKey) throw new Error("OPENAI_API_KEY belum dikonfigurasi");
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${options.apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || "gpt-4o-mini",
      store: false,
      safety_identifier: options.safetyIdentifier,
      instructions: options.instructions,
      input: options.input,
      text: {
        format: {
          type: "json_schema",
          name: options.schemaName,
          strict: true,
          schema: options.schema,
        },
      },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI gagal (${response.status})`);
  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
  };
  const outputText =
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .find((item) => item.type === "output_text")?.text;
  if (!outputText) throw new Error("OpenAI tidak mengembalikan hasil");
  return JSON.parse(cleanJson(outputText)) as T;
}

function stabilizeLocalMoments(
  clips: KliyuMoment[],
  segments: TranscriptSegment[],
  duration: number,
) {
  if (!segments.length || duration < 8) return clips;
  const cleanSpeech = (text: string) =>
    text
      .replace(/\[[^\]]+\]/g, " ")
      .replace(/\b(?:eee+|eh+|em+|anu)\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
  const hooks =
    /\b(?:kenapa|bagaimana|ternyata|rahasia|jangan|harus|penting|masalah|cara|tips|fakta|bayangkan|pertama|terakhir)\b/i;
  const emotion =
    /\b(?:gagal|berhasil|salah|benar|takut|senang|sulit|mudah|luar biasa|kaget|percaya|untung|rugi)\b/i;
  const targetCount = Math.min(10, Math.max(1, Math.floor(duration / 15)));
  const candidates = segments
    .map((anchor) => {
      const startIndex = segments.indexOf(anchor);
      let endIndex = startIndex;
      while (
        endIndex + 1 < segments.length &&
        segments[endIndex].end - anchor.start < 32
      ) {
        endIndex++;
        const span = segments[endIndex].end - anchor.start;
        if (span >= 16 && /[.!?][”"']?$/.test(segments[endIndex].text.trim()))
          break;
      }
      const selected = segments.slice(startIndex, endIndex + 1);
      const text = cleanSpeech(selected.map((item) => item.text).join(" "));
      const words = text.toLowerCase().match(/[a-zà-ÿ0-9]+/gi) || [];
      const uniqueRatio = words.length ? new Set(words).size / words.length : 0;
      const length = selected.at(-1)!.end - anchor.start;
      const complete = /[.!?][”"']?$/.test(text);
      let score = 58 + Math.min(12, words.length / 5) + uniqueRatio * 10;
      if (hooks.test(text)) score += 8;
      if (emotion.test(text)) score += 6;
      if (complete) score += 5;
      if (length >= 15 && length <= 40) score += 7;
      if (words.length < 20 || uniqueRatio < 0.38) score -= 18;
      return {
        start: anchor.start,
        end: selected.at(-1)!.end,
        text,
        score: Math.round(Math.min(98, Math.max(45, score))),
      };
    })
    .filter((item) => item.end - item.start >= 10 && item.text.length >= 45)
    .sort((a, b) => b.score - a.score);

  const selected = candidates.reduce<typeof candidates>((result, candidate) => {
    if (result.length >= targetCount) return result;
    const overlaps = result.some(
      (item) =>
        Math.max(
          0,
          Math.min(item.end, candidate.end) -
            Math.max(item.start, candidate.start),
        ) /
          Math.min(item.end - item.start, candidate.end - candidate.start) >
        0.45,
    );
    if (!overlaps) result.push(candidate);
    return result;
  }, []);
  if (!selected.length) return clips;
  return selected
    .map((candidate) => {
      const suggested = clips.find(
        (clip) =>
          clip.start >= candidate.start - 3 && clip.start <= candidate.end,
      );
      const sentence =
        candidate.text
          .split(/(?<=[.!?])\s+/)
          .find((item) => item.length >= 20) || candidate.text;
      return {
        start: candidate.start,
        end: candidate.end,
        score: candidate.score,
        title: (suggested?.title || sentence).slice(0, 90),
        hook: (suggested?.hook || sentence).slice(0, 160),
        reason: `Hook ${hooks.test(candidate.text) ? "kuat" : "jelas"}, konteks utuh, dan batas kalimat rapi.`,
        category: suggested?.category || "insight",
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function detectMoments(
  options: AiOptions & { transcript: string; segments: TranscriptSegment[] },
): Promise<KliyuMoment[]> {
  const duration = options.segments.reduce(
    (max, segment) => Math.max(max, segment.end),
    0,
  );
  const timedTranscript = options.segments.length
    ? options.segments
        .map(
          (segment) =>
            `[${segment.start.toFixed(1)}-${segment.end.toFixed(1)}] ${segment.text}`,
        )
        .join("\n")
    : options.transcript;
  const parsed = await structuredJson<{ clips?: KliyuMoment[] }>({
    ...options,
    instructions:
      "Anda adalah KLIYU AI, editor short-form berbahasa Indonesia. Pilih 6-10 momen berbeda yang benar-benar dapat berdiri sendiri. Nilai Hook Strength, Clarity, Emotion, Standalone Value, Shareability, dan Curiosity. Gunakan timestamp yang hanya ada dalam transkrip. Durasi ideal 15-60 detik. Jangan mengarang ucapan yang tidak ada di transkrip.",
    input: `Analisis transkrip bertimestamp berikut dan temukan momen short-form terbaik:\n\n${timedTranscript.slice(0, 110000)}`,
    schema: momentSchema,
    schemaName: "kliyu_moments",
  });
  const rawClips = (parsed.clips || [])
    .map((clip) => ({
      ...clip,
      start: Math.max(0, clip.start),
      end: duration ? Math.min(duration, clip.end) : clip.end,
      score: Math.round(Math.min(100, Math.max(0, clip.score))),
      title: clip.title.trim(),
      hook: clip.hook.trim(),
      reason: clip.reason.trim(),
      category: clip.category.trim().toLowerCase(),
    }))
    .filter(
      (clip) =>
        Number.isFinite(clip.start) &&
        Number.isFinite(clip.end) &&
        clip.end > clip.start &&
        clip.end - clip.start <= 90 &&
        clip.title &&
        clip.hook,
    );
  const clips = (
    options.provider === "ollama"
      ? stabilizeLocalMoments(rawClips, options.segments, duration)
      : rawClips
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  if (!clips.length)
    throw new Error("Tidak ada momen valid yang ditemukan oleh KLIYU AI");
  return clips;
}

export type SocialCaption = {
  hook: string;
  caption: string;
  cta: string;
  hashtags: string[];
};

export async function generateSocialCaption(
  options: AiOptions & {
    title: string;
    hook: string;
    category: string;
    transcript: string;
  },
): Promise<SocialCaption> {
  const result = await structuredJson<SocialCaption>({
    ...options,
    instructions:
      "Anda adalah copywriter short-form Indonesia. Buat copy yang akurat terhadap isi video, ringkas, natural, tidak clickbait menyesatkan, dan tidak mengarang fakta.",
    input: `Judul: ${options.title}\nHook clip: ${options.hook}\nKategori: ${options.category}\nPotongan transkrip sumber:\n${options.transcript.slice(0, 12000)}`,
    schema: socialCaptionSchema,
    schemaName: "kliyu_social_caption",
  });
  const hashtags = [
    ...new Set(
      (result.hashtags || [])
        .map((tag) => tag.trim())
        .filter((tag) => /^#[A-Za-z0-9_]+$/.test(tag)),
    ),
  ].slice(0, 12);
  if (
    !result.hook?.trim() ||
    !result.caption?.trim() ||
    !result.cta?.trim() ||
    hashtags.length < 3
  )
    throw new Error("AI lokal mengembalikan caption yang tidak lengkap");
  return {
    hook: result.hook.trim(),
    caption: result.caption.trim(),
    cta: result.cta.trim(),
    hashtags,
  };
}
