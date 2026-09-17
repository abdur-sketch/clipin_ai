import type { KliyuMoment, TranscriptSegment } from "@/lib/kliyu-ai";

export type BrowserAnalysis = {
  transcript: string;
  segments: TranscriptSegment[];
  moments: KliyuMoment[];
  provider: "browser-whisper-webgpu" | "browser-whisper-wasm" | "source-captions";
};

type WhisperChunk = { text?: string; timestamp?: [number, number | null] };
type WhisperResult = { text?: string; chunks?: WhisperChunk[] };

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

function scoreWindows(segments: TranscriptSegment[]) {
  const hookWords =
    /\b(?:kenapa|bagaimana|ternyata|rahasia|jangan|harus|penting|masalah|cara|tips|fakta|bayangkan|pertama|terakhir)\b/i;
  const emotionWords =
    /\b(?:gagal|berhasil|salah|benar|takut|senang|sulit|mudah|kaget|percaya|untung|rugi)\b/i;
  return segments
    .map((anchor, startIndex) => {
      let endIndex = startIndex;
      while (
        endIndex + 1 < segments.length &&
        segments[endIndex].end - anchor.start < 42
      ) {
        endIndex++;
        if (
          segments[endIndex].end - anchor.start >= 18 &&
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
      if (/\d/.test(text)) score += 3;
      if (/[?]/.test(text)) score += 4;
      if (duration >= 18 && duration <= 45) score += 7;
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
) {
  onProgress?.(78, "Browser AI memilih momen terbaik");
  const candidates = scoreWindows(segments);
  if (!candidates.length)
    throw new Error("Video belum memiliki cukup percakapan untuk dibuat klip");
  const languageModel = (
    globalThis as typeof globalThis & {
      LanguageModel?: {
        create: (options?: Record<string, unknown>) => Promise<{
          prompt: (input: string) => Promise<string>;
          destroy?: () => void;
        }>;
      };
    }
  ).LanguageModel;
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
        JSON.parse(output.replace(/^```(?:json)?\s*|\s*```$/g, "")) as {
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
      reason: "Dipilih langsung di browser berdasarkan hook, konteks utuh, emosi, dan potensi dibagikan.",
      category: String(enhanced?.category || "insight").slice(0, 40),
    } satisfies KliyuMoment;
  });
}

export async function analyzeVideoInBrowser(
  file: File,
  onProgress?: (progress: number, message: string) => void,
): Promise<BrowserAnalysis> {
  const transcription = await transcribeVideoInBrowser(file, onProgress);
  const moments = await detectMomentsInBrowser(
    transcription.transcript,
    transcription.segments,
    onProgress,
  );
  return { ...transcription, moments };
}
