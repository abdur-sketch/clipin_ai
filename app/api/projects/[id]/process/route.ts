import type { KliyuMoment, TranscriptSegment } from "@/lib/kliyu-ai";
import {
  bindings,
  currentUser,
  guardMutation,
  id,
  jsonError,
} from "@/lib/server";
import {
  firebaseDelete,
  firebaseList,
  firebasePatch,
  firebaseSet,
} from "@/lib/firebase";
import { assertPublicHttpsUrl, importableVideoUrl } from "@/lib/source-import";

type ProjectSource = {
  storage_key?: string;
  source_url?: string;
  title: string;
  content_type?: string;
  language?: string;
  status?: string;
};
type BrowserAnalysis = {
  transcript?: string;
  segments?: TranscriptSegment[];
  moments?: KliyuMoment[];
  provider?: string;
};

async function ensureStoredSource(projectId: string, project: ProjectSource) {
  if (project.storage_key) return project.storage_key;
  if (!project.source_url) return null;
  let current = importableVideoUrl(project.source_url).url;
  let source: Response | null = null;
  for (let redirect = 0; redirect < 5; redirect++) {
    source = await fetch(current, {
      redirect: "manual",
      signal: AbortSignal.timeout(30_000),
      headers: { "user-agent": "KLIYU/1.0 video importer" },
    });
    if (![301, 302, 303, 307, 308].includes(source.status)) break;
    const location = source.headers.get("location");
    if (!location) throw new Error("Redirect sumber video tidak valid");
    current = assertPublicHttpsUrl(new URL(location, current));
    source = null;
  }
  if (!source) throw new Error("Terlalu banyak redirect pada link video");
  const contentType = source.headers.get("content-type") || "";
  const contentLength = Number(source.headers.get("content-length") || 0);
  if (!source.ok || !source.body)
    throw new Error(`Video dari link tidak dapat diambil (${source.status})`);
  if (contentLength > 4 * 1024 * 1024 * 1024)
    throw new Error("Ukuran video melebihi batas 4 GB");
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
  const body = (await request.json().catch(() => ({}))) as {
    browserAnalysis?: BrowserAnalysis;
  };
  const analysis = body.browserAnalysis;
  const user = await currentUser(),
    { id: projectId } = await params;
  const project = await bindings.DB.prepare(
    "SELECT storage_key,source_url,title,content_type,language,status FROM projects WHERE id=? AND user_id=?",
  )
    .bind(projectId, user.id)
    .first<ProjectSource>();
  if (!project) return jsonError("Project tidak ditemukan", 404);
  const existingClips = await bindings.DB.prepare(
    "SELECT COUNT(*) AS count FROM clips WHERE project_id=?",
  )
    .bind(projectId)
    .first<{ count: number }>();
  if (project.status === "complete" && Number(existingClips?.count || 0) > 0)
    return jsonError("Project ini sudah selesai diproses", 409);
  if (!analysis)
    return jsonError(
      "Analisis Browser AI belum dikirim. Buka project dari browser dan pilih Proses ulang.",
      400,
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
    if (!project.storage_key && project.source_url) {
      const parsed = new URL(project.source_url);
      const directVideo = /\.(?:mp4|webm|mov)(?:$|\?)/i.test(parsed.pathname);
      if (directVideo) await ensureStoredSource(projectId, project);
    }
    await bindings.DB.prepare(
      "UPDATE projects SET progress=40,updated_at=? WHERE id=?",
    )
      .bind(Date.now(), projectId)
      .run();
    await firebasePatch("projects", projectId, {
      progress: 40,
      updated_at: Date.now(),
    });
    const transcript = String(analysis.transcript || "").trim().slice(0, 500000);
    const segments = (analysis.segments || [])
      .slice(0, 20000)
      .map((segment) => ({
        start: Number(segment.start),
        end: Number(segment.end),
        text: String(segment.text || "").trim().slice(0, 2000),
        words: Array.isArray(segment.words) ? segment.words.slice(0, 500) : undefined,
      }))
      .filter(
        (segment) =>
          Number.isFinite(segment.start) &&
          Number.isFinite(segment.end) &&
          segment.start >= 0 &&
          segment.end <= 24 * 60 * 60 &&
          segment.end > segment.start &&
          segment.text,
      )
      .sort((a, b) => a.start - b.start);
    const sourceDuration = segments.reduce(
      (max, segment) => Math.max(max, segment.end),
      0,
    );
    const moments = (analysis.moments || [])
      .slice(0, 10)
      .map((moment) => ({
        start: Number(moment.start),
        end: Number(moment.end),
        score: Math.round(Math.min(100, Math.max(0, Number(moment.score)))),
        title: String(moment.title || "").trim().slice(0, 90),
        hook: String(moment.hook || "").trim().slice(0, 160),
        reason: String(moment.reason || "").trim().slice(0, 240),
        category: String(moment.category || "insight").trim().slice(0, 40),
      }))
      .filter(
        (moment) =>
          Number.isFinite(moment.start) &&
          Number.isFinite(moment.end) &&
          moment.start >= 0 &&
          moment.end > moment.start &&
          moment.end <= sourceDuration + 1 &&
          moment.end - moment.start <= 90 &&
          moment.title &&
          moment.hook,
      )
      .sort((a, b) => b.score - a.score);
    if (!transcript || !segments.length || !moments.length)
      throw new Error("Hasil Browser AI tidak lengkap");
    const duration = sourceDuration;
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
        String(analysis.provider || "browser-ai").slice(0, 80),
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
        provider: String(analysis.provider || "browser-ai").slice(0, 80),
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
    return Response.json({ ok: true, provider: "browser", clips: moments.length });
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
