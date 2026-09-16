import { detectMoments, type TranscriptSegment } from "@/lib/kliyu-ai";
import {
  aiProvider,
  bindings,
  currentUser,
  guardMutation,
  id,
  jsonError,
  localAiHeaders,
} from "@/lib/server";
import {
  firebaseDelete,
  firebaseList,
  firebasePatch,
  firebaseSet,
} from "@/lib/firebase";

type ProjectSource = {
  storage_key?: string;
  source_url?: string;
  title: string;
  content_type?: string;
  language?: string;
  status?: string;
};
type TranscriptionWord = { start?: number; end?: number; word?: string };
type TranscriptionResponse = {
  text?: string;
  segments?: Array<{
    start?: number;
    end?: number;
    text?: string;
    words?: TranscriptionWord[];
  }>;
  words?: TranscriptionWord[];
};

function inferredWords(text: string, start: number, end: number) {
  const words = text.match(/\S+/g) || [];
  const weights = words.map((word) =>
    Math.max(1, word.replace(/[^\p{L}\p{N}]/gu, "").length),
  );
  const total = weights.reduce((sum, value) => sum + value, 0) || 1;
  let cursor = start;
  return words.map((word, index) => {
    const duration = (end - start) * (weights[index] / total);
    const item = { start: cursor, end: Math.min(end, cursor + duration), word };
    cursor = item.end;
    return item;
  });
}

async function transcribe(
  file: File,
  language?: string,
): Promise<TranscriptionResponse> {
  const provider = aiProvider();
  const form = new FormData();
  form.append("file", file);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("timestamp_granularities[]", "word");
  if (language === "id" || language === "en") form.append("language", language);

  if (provider === "ollama") {
    const baseUrl = (
      bindings.WHISPER_BASE_URL || "http://127.0.0.1:8080"
    ).replace(/\/$/, "");
    const response = await fetch(`${baseUrl}/inference`, {
      method: "POST",
      headers: localAiHeaders(),
      body: form,
    });
    if (!response.ok)
      throw new Error(
        `Whisper lokal gagal (${response.status}). Pastikan whisper-server aktif.`,
      );
    return (await response.json()) as TranscriptionResponse;
  }

  if (!bindings.OPENAI_API_KEY)
    throw new Error("OPENAI_API_KEY belum dikonfigurasi");
  form.append("model", "whisper-1");
  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { authorization: `Bearer ${bindings.OPENAI_API_KEY}` },
      body: form,
    },
  );
  if (!response.ok)
    throw new Error(`Transkripsi OpenAI gagal (${response.status})`);
  return (await response.json()) as TranscriptionResponse;
}

async function ensureStoredSource(projectId: string, project: ProjectSource) {
  if (project.storage_key) return project.storage_key;
  if (!project.source_url) return null;
  let source = await fetch(project.source_url, {
    redirect: "follow",
    headers: { "user-agent": "KLIYU/1.0 video importer" },
  });
  let contentType = source.headers.get("content-type") || "";
  if (
    (!source.ok || !source.body || !contentType.startsWith("video/")) &&
    bindings.LOCAL_RENDER_BASE_URL
  ) {
    source = await fetch(
      `${bindings.LOCAL_RENDER_BASE_URL.replace(/\/$/, "")}/import`,
      {
        method: "POST",
        headers: localAiHeaders({ "content-type": "application/json" }),
        body: JSON.stringify({ url: project.source_url }),
      },
    );
    contentType = source.headers.get("content-type") || "";
  }
  if (!source.ok || !source.body)
    throw new Error(`Video dari link tidak dapat diambil (${source.status})`);
  if (!contentType.startsWith("video/"))
    throw new Error(
      "Link tersebut tidak menghasilkan file video. Pastikan link publik dan Anda memiliki izin menggunakannya.",
    );
  const key = `imports/${projectId}/source`;
  await bindings.MEDIA.put(key, source.body, { httpMetadata: { contentType } });
  await bindings.DB.prepare(
    "UPDATE projects SET storage_key=?,content_type=?,status='processing',progress=15,updated_at=? WHERE id=?",
  )
    .bind(key, contentType, Date.now(), projectId)
    .run();
  await firebasePatch("projects", projectId, {
    storage_key: key,
    content_type: contentType,
    status: "processing",
    progress: 15,
    updated_at: Date.now(),
  });
  return key;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guarded = guardMutation(request, "process");
  if (guarded) return guarded;
  const user = await currentUser(),
    { id: projectId } = await params;
  const project = await bindings.DB.prepare(
    "SELECT storage_key,source_url,title,content_type,language,status FROM projects WHERE id=? AND user_id=?",
  )
    .bind(projectId, user.id)
    .first<ProjectSource>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  if (project.status === "complete")
    return jsonError("Project ini sudah selesai diproses", 409);
  const provider = aiProvider();
  if (provider === "openai" && !bindings.OPENAI_API_KEY)
    return jsonError(
      "KLIYU AI belum dikonfigurasi. Tambahkan OPENAI_API_KEY atau aktifkan AI_PROVIDER=ollama.",
      503,
    );
  const quota = await bindings.DB.prepare(
    "SELECT minutes_used,minutes_limit FROM subscriptions WHERE user_id=?",
  )
    .bind(user.id)
    .first<{ minutes_used: number; minutes_limit: number }>();
  if (quota && quota.minutes_used >= quota.minutes_limit)
    return jsonError(
      "Kuota menit bulan ini sudah habis. Upgrade paket untuk memproses video baru.",
      402,
    );
  await bindings.DB.prepare(
    "UPDATE projects SET status='processing',progress=20,error=NULL,updated_at=? WHERE id=?",
  )
    .bind(Date.now(), projectId)
    .run();
  await firebasePatch("projects", projectId, {
    status: "processing",
    progress: 20,
    error: null,
    updated_at: Date.now(),
  });
  try {
    const storageKey = await ensureStoredSource(projectId, project);
    if (!storageKey) throw new Error("Video sumber belum tersedia");
    const object = await bindings.MEDIA.get(storageKey);
    if (!object) throw new Error("Video sumber tidak ditemukan di penyimpanan");
    const maxSourceSize =
      provider === "ollama" ? 512 * 1024 * 1024 : 25 * 1024 * 1024;
    if (object.size > maxSourceSize)
      throw new Error(
        provider === "ollama"
          ? "Video melebihi batas pemrosesan lokal 512 MB. Kompres video terlebih dahulu."
          : "OpenAI Whisper mendukung file hingga 25 MB. Kompres video atau gunakan AI lokal.",
      );
    await bindings.DB.prepare(
      "UPDATE projects SET progress=40,updated_at=? WHERE id=?",
    )
      .bind(Date.now(), projectId)
      .run();
    await firebasePatch("projects", projectId, {
      progress: 40,
      updated_at: Date.now(),
    });
    const file = new File(
      [await object.arrayBuffer()],
      project.title.replace(/[^a-z0-9]+/gi, "-") + ".mp4",
      {
        type:
          object.httpMetadata?.contentType ||
          project.content_type ||
          "video/mp4",
      },
    );
    const transcriptData = await transcribe(file, project.language);
    const transcript = transcriptData.text?.trim();
    if (!transcript) throw new Error("Transkripsi kosong");
    const globalWords = transcriptData.words || [];
    const segments: TranscriptSegment[] = (transcriptData.segments || [])
      .map((segment) => {
        const start = Number(segment.start || 0),
          end = Number(segment.end || 0),
          text = String(segment.text || "").trim();
        const sourceWords = segment.words?.length
          ? segment.words
          : globalWords.filter(
              (word) =>
                Number(word.end || 0) > start && Number(word.start || 0) < end,
            );
        const words = sourceWords
          .map((word) => ({
            start: Number(word.start || 0),
            end: Number(word.end || 0),
            word: String(word.word || "").trim(),
          }))
          .filter((word) => word.word && word.end > word.start);
        return {
          start,
          end,
          text,
          words: words.length ? words : inferredWords(text, start, end),
        };
      })
      .filter((segment) => segment.text && segment.end > segment.start);
    const duration = segments.reduce(
      (max, segment) => Math.max(max, segment.end),
      0,
    );
    const usedMinutes = Math.max(1, Math.ceil(duration / 60));
    await bindings.DB.prepare(
      "UPDATE projects SET progress=68,updated_at=? WHERE id=?",
    )
      .bind(Date.now(), projectId)
      .run();
    await firebasePatch("projects", projectId, {
      progress: 68,
      updated_at: Date.now(),
    });
    const performance = await bindings.DB.prepare(
      "SELECT clips.category,COUNT(*) posts,CAST(AVG(publications.views) AS INTEGER) avg_views,CAST(AVG(publications.likes+publications.shares*2) AS INTEGER) avg_engagement FROM publications JOIN clips ON clips.id=publications.clip_id WHERE publications.user_id=? AND publications.status='published' GROUP BY clips.category ORDER BY avg_views DESC LIMIT 5",
    )
      .bind(user.id)
      .all<Record<string, unknown>>();
    const performanceHint = performance.results.length
      ? performance.results
          .map(
            (row) =>
              `${String(row.category || "umum")}: ${Number(row.posts || 0)} post, rata-rata ${Number(row.avg_views || 0)} views, engagement ${Number(row.avg_engagement || 0)}`,
          )
          .join("; ")
      : undefined;
    const moments = await detectMoments({
      provider,
      apiKey: bindings.OPENAI_API_KEY,
      model:
        provider === "ollama" ? bindings.OLLAMA_MODEL : bindings.OPENAI_MODEL,
      baseUrl: bindings.OLLAMA_BASE_URL,
      authToken: bindings.LOCAL_AI_TOKEN,
      transcript,
      segments,
      performanceHint,
      safetyIdentifier: user.id,
    });
    const now = Date.now();
    const userDefaults = await bindings.DB.prepare(
      "SELECT subtitle_style FROM user_settings WHERE user_id=?",
    )
      .bind(user.id)
      .first<{ subtitle_style?: string }>();
    const subtitleStyle = ["clean", "bold", "karaoke"].includes(
      String(userDefaults?.subtitle_style),
    )
      ? String(userDefaults?.subtitle_style)
      : "bold";
    const statements = [
      bindings.DB.prepare("DELETE FROM clips WHERE project_id=?").bind(
        projectId,
      ),
      bindings.DB.prepare(
        "INSERT OR REPLACE INTO transcripts (project_id,text,segments,provider,created_at) VALUES (?,?,?,?,?)",
      ).bind(
        projectId,
        transcript,
        JSON.stringify(segments),
        provider === "ollama" ? "whisper.cpp-local" : "openai-whisper",
        now,
      ),
    ];
    const firebaseClips: Array<{ id: string; data: Record<string, unknown> }> = [];
    for (const moment of moments) {
      const clipId = id("clip");
      const clipData = {
        project_id: projectId,
        start_time: moment.start,
        end_time: moment.end,
        score: moment.score,
        title: moment.title,
        hook: moment.hook,
        caption: `${moment.hook} ${moment.reason}`,
        subtitles: JSON.stringify(
          segments.filter(
            (segment) =>
              segment.end >= moment.start && segment.start <= moment.end,
          ),
        ),
        reason: moment.reason,
        category: moment.category,
        style: subtitleStyle,
        face_tracking: 1,
        hook_overlay: 1,
        status: "ready",
        created_at: now,
        updated_at: now,
      };
      firebaseClips.push({ id: clipId, data: clipData });
      statements.push(
        bindings.DB.prepare(
          "INSERT INTO clips (id,project_id,start_time,end_time,score,title,hook,caption,subtitles,reason,category,style,face_tracking,hook_overlay,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,1,'ready',?,?)",
        ).bind(
          clipId,
          projectId,
          moment.start,
          moment.end,
          moment.score,
          moment.title,
          moment.hook,
          `${moment.hook} ${moment.reason}`,
          JSON.stringify(
            segments.filter(
              (segment) =>
                segment.end >= moment.start && segment.start <= moment.end,
            ),
          ),
          moment.reason,
          moment.category,
          subtitleStyle,
          now,
          now,
        ),
      );
    }
    statements.push(
      bindings.DB.prepare(
        "UPDATE projects SET status='complete',progress=100,duration=?,updated_at=? WHERE id=?",
      ).bind(duration, now, projectId),
    );
    statements.push(
      bindings.DB.prepare(
        "INSERT INTO subscriptions (user_id,minutes_used,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET minutes_used=minutes_used+excluded.minutes_used,updated_at=excluded.updated_at",
      ).bind(user.id, usedMinutes, now),
    );
    statements.push(
      bindings.DB.prepare(
        "INSERT INTO notifications (id,user_id,type,title,message,read,created_at) VALUES (?,?,?,?,?,0,?)",
      ).bind(
        id("note"),
        user.id,
        "processing",
        "Analisis selesai",
        `${moments.length} momen terbaik ditemukan dari ${project.title}.`,
        now,
      ),
    );
    await bindings.DB.batch(statements);
    const oldFirebaseClips =
      (await firebaseList<Record<string, unknown>>("clips", {
        field: "project_id",
        equals: projectId,
        limit: 100,
      })) || [];
    await Promise.all(
      oldFirebaseClips.map((clip) => firebaseDelete("clips", String(clip.id))),
    );
    await Promise.all([
      firebaseSet("transcripts", projectId, {
        project_id: projectId,
        text: transcript,
        segments: JSON.stringify(segments),
        provider: provider === "ollama" ? "whisper.cpp-local" : "openai-whisper",
        created_at: now,
      }),
      firebasePatch("projects", projectId, {
        status: "complete",
        progress: 100,
        duration,
        clip_count: moments.length,
        error: null,
        updated_at: now,
      }),
      ...firebaseClips.map((clip) => firebaseSet("clips", clip.id, clip.data)),
    ]);
    return Response.json({ ok: true, provider, clips: moments.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Processing gagal";
    await bindings.DB.prepare(
      "UPDATE projects SET status='failed',error=?,updated_at=? WHERE id=?",
    )
      .bind(message, Date.now(), projectId)
      .run();
    await firebasePatch("projects", projectId, {
      status: "failed",
      error: message,
      updated_at: Date.now(),
    });
    return jsonError(message, 500);
  }
}
