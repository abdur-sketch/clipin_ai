import type { KliyuMoment, TranscriptSegment } from "@/lib/kliyu-ai";

export type BrowserAnalysis = {
  transcript: string;
  segments: TranscriptSegment[];
  moments: KliyuMoment[];
  provider: "browser-whisper-webgpu" | "browser-whisper-wasm" | "source-captions";
};

export type AnalysisPreferences = {
  targetDuration?: 15 | 30 | 60;
  contentStyle?: "viral" | "education" | "sales" | "story";
};

type WhisperChunk = { text?: string; timestamp?: [number, number | null] };
type WhisperResult = { text?: string; chunks?: WhisperChunk[] };
type BrowserLanguageSession = {
  prompt: (input: string) => Promise<string>;
  destroy?: () => void;
};

function languageModelApi() {
  return (
    globalThis as typeof globalThis & {
      LanguageModel?: {
        create: (options?: Record<string, unknown>) => Promise<BrowserLanguageSession>;
      };
    }
  ).LanguageModel;
}

function cleanModelJson(value: string) {
  return value.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
}

async function browserPrompt(system: string, input: string) {
  const api = languageModelApi();
  if (!api) return null;
  const session = await api.create({
    initialPrompts: [{ role: "system", content: system }],
  });
  try {
    return await session.prompt(input);
  } finally {
    session.destroy?.();
  }
}

let transcriberPromise: Promise<
  (audio: Float32Array, options: Record<string, unknown>) => Promise<WhisperResult>
> | null = null;

function audioSamples(buffer: AudioBuffer) {
  if (buffer.sampleRate === 16000 && buffer.numberOfChannels === 1)
    return buffer.getChannelData(0).slice();
  const length = Math.ceil(buffer.duration * 16000);
  const output = new Float32Array(length);
  const ratio = buffer.sampleRate / 16000;
  for (let index = 0; index < length; index++) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(buffer.length - 1, left + 1);
    const mix = sourceIndex - left;
    let sample = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      sample += data[left] * (1 - mix) + data[right] * mix;
    }
    output[index] = sample / buffer.numberOfChannels;
  }
  return output;
}

async function browserTranscriber(
  onProgress?: (progress: number, message: string) => void,
) {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const transformersUrl =
        "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
      const { pipeline, env } = await import(
        /* @vite-ignore */ transformersUrl
      );
      env.allowLocalModels = false;
      const webgpu = "gpu" in navigator;
      const instance = await pipeline(
        "automatic-speech-recognition",
        "onnx-community/whisper-small",
        {
          device: webgpu ? "webgpu" : "wasm",
          dtype: webgpu ? "fp16" : "q8",
          progress_callback: (event: { progress?: number; status?: string }) => {
            if (Number.isFinite(event.progress))
              onProgress?.(
                28 + Math.round((Number(event.progress) / 100) * 22),
                "Menyiapkan Browser AI",
              );
          },
        },
      );
      return instance as unknown as (
        audio: Float32Array,
        options: Record<string, unknown>,
      ) => Promise<WhisperResult>;
    })();
  }
  return transcriberPromise;
}

export async function prepareBrowserAi(
  onProgress?: (progress: number, message: string) => void,
) {
  await browserTranscriber(onProgress);
  return browserAiReadiness();
}

function fallbackSegments(text: string, duration: number) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const totalChars = sentences.reduce((sum, value) => sum + value.length, 0) || 1;
  let cursor = 0;
  return sentences.map((sentence) => {
    const start = cursor;
    cursor += duration * (sentence.length / totalChars);
    return { start, end: cursor, text: sentence.trim() };
  });
}

export async function transcribeVideoInBrowser(
  file: File,
  onProgress?: (progress: number, message: string) => void,
): Promise<Omit<BrowserAnalysis, "moments">> {
  onProgress?.(24, "Membaca audio video");
  const context = new AudioContext();
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    const audio = audioSamples(decoded);
    const transcriber = await browserTranscriber(onProgress);
    onProgress?.(52, "Transkripsi berjalan di browser");
    const result = await transcriber(audio, {
      language: "indonesian",
      task: "transcribe",
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
    });
    const transcript = String(result.text || "").trim();
    if (!transcript) throw new Error("Browser AI tidak menghasilkan transkrip");
    const segments = (result.chunks || [])
      .map((chunk) => ({
        start: Number(chunk.timestamp?.[0] || 0),
        end: Number(chunk.timestamp?.[1] ?? chunk.timestamp?.[0] ?? 0),
        text: String(chunk.text || "").trim(),
      }))
      .filter((segment) => segment.text && segment.end > segment.start);
    return {
      transcript,
      segments: segments.length
        ? segments
        : fallbackSegments(transcript, decoded.duration),
      provider:
        "gpu" in navigator
          ? "browser-whisper-webgpu"
          : "browser-whisper-wasm",
    };
  } finally {
    await context.close();
  }
}

function scoreWindows(
  segments: TranscriptSegment[],
  preferences: AnalysisPreferences = {},
) {
  const targetDuration = preferences.targetDuration || 30;
  const contentStyle = preferences.contentStyle || "viral";
  const hookWords =
    /\b(?:kenapa|bagaimana|ternyata|rahasia|jangan|harus|penting|masalah|cara|tips|fakta|bayangkan|pertama|terakhir)\b/i;
  const emotionWords =
    /\b(?:gagal|berhasil|salah|benar|takut|senang|sulit|mudah|kaget|percaya|untung|rugi)\b/i;
  const styleWords: Record<string, RegExp> = {
    viral: /\b(?:rahasia|ternyata|jangan|kaget|gagal|berhasil)\b/i,
    education: /\b(?:cara|langkah|contoh|alasan|artinya|pelajaran|tips)\b/i,
    sales: /\b(?:pelanggan|produk|hasil|harga|manfaat|solusi|beli)\b/i,
    story: /\b(?:awalnya|kemudian|akhirnya|pernah|ketika|suatu|cerita)\b/i,
  };
  return segments
    .map((anchor, startIndex) => {
      let endIndex = startIndex;
      while (
        endIndex + 1 < segments.length &&
        segments[endIndex].end - anchor.start < targetDuration + 10
      ) {
        endIndex++;
        if (
          segments[endIndex].end - anchor.start >= Math.max(10, targetDuration - 8) &&
          /[.!?][”"']?$/.test(segments[endIndex].text.trim())
        )
          break;
      }
      const selected = segments.slice(startIndex, endIndex + 1);
      const text = selected
        .map((item) => item.text)
        .join(" ")
        .replace(/\[[^\]]+\]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const words = text.match(/[\p{L}\p{N}]+/gu) || [];
      const unique = words.length
        ? new Set(words.map((word) => word.toLowerCase())).size / words.length
        : 0;
      const duration = selected.at(-1)!.end - anchor.start;
      let score = 55 + Math.min(14, words.length / 5) + unique * 11;
      if (hookWords.test(text)) score += 9;
      if (emotionWords.test(text)) score += 7;
      if (styleWords[contentStyle].test(text)) score += 8;
      if (/\d/.test(text)) score += 3;
      if (/[?]/.test(text)) score += 4;
      if (Math.abs(duration - targetDuration) <= 8) score += 9;
      if (words.length < 24) score -= 18;
      return {
        start: anchor.start,
        end: selected.at(-1)!.end,
        text,
        score: Math.round(Math.min(98, Math.max(50, score))),
      };
    })
    .filter((item) => item.end - item.start >= 12 && item.text.length >= 70)
    .sort((a, b) => b.score - a.score)
    .reduce<Array<{ start: number; end: number; text: string; score: number }>>(
      (chosen, candidate) => {
        if (chosen.length >= 10) return chosen;
        const overlaps = chosen.some((item) => {
          const overlap = Math.max(
            0,
            Math.min(item.end, candidate.end) -
              Math.max(item.start, candidate.start),
          );
          return (
            overlap /
              Math.min(item.end - item.start, candidate.end - candidate.start) >
            0.45
          );
        });
        if (!overlaps) chosen.push(candidate);
        return chosen;
      },
    );
}

export async function detectMomentsInBrowser(
  transcript: string,
  segments: TranscriptSegment[],
  onProgress?: (progress: number, message: string) => void,
  preferences: AnalysisPreferences = {},
) {
  onProgress?.(78, "Browser AI memilih momen terbaik");
  const candidates = scoreWindows(segments, preferences);
  if (!candidates.length)
    throw new Error("Video belum memiliki cukup percakapan untuk dibuat klip");
  const languageModel = languageModelApi();
  let enhancements: Array<{ title?: string; hook?: string; category?: string }> = [];
  if (languageModel) {
    try {
      const session = await languageModel.create({
        initialPrompts: [
          {
            role: "system",
            content:
              "Anda editor video Indonesia. Balas hanya JSON valid tanpa markdown.",
          },
        ],
      });
      const output = await session.prompt(
        `Buat title, hook, dan category untuk setiap kandidat ini. Jangan mengarang ucapan. Format {"clips":[{"title":"...","hook":"...","category":"..."}]}. Kandidat: ${JSON.stringify(candidates.map((item) => item.text.slice(0, 700)))}`,
      );
      enhancements = (
        JSON.parse(cleanModelJson(output)) as {
          clips?: typeof enhancements;
        }
      ).clips || [];
      session.destroy?.();
    } catch {
      enhancements = [];
    }
  }
  return candidates.map((candidate, index) => {
    const sentence =
      candidate.text
        .split(/(?<=[.!?])\s+/)
        .find((value) => value.length >= 24) || candidate.text;
    const enhanced = enhancements[index];
    return {
      start: candidate.start,
      end: candidate.end,
      score: candidate.score,
      title: String(enhanced?.title || sentence).slice(0, 90),
      hook: String(enhanced?.hook || sentence).slice(0, 160),
      reason: `Dipilih Browser AI karena memiliki hook kuat, konteks utuh, durasi mendekati ${preferences.targetDuration || 30} detik, dan cocok untuk gaya ${preferences.contentStyle || "viral"}.`,
      category: String(enhanced?.category || preferences.contentStyle || "insight").slice(0, 40),
    } satisfies KliyuMoment;
  });
}

export async function generateSocialCaptionInBrowser(options: {
  title: string;
  hook: string;
  transcript: string;
}) {
  try {
    const output = await browserPrompt(
      "Anda copywriter konten Indonesia. Balas hanya JSON valid tanpa markdown.",
      `Buat caption sosial dari klip ini. Format {"hook":"...","caption":"...","cta":"...","hashtags":["#..."]}. Jangan mengarang fakta. Judul: ${options.title}\nHook: ${options.hook}\nTranskrip: ${options.transcript.slice(0, 5000)}`,
    );
    if (output) {
      const parsed = JSON.parse(cleanModelJson(output)) as {
        hook?: string;
        caption?: string;
        cta?: string;
        hashtags?: string[];
      };
      if (parsed.caption && parsed.cta && parsed.hashtags?.length)
        return {
          hook: String(parsed.hook || options.hook).slice(0, 180),
          caption: String(parsed.caption).slice(0, 1500),
          cta: String(parsed.cta).slice(0, 180),
          hashtags: parsed.hashtags.slice(0, 12).map((item) =>
            String(item).startsWith("#") ? String(item) : `#${String(item)}`,
          ),
        };
    }
  } catch {
    /* deterministic browser fallback below */
  }
  const keywords = `${options.title} ${options.hook}`
    .toLowerCase()
    .match(/[a-z0-9]{4,}/g)
    ?.filter((word, index, all) => all.indexOf(word) === index)
    .slice(0, 5) || ["video", "kreator"];
  const excerpt = options.transcript.trim().split(/(?<=[.!?])\s+/)[0] || options.hook;
  return {
    hook: options.hook.slice(0, 180),
    caption: `${options.hook}\n\n${excerpt}`.slice(0, 1500),
    cta: "Simpan video ini dan bagikan kepada teman yang membutuhkannya.",
    hashtags: ["#KLIYU", "#ShortVideo", ...keywords.map((word) => `#${word.replace(/[^a-z0-9_]/g, "")}`)].slice(0, 8),
  };
}

export async function translateRowsInBrowser(
  rows: Array<{ text: string }>,
  sourceLanguage: string,
  targetLanguage: string,
) {
  const translatorApi = (
    globalThis as typeof globalThis & {
      Translator?: {
        create: (options: { sourceLanguage: string; targetLanguage: string }) => Promise<{
          translate: (text: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    }
  ).Translator;
  if (translatorApi) {
    const translator = await translatorApi.create({ sourceLanguage, targetLanguage });
    try {
      const translated: string[] = [];
      for (const row of rows) translated.push(await translator.translate(row.text));
      return translated;
    } finally {
      translator.destroy?.();
    }
  }
  const output = await browserPrompt(
    "Anda penerjemah subtitle. Balas hanya JSON valid tanpa markdown dan pertahankan jumlah baris.",
    `Terjemahkan ke bahasa ${targetLanguage}. Format {"rows":["..."]}. Baris: ${JSON.stringify(rows.map((row) => row.text))}`,
  );
  if (!output)
    throw new Error("Terjemahan Browser AI membutuhkan Chrome/Edge terbaru dengan Built-in AI aktif.");
  const parsed = JSON.parse(cleanModelJson(output)) as { rows?: string[] };
  if (!parsed.rows || parsed.rows.length !== rows.length)
    throw new Error("Hasil terjemahan Browser AI tidak lengkap");
  return parsed.rows.map(String);
}

export function browserAiReadiness() {
  const gpu = typeof navigator !== "undefined" && "gpu" in navigator;
  const mediaRecorder = typeof window !== "undefined" && "MediaRecorder" in window;
  const translator = typeof globalThis !== "undefined" && "Translator" in globalThis;
  const languageModel = typeof globalThis !== "undefined" && "LanguageModel" in globalThis;
  return { gpu, mediaRecorder, translator, languageModel };
}

export async function analyzeVideoInBrowser(
  file: File,
  onProgress?: (progress: number, message: string) => void,
  preferences: AnalysisPreferences = {},
): Promise<BrowserAnalysis> {
  const transcription = await transcribeVideoInBrowser(file, onProgress);
  const moments = await detectMomentsInBrowser(
    transcription.transcript,
    transcription.segments,
    onProgress,
    preferences,
  );
  return { ...transcription, moments };
}
